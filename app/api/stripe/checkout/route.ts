import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe, PRICE_IDS, PACK_PRICE_IDS, type PlanId, type BillingInterval } from '@/lib/stripe'

/**
 * Length of the new-user free trial, in days. Kept in sync with the value
 * surfaced on the onboarding TrialOffer screen — change one, change the other.
 */
const TRIAL_DAYS = 3

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'You must be signed in to subscribe.' }, { status: 401 })
    }

    const { planId, interval, packId, trial, from } = (await req.json()) as {
      planId: PlanId
      interval: BillingInterval
      packId?: string | null
      /** When true, attach a free trial (no charge for TRIAL_DAYS, card required). */
      trial?: boolean
      /** Free-form attribution, e.g. 'onboarding' or 'pricing'. Saved to metadata. */
      from?: string
    }

    const priceId = PRICE_IDS[planId]?.[interval]
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or billing interval.' }, { status: 400 })
    }

    // TODO(upgrades): This route unconditionally creates a *new* subscription,
    // which is wrong for users who already have an active sub and are trying
    // to upgrade to a different tier from /pricing. Should detect existing
    // sub and either route through Stripe Billing Portal or call
    // stripe.subscriptions.update with proration. See app/pricing/page.tsx
    // for the matching TODO. — punted on 2026-06-13.

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    // Build line items — subscription + optional one-time credit pack.
    // Note: credit packs are NOT allowed alongside a trial, since the pack is a
    // one-time charge that would defeat the "$0 today" promise.
    const lineItems: { price: string; quantity: number }[] = [
      { price: priceId, quantity: 1 },
    ]
    if (!trial && packId && PACK_PRICE_IDS[packId]) {
      lineItems.push({ price: PACK_PRICE_IDS[packId], quantity: 1 })
    }

    const isTrial = trial === true

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      customer_email: session.user.email,
      metadata: {
        userEmail: session.user.email,
        planId,
        interval,
        trial: isTrial ? 'true' : 'false',
        from: from ?? '',
      },
      subscription_data: {
        ...(isTrial ? { trial_period_days: TRIAL_DAYS } : {}),
        metadata: {
          userEmail: session.user.email,
          planId,
          interval,
          trial: isTrial ? 'true' : 'false',
          from: from ?? '',
        },
      },
      // Require card upfront even during the trial — that's the whole point of
      // this funnel. (This is the default for `mode: 'subscription'` but we set
      // it explicitly so a future Stripe default change doesn't silently break.)
      payment_method_collection: 'always',
      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isTrial
        ? `${baseUrl}/onboarding?canceled=1`
        : `${baseUrl}/pricing`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 })
  }
}
