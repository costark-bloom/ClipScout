import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { grantSubscriptionCredits } from '@/lib/credits'

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
