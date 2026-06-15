import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { grantSubscriptionCredits } from '@/lib/credits'

// Service-role client for writes to the `users` table (RLS would block the
// anon client). Used to flip onboarding_completed_at once Stripe confirms.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/**
 * Marks the user's onboarding as complete and dismisses the modal for good.
 * Called only after Stripe has confirmed the trial / payment — never before,
 * otherwise users can bail at the Stripe page and silently slip past the
 * paywall. Idempotent: re-runs harmlessly if already set.
 */
async function markOnboardingComplete(email: string) {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('email', email.toLowerCase())
    .is('onboarding_completed_at', null)
  if (error) console.error('[verify-session] markOnboardingComplete:', error)
}

const PLAN_CREDITS: Record<string, number> = {
  creator: 75,
  pro: 200,
  agency: 600,
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (checkoutSession.customer_email !== session.user.email &&
        checkoutSession.metadata?.userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }

    // For trial signups, payment_status is 'no_payment_required' (card collected,
    // not charged yet). For paid signups it's 'paid'. Anything else means the
    // checkout didn't complete cleanly and we shouldn't activate anything.
    const isTrial = checkoutSession.metadata?.trial === 'true'
    const paymentOk =
      checkoutSession.payment_status === 'paid' ||
      (isTrial && checkoutSession.payment_status === 'no_payment_required')

    if (!paymentOk) {
      return NextResponse.json({ alreadyUpdated: false, message: 'Payment not completed' })
    }

    const planId = checkoutSession.metadata?.planId
    const interval = checkoutSession.metadata?.interval
    const userEmail = checkoutSession.metadata?.userEmail ?? session.user.email

    if (!planId || !interval) {
      return NextResponse.json({ error: 'Missing plan metadata' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('user_settings')
      .select('subscription_plan, subscription_status, trial_ends_at')
      .eq('user_email', userEmail)
      .single()

    const activeStatuses = ['active', 'trialing']
    if (
      existing?.subscription_plan === planId &&
      activeStatuses.includes(existing?.subscription_status ?? '')
    ) {
      // Webhook already updated the row, but still make sure the onboarding
      // gate is closed — covers the case where the webhook race-d ahead of
      // verify-session but didn't flip the user-level flag itself.
      await markOnboardingComplete(userEmail)
      return NextResponse.json({
        alreadyUpdated: true,
        planId,
        interval,
        isTrial,
        trialEndsAt: existing.trial_ends_at,
      })
    }

    // Webhook hasn't fired yet (common in local dev) — apply the update now.
    const sub = typeof checkoutSession.subscription === 'string'
      ? await stripe.subscriptions.retrieve(checkoutSession.subscription)
      : checkoutSession.subscription

    if (!sub) {
      return NextResponse.json({ error: 'Could not retrieve subscription' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subAny = sub as any
    const status = sub.status // 'trialing' or 'active'
    const trialEndIso = subAny.trial_end ? new Date(subAny.trial_end * 1000).toISOString() : null

    await supabase.from('user_settings').upsert(
      {
        user_email: userEmail,
        subscription_plan: planId,
        subscription_interval: interval,
        subscription_status: status,
        stripe_customer_id: checkoutSession.customer as string,
        stripe_subscription_id: sub.id,
        subscription_period_end: subAny.current_period_end
          ? new Date(subAny.current_period_end * 1000).toISOString()
          : null,
        trial_started_at: subAny.trial_start ? new Date(subAny.trial_start * 1000).toISOString() : null,
        trial_ends_at: trialEndIso,
        credits_remaining: PLAN_CREDITS[planId] ?? 0,
        credits_used: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_email' }
    )

    await grantSubscriptionCredits(userEmail, planId)
    // Now that Stripe has confirmed payment/trial, close the onboarding gate.
    // (Previously this flag was set in /api/onboarding/complete, which let
    // users who bailed at the Stripe page silently slip past the paywall.)
    await markOnboardingComplete(userEmail)
    console.log(
      `[verify-session] ${status === 'trialing' ? 'trial started' : 'subscription applied'} ` +
        `for ${userEmail} (${planId}/${interval})`,
    )

    return NextResponse.json({
      alreadyUpdated: false,
      planId,
      interval,
      isTrial: status === 'trialing',
      trialEndsAt: trialEndIso,
    })
  } catch (err) {
    console.error('[verify-session] error:', err)
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 })
  }
}
