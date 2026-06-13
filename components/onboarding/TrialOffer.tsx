'use client'

import { useEffect, useState } from 'react'
import { TRIAL_OFFER } from '@/lib/onboarding-config'
import { trackEvent } from '@/lib/analytics'

interface TrialOfferProps {
  onStartTrial: (interval: 'monthly' | 'annual') => void
  /** True while we're redirecting to Stripe. */
  isLoading?: boolean
}

const FEATURES = [
  'AI-powered B-roll discovery',
  'Search videos across the web at once',
  'License filters & copyright safety',
  'Save unlimited scripts',
  'AI transcript matching',
]

export default function TrialOffer({ onStartTrial, isLoading }: TrialOfferProps) {
  const [interval, setIntervalState] = useState<'monthly' | 'annual'>('annual')

  useEffect(() => {
    trackEvent('Onboarding — Trial Offer Viewed')
  }, [])

  const handleToggle = (next: 'monthly' | 'annual') => {
    setIntervalState(next)
    trackEvent('Onboarding — Trial Interval Toggled', { interval: next })
  }

  const handleStart = () => {
    trackEvent('Onboarding — Start Trial Clicked', { interval })
    onStartTrial(interval)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 border border-purple-200">
            <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
              {TRIAL_OFFER.trialDays}-day free trial
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-purple-950 tracking-tight text-balance">
            Try ClipScout free for {TRIAL_OFFER.trialDays} days
          </h1>
          <p className="text-base text-purple-700 max-w-md mx-auto">
            Full Creator plan access. Cancel anytime before your trial ends — we&apos;ll remind you.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 bg-purple-100 border border-purple-200 rounded-xl">
            <button
              onClick={() => handleToggle('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                interval === 'monthly'
                  ? 'bg-white text-purple-950 shadow'
                  : 'text-purple-600 hover:text-purple-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => handleToggle('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                interval === 'annual'
                  ? 'bg-white text-purple-950 shadow'
                  : 'text-purple-600 hover:text-purple-900'
              }`}
            >
              Annual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                SAVE 33%
              </span>
            </button>
          </div>
        </div>

        {/* Price card — leads with FREE so the eye doesn't misread it as
            "you're paying today". The recurring price is right there too,
            just rebalanced visually. */}
        <div className="bg-white border-2 border-purple-300 rounded-2xl p-6 shadow-xl shadow-purple-200/60 space-y-5">
          {/* Big FREE callout */}
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-extrabold text-purple-950 tracking-tight leading-none">
                $0
              </span>
              <span className="text-lg text-purple-700 font-semibold">
                today
              </span>
            </div>
            <p className="mt-3 text-base sm:text-lg text-purple-700">
              <span className="font-semibold text-purple-950">Free for {TRIAL_OFFER.trialDays} days</span>
              {' · '}
              {interval === 'annual' ? (
                <>then <span className="font-semibold text-purple-900">${TRIAL_OFFER.annualTotal}/year</span> (${TRIAL_OFFER.annualPerMonth}/mo)</>
              ) : (
                <>then <span className="font-semibold text-purple-900">${TRIAL_OFFER.monthly}/month</span></>
              )}
            </p>
          </div>

          <div className="border-t border-purple-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-500 mb-3">
              Everything included
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span className="text-sm font-semibold text-purple-950">
                  {TRIAL_OFFER.credits} credits / month
                </span>
              </li>
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span className="text-sm text-purple-800">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 sticky bottom-0 space-y-3">
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl text-base shadow-lg shadow-purple-300/40 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Redirecting to checkout…
            </>
          ) : (
            <>Start my {TRIAL_OFFER.trialDays}-day free trial</>
          )}
        </button>
        <p className="text-center text-[11px] text-purple-500">
          Card required to start. Cancel anytime in Settings.
        </p>
      </div>
    </div>
  )
}
