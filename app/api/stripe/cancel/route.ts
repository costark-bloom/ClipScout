import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data } = await supabase
      .from('user_settings')
      .select('stripe_subscription_id')
      .eq('user_email', session.user.email)
      .single()

    if (!data?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found.' }, { status: 404 })
    }

    // Cancel at period end so the user keeps access until their paid period expires
    await stripe.subscriptions.update(data.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    await supabase
      .from('user_settings')
      .update({
        subscription_status: 'cancelling',
        updated_at: new Date().toISOString(),
      })
      .eq('user_email', session.user.email)

    console.log(`[cancel] subscription set to cancel at period end for ${session.user.email}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cancel] error:', err)
    return NextResponse.json({ error: 'Failed to cancel subscription.' }, { status: 500 })
  }
}
