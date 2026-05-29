// Single source of truth for subscription plan data. Used by the pricing page
// and the in-app upgrade modal so changes only need to happen in one place.

export interface Plan {
  id: 'creator' | 'pro' | 'agency'
  name: string
  tagline: string
  monthly: number
  quarterly: number // per-month rate when billed quarterly
  annual: number    // per-month rate when billed annually
  quarterlyTotal: number
  annualTotal: number
  credits: number
  rollover: number
  popular: boolean
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'creator',
    name: 'Creator',
    tagline: 'For content creators getting started with AI b-roll',
    monthly: 12,
    quarterly: 9,
    annual: 8,
    quarterlyTotal: 27,
    annualTotal: 96,
    credits: 75,
    rollover: 150,
    popular: false,
    features: [
      '75 credits / month',
      'Credits rollover (up to 150)',
      'Save unlimited scripts',
      'YouTube, Pexels & Pixabay search',
      'Connect your Freepik account',
      'AI transcript matching',
      'Standard processing speed',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious creators who need more volume and speed',
    monthly: 29,
    quarterly: 22,
    annual: 20,
    quarterlyTotal: 66,
    annualTotal: 240,
    credits: 200,
    rollover: 400,
    popular: true,
    features: [
      '200 credits / month',
      'Credits rollover (up to 400)',
      'Save unlimited scripts',
      'YouTube, Pexels & Pixabay search',
      'Connect your Freepik account',
      'AI transcript matching',
      'Priority processing speed',
      'Early access to new features',
      'Priority support',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'For studios and teams producing content at scale',
    monthly: 79,
    quarterly: 59,
    annual: 52,
    quarterlyTotal: 177,
    annualTotal: 624,
    credits: 600,
    rollover: 1200,
    popular: false,
    features: [
      '600 credits / month',
      'Credits rollover (up to 1,200)',
      'Save unlimited scripts',
      'YouTube, Pexels & Pixabay search',
      'Connect your Freepik account',
      'AI transcript matching',
      'Priority processing speed',
      'Up to 5 team seats',
      'Early access to new features',
      'Dedicated priority support',
    ],
  },
]
