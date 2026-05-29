'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import PlanGrid from './PlanGrid'

interface Props {
  onClose: () => void
  outOfCredits?: boolean
  /** True when the user is on the free trial (no active paid plan) */
  isFreeTrial?: boolean
}

export default function UpgradeModal({ onClose, outOfCredits = true, isFreeTrial = true }: Props) {
  // Track only the free-trial out-of-credits variant — that's the funnel we
  // care most about (free → paid conversion).
  useEffect(() => {
    if (outOfCredits && isFreeTrial) {
      trackEvent("You're Out Of Free Credits Modal Viewed")
    }
  }, [outOfCredits, isFreeTrial])

  // Esc-to-close keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const title = outOfCredits
    ? isFreeTrial
      ? "You're out of free credits"
      : "You're out of credits"
    : 'Upgrade to continue'

  const subtitle = outOfCredits
    ? isFreeTrial
      ? "You've used your 3 free trial credits. Pick a plan below to keep finding b-roll for your scripts."
      : "You've used all your credits for this billing period. Upgrade your plan to keep going."
    : "Pick the plan that fits how much b-roll you're producing."

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl shadow-purple-300/30 border border-purple-100 my-8 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-indigo-500" />

        {/* Close button (top-right) */}
        <button
          onClick={onClose}
          aria-label="Close upgrade modal"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-500 hover:text-purple-800 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-6 sm:px-8 pt-7 pb-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-purple-950 mb-1.5">{title}</h2>
          <p className="text-sm text-purple-600 max-w-md mx-auto leading-relaxed">{subtitle}</p>
        </div>

        <div className="px-4 sm:px-6 pb-6 pt-6">
          <PlanGrid variant="compact" analyticsContext="Upgrade Modal" />
        </div>

        <div className="px-6 pb-5 text-center">
          <button
            onClick={onClose}
            className="text-sm text-purple-500 hover:text-purple-700 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
