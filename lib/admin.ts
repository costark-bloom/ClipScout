/**
 * Allowlist of emails that bypass all credit and subscription gates. Used for
 * live testing on prod without spending real credits or signing up for a real
 * trial. Keep this list very short — anything here gets the entire product
 * for free, indefinitely.
 *
 * Effects of being on the list:
 * - getSubscriptionAccess() always returns { kind: 'allowed' }
 * - deductCredit() becomes a no-op (the row in user_settings is never touched)
 * - /api/user/settings reports a synthetic high credit count so the UI never
 *   surfaces the upgrade modal's soft gate
 */
const ADMIN_EMAILS = new Set<string>(
  [
    'cole.stark9@gmail.com',
  ].map((e) => e.toLowerCase()),
)

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.has(email.toLowerCase())
}

/**
 * Synthetic credit count to report for admin accounts. Picked high enough to
 * never trigger any client-side soft gates (keyword count, "low credits"
 * warnings, etc.) but low enough to fit comfortably in any UI rendering.
 */
export const ADMIN_CREDIT_BALANCE = 9999
