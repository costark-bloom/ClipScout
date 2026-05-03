'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import AuthGate from '@/components/AuthGate'
import { trackEvent } from '@/lib/analytics'

export default function FreeTrialBadge() {
  const { data: session, status } = useSession()
  const [showAuth, setShowAuth] = useState(false)

  if (status === 'loading' || session) return null

  return (
    <>
      <div className="flex justify-center mb-6 animate-fade-in px-4">
        <button
          onClick={() => {
            trackEvent('Home — Free Trial Banner')
            setShowAuth(true)
          }}
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-full px-5 py-2.5 shadow-lg shadow-purple-600/30 ring-1 ring-white/20 cursor-pointer hover:brightness-110 transition-all duration-150"
        >
          <span className="text-lg">🎁</span>
          <span className="text-white font-semibold text-sm">
            First 3 chapters free
          </span>
          <span className="w-px h-4 bg-white/30" />
          <span className="text-white/80 text-sm">
            No credit card needed
          </span>
        </button>
      </div>

      {showAuth && <AuthGate onAuthenticated={() => setShowAuth(false)} />}
    </>
  )
}
