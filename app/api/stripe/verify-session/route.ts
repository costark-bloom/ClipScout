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

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // Validate it actually belongs to this user
    if (checkoutSession.customer_email !== session.user.email &&
        checkoutSession.metadata?.userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json({ alreadyUpdated: false, message: 'Payment not completed' })
    }

    const planId = checkoutSession.metadata?.planId
    const interval = checkoutSession.metadata?.interval
    const userEmail = checkoutSession.metadata?.userEmail ?? session.user.email

    if (!planId || !interval) {
      return NextResponse.json({ error: 'Missing plan metadata' }, { status: 400 })
    }

    // Check if already updated (webhook may have fired successfully in production)
    const { data: existing } = await supabase
      .from('user_settings')
      .select('subscription_plan, subscription_status')
      .eq('user_email', userEmail)
      .single()

    if (existing?.subscription_plan === planId && existing?.subscription_status === 'active') {
      return NextResponse.json({ alreadyUpdated: true, planId, interval })
    }

    // Webhook didn't fire (common in local dev) — apply the update now
    const sub = typeof checkoutSession.subscription === 'string'
      ? await stripe.subscriptions.retrieve(checkoutSession.subscription)
      : checkoutSession.subscription

    if (!sub) {
      return NextResponse.json({ error: 'Could not retrieve subscription' }, { status: 500 })
    }

    await supabase.from('user_settings').upsert(
      {
        user_email: userEmail,
        subscription_plan: planId,
        subscription_interval: interval,
        subscription_status: 'active',
        stripe_customer_id: checkoutSession.customer as string,
        stripe_subscription_id: sub.id,
        subscription_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        credits_remaining: PLAN_CREDITS[planId] ?? 0,
        credits_used: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_email' }
    )

    await grantSubscriptionCredits(userEmail, planId)
    console.log(`[verify-session] subscription applied for ${userEmail} (${planId}/${interval})`)

    return NextResponse.json({ alreadyUpdated: false, planId, interval })
  } catch (err) {
    console.error('[verify-session] error:', err)
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 })
  }
}
