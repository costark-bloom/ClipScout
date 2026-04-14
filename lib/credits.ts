import { supabase } from './supabase'

const FREE_TRIAL_CREDITS = 3

const PLAN_CREDITS: Record<string, number> = {
  creator: 75,
  pro: 200,
  agency: 600,
}

/**
 * Get the current credits remaining for a user.
 * If no row exists, initialize with 3 free trial credits.
 */
export async function getCreditsRemaining(userEmail: string): Promise<number> {
  const { data } = await supabase
    .from('user_settings')
    .select('credits_remaining, subscription_plan, subscription_status')
    .eq('user_email', userEmail)
    .single()

  if (!data) {
    // First time — create row with free trial credits
    await supabase.from('user_settings').insert({
      user_email: userEmail,
      credits_remaining: FREE_TRIAL_CREDITS,
      credits_used: 0,
    })
    return FREE_TRIAL_CREDITS
  }

  return data.credits_remaining ?? FREE_TRIAL_CREDITS
}

/**
 * Deduct 1 credit from the user's balance.
 * Returns the new credits_remaining value.
 */
export async function deductCredit(userEmail: string): Promise<number> {
  const { data } = await supabase
    .from('user_settings')
    .select('credits_remaining, credits_used')
    .eq('user_email', userEmail)
    .single()

  const current = data?.credits_remaining ?? 0
  const used = (data?.credits_used ?? 0) + 1
  const newRemaining = Math.max(0, current - 1)

  await supabase
    .from('user_settings')
    .upsert(
      { user_email: userEmail, credits_remaining: newRemaining, credits_used: used },
      { onConflict: 'user_email' }
    )

  return newRemaining
}

/**
 * Grant monthly credits when a subscription activates or renews.
 */
export async function grantSubscriptionCredits(userEmail: string, planId: string): Promise<void> {
  const credits = PLAN_CREDITS[planId] ?? 0
  if (!credits) return

  await supabase
    .from('user_settings')
    .upsert(
      { user_email: userEmail, credits_remaining: credits, credits_used: 0 },
      { onConflict: 'user_email' }
    )
}
