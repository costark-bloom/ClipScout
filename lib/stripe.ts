import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
})

// Price IDs — loaded from env so sandbox and live can differ
export const PRICE_IDS = {
  creator: {
    monthly:   process.env.STRIPE_PRICE_CREATOR_MONTHLY!,
    quarterly: process.env.STRIPE_PRICE_CREATOR_QUARTERLY!,
    annual:    process.env.STRIPE_PRICE_CREATOR_ANNUAL!,
  },
  pro: {
    monthly:   process.env.STRIPE_PRICE_PRO_MONTHLY!,
    quarterly: process.env.STRIPE_PRICE_PRO_QUARTERLY!,
    annual:    process.env.STRIPE_PRICE_PRO_ANNUAL!,
  },
  agency: {
    monthly:   process.env.STRIPE_PRICE_AGENCY_MONTHLY!,
    quarterly: process.env.STRIPE_PRICE_AGENCY_QUARTERLY!,
    annual:    process.env.STRIPE_PRICE_AGENCY_ANNUAL!,
  },
} as const

export type PlanId = keyof typeof PRICE_IDS
export type BillingInterval = 'monthly' | 'quarterly' | 'annual'

// One-time credit pack price IDs
export const PACK_PRICE_IDS: Record<string, string> = {
  scout:  process.env.STRIPE_PRICE_SCOUT_PACK!,
  crew:   process.env.STRIPE_PRICE_CREW_PACK!,
  studio: process.env.STRIPE_PRICE_STUDIO_PACK!,
}
