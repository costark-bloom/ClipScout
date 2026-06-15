import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { grantSubscriptionCredits } from '@/lib/credits'
import type Stripe from 'stripe'

// Service-role client for writes to the `users` table (RLS-protected).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/**
 * Closes the onboarding gate once Stripe confirms trial/payment. Idempotent.
 * Also fires from /api/stripe/verify-session — whichever runs first wins.
 */
async function markOnboardingComplete(email: string) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('email', email.toLowerCase())
    .is('onboarding_completed_at', null)
  if (error) console.error('[webhook] markOnboardingComplete:', error)
}

export const config = { api: { bodyParser: false } }

async function upsertSubscription(
  userEmail: string,
  planId: string,
  interval: string,
  status: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  currentPeriodEnd: number | null,
  trialStart: number | null,
  trialEnd: number | null,
) {
  await supabase.from('user_settings').upsert(
    {
      user_email: userEmail,
      subscription_plan: planId,
      subscription_interval: interval,
      subscription_status: status,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      subscription_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      trial_started_at: trialStart ? new Date(trialStart * 1000).toISOString() : null,
      trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_email' },
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[webhook] event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userEmail = session.metadata?.userEmail
        const planId = session.metadata?.planId
        const interval = session.metadata?.interval

        if (!userEmail || !planId || !interval) break

        // Fetch full subscription to get period end + trial window.
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = sub as any

        await upsertSubscription(
          userEmail,
          planId,
          interval,
          sub.status, // 'trialing' when trial active, 'active' for paid signups
          session.customer as string,
          sub.id,
          subAny.current_period_end ?? null,
          subAny.trial_start ?? null,
          subAny.trial_end ?? null,
        )

        // Grant credits immediately, whether they're in a trial or paid up front.
        // We want trial users to actually USE the product during their 3 days —
        // gating credits behind the first invoice defeats the funnel.
        await grantSubscriptionCredits(userEmail, planId)

        // Stripe has confirmed the user — close the onboarding gate so the
        // modal stops re-prompting them.
        await markOnboardingComplete(userEmail)

        console.log(
          `[webhook] ${sub.status === 'trialing' ? 'trial started' : 'subscription activated'} ` +
            `for ${userEmail} (${planId}/${interval})`,
        )
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userEmail = sub.metadata?.userEmail
        const planId = sub.metadata?.planId
        const interval = sub.metadata?.interval
        if (!userEmail) break

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = sub as any
        await upsertSubscription(
          userEmail,
          planId ?? '',
          interval ?? '',
          sub.status,
          sub.customer as string,
          sub.id,
          subAny.current_period_end ?? null,
          subAny.trial_start ?? null,
          subAny.trial_end ?? null,
        )
        console.log(`[webhook] subscription updated for ${userEmail}: ${sub.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userEmail = sub.metadata?.userEmail
        if (!userEmail) break

        await supabase
          .from('user_settings')
          .update({
            subscription_plan: null,
            subscription_status: 'cancelled',
            subscription_period_end: null,
            trial_started_at: null,
            trial_ends_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_email', userEmail)
        console.log(`[webhook] subscription cancelled for ${userEmail}`)
        break
      }

      // Stripe fires this 3 days before trial end, OR immediately upon
      // subscription creation for trials shorter than 3 days. Since our trial
      // is exactly 3 days, it fires right away — so this is effectively a
      // "welcome to your trial" hook, not a 24-hour reminder.
      //
      // For a true "1 day before trial ends" reminder we need a scheduled job
      // that queries trial_ends_at daily — see Phase 2.5.
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription
        const userEmail = sub.metadata?.userEmail
        if (!userEmail) break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const trialEnd = (sub as any).trial_end
        console.log(
          `[webhook] trial_will_end for ${userEmail} — trial ends ${
            trialEnd ? new Date(trialEnd * 1000).toISOString() : 'unknown'
          }`,
        )
        // TODO(phase-2.5): send "your trial has started" Resend email here.
        break
      }

      // Fires when Stripe successfully charges the card — both for the initial
      // post-trial conversion and for every monthly renewal. We use this to
      // refill the user's credit allocation; without it, paying users would
      // run out of credits mid-cycle and never get topped up.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceAny = invoice as any
        const subscriptionId = invoiceAny.subscription as string | null
        if (!subscriptionId) break

        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const userEmail = sub.metadata?.userEmail
        const planId = sub.metadata?.planId
        const interval = sub.metadata?.interval
        if (!userEmail || !planId) break

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = sub as any

        // Keep subscription row in sync with the new period_end first, then
        // refill credits. Order matters in case a downstream read of the row
        // happens between calls.
        await upsertSubscription(
          userEmail,
          planId,
          interval ?? '',
          sub.status,
          sub.customer as string,
          sub.id,
          subAny.current_period_end ?? null,
          subAny.trial_start ?? null,
          subAny.trial_end ?? null,
        )

        await grantSubscriptionCredits(userEmail, planId)
        console.log(
          `[webhook] invoice paid — refilled credits for ${userEmail} ` +
            `(${planId}, billing_reason=${invoice.billing_reason})`,
        )
        break
      }

      // Fires when a charge declines (most importantly: when a trial card
      // fails to convert at day 3, or a renewal fails). Stripe will retry
      // automatically per the dunning settings in the Stripe dashboard; we
      // just need to reflect the past_due state so the user sees it.
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceAny = invoice as any
        const subscriptionId = invoiceAny.subscription as string | null
        if (!subscriptionId) break

        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const userEmail = sub.metadata?.userEmail
        if (!userEmail) break

        await supabase
          .from('user_settings')
          .update({
            subscription_status: sub.status, // typically 'past_due' or 'unpaid'
            updated_at: new Date().toISOString(),
          })
          .eq('user_email', userEmail)

        console.log(
          `[webhook] invoice payment failed for ${userEmail} — status now ${sub.status}`,
        )
        // TODO(phase-2.5): send "payment failed, please update your card" email.
        break
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
  }

  return NextResponse.json({ received: true })
}
