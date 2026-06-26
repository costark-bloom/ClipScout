import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'

// Use the service-role key here to bypass RLS — the shared `@/lib/supabase`
// client uses the anon key, which can't read other users' rows in `users`.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/**
 * Returns whether the signed-in user has completed onboarding. Used by the
 * client-side OnboardingRedirect component to decide whether to bounce a
 * brand-new user into /onboarding after sign-in.
 *
 * Returns 200 with { needsOnboarding: false } for unauthenticated callers so
 * the client can no-op without a noisy 401 in the console.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ needsOnboarding: false, authenticated: false })
  }

  // Admin allowlist — skip the onboarding modal entirely. Lets demo/contractor
  // accounts use the product immediately without being bounced into the
  // trial-signup flow.
  if (isAdminEmail(session.user.email)) {
    return NextResponse.json({
      authenticated: true,
      needsOnboarding: false,
      surveyAlreadyCompleted: false,
    })
  }

  const { data, error } = await supabase
    .from('users')
    .select('onboarding_completed_at, onboarding_responses')
    .eq('email', session.user.email.toLowerCase())
    .single()

  // Fail open: if the column doesn't exist yet (migration not run) or the
  // user row doesn't exist for any reason, don't trap anyone in onboarding.
  // Only a confirmed-null timestamp on an existing row means "needs onboarding".
  if (error || !data) {
    if (error) console.error('[onboarding/status]', error.message)
    return NextResponse.json({
      authenticated: true,
      needsOnboarding: false,
      surveyAlreadyCompleted: false,
    })
  }

  // surveyAlreadyCompleted is true if the user has previously walked through
  // the survey but never completed the trial checkout (e.g., they bailed at
  // the Stripe page). Used by the client to skip them straight to the
  // TrialOffer step instead of re-asking 6 questions they already answered.
  const surveyAlreadyCompleted =
    !!data.onboarding_responses &&
    typeof data.onboarding_responses === 'object' &&
    Object.keys(data.onboarding_responses).length > 0

  return NextResponse.json({
    authenticated: true,
    needsOnboarding: !data.onboarding_completed_at,
    surveyAlreadyCompleted,
  })
}
