import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { grantSubscriptionCredits } from '@/lib/credits'
import type Stripe from 'stripe'

export const config = { api: { bodyParser: false } }

async function upsertSubscription(
  userEmail: string,
  planId: string,
  interval: string,
  status: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  currentPeriodEnd: number | null,
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

        // Fetch full subscription to get period end
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        await upsertSubscription(
          userEmail,
          planId,
          interval,
          'active',
          session.customer as string,
          sub.id,
          (sub as any).current_period_end ?? null,
        )
        await grantSubscriptionCredits(userEmail, planId)
        console.log(`[webhook] subscription activated for ${userEmail} (${planId}/${interval})`)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userEmail = sub.metadata?.userEmail
        const planId = sub.metadata?.planId
        const interval = sub.metadata?.interval
        if (!userEmail) break

        await upsertSubscription(
          userEmail,
          planId ?? '',
          interval ?? '',
          sub.status,
          sub.customer as string,
          sub.id,
          (sub as any).current_period_end ?? null,
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
            updated_at: new Date().toISOString(),
          })
          .eq('user_email', userEmail)
        console.log(`[webhook] subscription cancelled for ${userEmail}`)
        break
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
  }

  return NextResponse.json({ received: true })
}
