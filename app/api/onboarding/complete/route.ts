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
 * Marks the current user as having completed onboarding and stores their
 * survey responses. Idempotent: safe to call multiple times. We deliberately
 * don't gate this on the user picking a paid plan — survey data is valuable
 * even for users who bail at the trial-offer step (helps us learn what
 * blocked them).
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
    // Empty body is fine — caller may just want to mark complete.
  }

  const { error } = await supabase
    .from('users')
    .update({
      onboarding_completed_at: new Date().toISOString(),
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
