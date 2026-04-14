'use client'

import Link from 'next/link'

interface Props {
  onClose: () => void
  outOfCredits?: boolean
  /** True when the user is on the free trial (no active paid plan) */
  isFreeTrial?: boolean
}

export default function UpgradeModal({ onClose, outOfCredits = true, isFreeTrial = true }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-purple-300/30 border border-purple-100 overflow-hidden">
        {/* Top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-indigo-500" />

        <div className="p-8">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>

          <h2 className="text-xl font-extrabold text-purple-950 text-center mb-2">
            {outOfCredits
              ? isFreeTrial
                ? "You're out of free credits"
                : "You're out of credits"
              : 'Upgrade to continue'}
          </h2>
          <p className="text-sm text-purple-600 text-center leading-relaxed mb-6">
            {outOfCredits
              ? isFreeTrial
                ? "You've used your 3 free trial credits. Upgrade to a plan to keep finding b-roll for your scripts."
                : "You've used all your credits for this billing period. Upgrade your plan or wait for your credits to renew."
              : "You don't have enough credits for this script. Upgrade to a plan to continue."}
          </p>

          <div className="space-y-2.5">
            <Link
              href="/pricing"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              View plans & upgrade
            </Link>
            <button
              onClick={onClose}
              className="w-full text-sm text-purple-500 hover:text-purple-700 transition-colors py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
