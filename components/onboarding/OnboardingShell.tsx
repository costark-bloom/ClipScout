'use client'

import { ReactNode } from 'react'

interface OnboardingShellProps {
  /** Current step index (0-based) used to render the progress bar. */
  stepIndex: number
  /** Total number of steps. */
  totalSteps: number
  /** Optional handler — when omitted the back button is hidden. */
  onBack?: () => void
  /** Optional handler — adds an unobtrusive "Sign out" escape hatch in the
   *  footer so the user isn't fully trapped if they change their mind. */
  onSignOut?: () => void
  children: ReactNode
}

/**
 * Shared frame for every onboarding screen: top progress bar + back button,
 * centered max-width container, soft purple gradient background. Sized to
 * fill its parent (works as a full-page route OR inside a full-screen modal).
 */
export default function OnboardingShell({
  stepIndex,
  totalSteps,
  onBack,
  onSignOut,
  children,
}: OnboardingShellProps) {
  const pct = Math.min(100, Math.max(0, ((stepIndex + 1) / totalSteps) * 100))

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-purple-50 via-white to-purple-50">
      {/* Top bar: back + progress */}
      <div className="shrink-0 bg-white/70 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="Back"
              className="w-9 h-9 rounded-full flex items-center justify-center text-purple-700 hover:bg-purple-100 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : (
            <div className="w-9 h-9 shrink-0" />
          )}

          <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Spacer to keep the progress bar visually centered when the back
              button is hidden, matching the left-side spacer above. */}
          <div className="w-9 h-9 shrink-0" />
        </div>
      </div>

      {/* Scrollable content area */}
      <div id="onboarding-scroller" className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto w-full px-4 py-8 sm:py-12 min-h-full flex flex-col">
          {children}
        </div>
      </div>

      {/* Persistent footer outside the scroller so it doesn't push content
          past the modal edge. Subtle on purpose — we don't want to flag the
          escape hatch too loudly. */}
      {onSignOut && (
        <div className="shrink-0 border-t border-purple-100 bg-white/70 backdrop-blur-md text-center py-2.5">
          <button
            onClick={onSignOut}
            className="text-xs text-purple-400 hover:text-purple-700 transition-colors underline underline-offset-2"
          >
            Not now — sign out
          </button>
        </div>
      )}
    </div>
  )
}
