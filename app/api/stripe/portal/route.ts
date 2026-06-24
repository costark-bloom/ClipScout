import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

/**
 * Creates a Stripe Billing Portal session for the signed-in user and returns
 * its URL. The portal is where the user updates their payment method,
 * downloads invoices, and (eventually) manages their plan.
 *
 * Primary use case today: a `past_due` user clicks "Update payment method" in
 * the payment-issue modal, gets bounced to the hosted portal, fixes their
 * card, and Stripe's dunning retry succeeds on its own.
 *
 * Accepts an optional `returnUrl` in the request body so different surfaces
 * (modal vs. settings page banner) can send users back to where they came
 * from. Falls back to /settings.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data } = await supabase
      .from('user_settings')
      .select('stripe_customer_id')
      .eq('user_email', session.user.email)
      .single()

    if (!data?.stripe_customer_id) {
      // No customer ID = user never went through Stripe. Nothing for them to
      // manage in the portal — they should be on /pricing instead.
      return NextResponse.json(
        { error: 'No Stripe customer found for this account.' },
        { status: 404 },
      )
    }

    let returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/settings`
    try {
      const body = await req.json()
      if (typeof body?.returnUrl === 'string' && body.returnUrl.length > 0) {
        returnUrl = body.returnUrl
      }
    } catch {
      // Empty / non-JSON body is fine — caller may not need a custom return.
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('[portal] error:', err)
    return NextResponse.json(
      { error: 'Failed to open billing portal.' },
      { status: 500 },
    )
  }
}
