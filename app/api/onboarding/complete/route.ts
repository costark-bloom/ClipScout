import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'

// Same RLS dance as the status route — we need to write to `users` regardless
// of whoever's RLS policies. Service role bypasses them.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/**
 * Stores the current user's survey responses. Idempotent: safe to call
 * multiple times. Survey data is valuable even for users who bail at the
 * trial-offer step, so we save responses unconditionally here.
 *
 * IMPORTANT: this route deliberately does NOT set onboarding_completed_at.
 * That used to live here, but it caused a paywall-bypass bug: a user who
 * clicked "Start trial", got redirected to Stripe, and closed the tab
 * without entering a card would be marked complete and the onboarding
 * modal would never re-show. They'd silently slip past the trial gate.
 *
 * onboarding_completed_at is now set ONLY when payment is verified — in
 * /api/stripe/verify-session and the checkout.session.completed webhook.
 * That way the modal keeps re-prompting users until they actually start
 * the trial (or sign out).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = session.user.email.toLowerCase()
  let body: { responses?: Record<string, unknown>; selected_interval?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Empty body is fine — caller may just want to upsert with no responses.
  }

  const { error } = await supabase
    .from('users')
    .update({
      onboarding_responses: {
        ...(body.responses ?? {}),
        ...(body.selected_interval ? { _selected_interval: body.selected_interval } : {}),
      },
    })
    .eq('email', email)

  if (error) {
    console.error('[onboarding/complete]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
