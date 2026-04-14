import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe, PRICE_IDS, PACK_PRICE_IDS, type PlanId, type BillingInterval } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'You must be signed in to subscribe.' }, { status: 401 })
    }

    const { planId, interval, packId } = (await req.json()) as {
      planId: PlanId
      interval: BillingInterval
      packId?: string | null
    }

    const priceId = PRICE_IDS[planId]?.[interval]
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or billing interval.' }, { status: 400 })
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    // Build line items — subscription + optional one-time credit pack
    const lineItems: { price: string; quantity: number }[] = [
      { price: priceId, quantity: 1 },
    ]
    if (packId && PACK_PRICE_IDS[packId]) {
      lineItems.push({ price: PACK_PRICE_IDS[packId], quantity: 1 })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      customer_email: session.user.email,
      metadata: {
        userEmail: session.user.email,
        planId,
        interval,
      },
      subscription_data: {
        metadata: {
          userEmail: session.user.email,
          planId,
          interval,
        },
      },
      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 })
  }
}
