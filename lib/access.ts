import { supabase } from './supabase'
import { ADMIN_CREDIT_BALANCE, isAdminEmail } from './admin'

/**
 * Subscription statuses that grant the user access to spend credits.
 *
 * - `active`     — paying customer, current
 * - `trialing`   — inside their 3-day trial window (card on file)
 * - `cancelling` — locally-set when the user cancels (still has access through period end)
 * - `null`       — legacy free-tier users (pre-onboarding-funnel signups, never went
 *                  to Stripe). They keep their 3 initial credits and can spend freely.
 *
 * Everything else (`past_due`, `unpaid`, `canceled`, `incomplete`,
 * `incomplete_expired`, `paused`) is blocked even if `credits_remaining > 0`.
 * This closes the loophole where a trial user's card fails to convert at day 3
 * but they still have leftover credits from the 75-credit trial grant.
 */
const ACTIVE_STATUSES = new Set<string>(['active', 'trialing', 'cancelling'])

export type AccessState =
  | { kind: 'allowed'; credits: number; status: string | null }
  | { kind: 'no_credits'; credits: number; status: string | null }
  | { kind: 'inactive'; credits: number; status: string }

/**
 * Single source of truth for "is this user allowed to spend credits right now?"
 *
 * Returns one of:
 * - `allowed`     — user has credits AND an active (or implicit-active) status.
 *                   Caller can proceed and deduct.
 * - `no_credits`  — user has an active status but is out of credits. Caller
 *                   should surface the regular upgrade modal.
 * - `inactive`    — user has a problematic status (past_due, unpaid, canceled).
 *                   Caller should surface the payment-issue modal regardless
 *                   of how many credits they have.
 *
 * The order matters: status takes precedence over credit count. We don't want
 * to tell a past_due user "you're out of credits" when their real problem is
 * a failed charge.
 */
export async function getSubscriptionAccess(
  userEmail: string,
  required = 1,
): Promise<AccessState> {
  // Admin allowlist short-circuit — unlimited everything, no DB read needed.
  if (isAdminEmail(userEmail)) {
    return { kind: 'allowed', credits: ADMIN_CREDIT_BALANCE, status: 'active' }
  }

  const { data } = await supabase
    .from('user_settings')
    .select('credits_remaining, subscription_status')
    .eq('user_email', userEmail)
    .single()

  const credits = data?.credits_remaining ?? 0
  const status: string | null = data?.subscription_status ?? null

  // null status = legacy free user or never-subscribed new user. Treat as
  // implicitly-active so we don't lock them out of their starter credits.
  if (status !== null && !ACTIVE_STATUSES.has(status)) {
    return { kind: 'inactive', credits, status }
  }

  if (credits < required) {
    return { kind: 'no_credits', credits, status }
  }

  return { kind: 'allowed', credits, status }
}
