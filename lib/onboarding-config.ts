/**
 * Single source of truth for the new-user onboarding funnel.
 * Edit copy here — all components read from this file.
 */

// ── Value screens (slide carousel) ────────────────────────────────────────────

export type ValueScreenIcon = 'search' | 'layers' | 'shield' | 'clock'

export interface ValueScreen {
  icon: ValueScreenIcon
  title: string
  body: string
}

export const VALUE_SCREENS: ValueScreen[] = [
  {
    icon: 'search',
    title: 'AI finds B-roll for you',
    body: 'Paste your script or just type keywords. AI identifies every visual moment and finds matching footage.',
  },
  {
    icon: 'layers',
    title: 'Scan the entire web at once',
    body: 'Every major footage source, searched simultaneously and ranked by what matches your script best.',
  },
  {
    icon: 'shield',
    title: "Know what's safe to use",
    body: 'Every clip is tagged with its license. Filter to keep results copyright-safe and avoid copyright claims.',
  },
  {
    icon: 'clock',
    title: 'Save hours per video',
    body: 'What used to take 3 hours of tab-hopping now takes 30 seconds.',
  },
]

// ── Survey questions ──────────────────────────────────────────────────────────

export interface SurveyOption {
  id: string
  label: string
  /** Avg. minutes per video (Q: time_per_video). Used in impact calc. */
  minutes?: number
  /** Avg. videos per month (Q: videos_per_month). Used in impact calc. */
  count?: number
  /** When true, selecting this option reveals a freeform text input.
   *  The text is stored in answers under `${questionId}_${optionId}_text`.
   *  Currently only supported on multi-select questions (single-select auto-advance
   *  would dismiss the field before the user can type). */
  freeText?: boolean
  /** Placeholder shown inside the freeform input when `freeText` is true. */
  freeTextPlaceholder?: string
}

export type SurveyType = 'single' | 'multi'

export interface SurveyQuestion {
  id: string
  question: string
  type: SurveyType
  options: SurveyOption[]
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'use_case',
    question: 'What brings you to ClipScout?',
    type: 'single',
    options: [
      { id: 'youtube', label: 'I make YouTube videos' },
      { id: 'social', label: 'I create social content (Reels, TikTok, Shorts)' },
      { id: 'client', label: 'I edit videos for clients' },
      { id: 'course', label: 'I make course or educational content' },
      { id: 'exploring', label: 'Just exploring' },
    ],
  },
  {
    id: 'time_per_video',
    question: 'How long do you typically spend finding B-roll for one video?',
    type: 'single',
    options: [
      { id: 'under_30', label: 'Under 30 minutes', minutes: 25 },
      { id: '30_60', label: '30–60 minutes', minutes: 45 },
      { id: '1_3', label: '1–3 hours', minutes: 120 },
      { id: '3_plus', label: '3+ hours', minutes: 240 },
    ],
  },
  {
    id: 'biggest_frustration',
    question: "What's your biggest frustration with finding B-roll?",
    type: 'single',
    options: [
      { id: 'irrelevant', label: 'Search results are irrelevant' },
      { id: 'licensing', label: 'Licensing is confusing or scary' },
      { id: 'time', label: 'Takes way too long' },
      { id: 'too_few', label: 'Too few good options' },
      { id: 'tabs', label: 'Managing tabs across multiple sites' },
    ],
  },
  {
    id: 'current_sources',
    question: 'Where do you currently search for B-roll?',
    type: 'multi',
    options: [
      { id: 'pexels', label: 'Pexels' },
      { id: 'pixabay', label: 'Pixabay' },
      { id: 'youtube', label: 'YouTube' },
      { id: 'storyblocks', label: 'Storyblocks' },
      { id: 'shutterstock', label: 'Shutterstock / Adobe Stock' },
      {
        id: 'other',
        label: 'Other / nowhere yet',
        freeText: true,
        freeTextPlaceholder: 'Tell us where (optional)',
      },
    ],
  },
  {
    id: 'copyright_worry',
    question: 'Have you ever worried about copyright issues with a clip you used?',
    type: 'single',
    options: [
      { id: 'often', label: 'Yes, often' },
      { id: 'sometimes', label: 'Sometimes' },
      { id: 'rarely', label: 'Rarely' },
      { id: 'never', label: 'Never thought about it' },
    ],
  },
  {
    id: 'videos_per_month',
    question: 'How many videos do you create per month?',
    type: 'single',
    options: [
      { id: '1_2', label: '1–2', count: 1.5 },
      { id: '3_5', label: '3–5', count: 4 },
      { id: '6_10', label: '6–10', count: 8 },
      { id: '10_plus', label: '10+', count: 12 },
    ],
  },
]

/**
 * Shape of stored survey answers. For single-select the value is a string;
 * for multi-select it's an array of selected option ids.
 */
export type SurveyAnswers = Record<string, string | string[]>

// ── Trial offer ───────────────────────────────────────────────────────────────

export const TRIAL_OFFER = {
  trialDays: 3,
  credits: 75,
  monthly: 12,
  annualPerMonth: 8,
  annualTotal: 96,
} as const
