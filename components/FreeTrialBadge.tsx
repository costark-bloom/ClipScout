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
      {/* Mobile: compact pill */}
      <div className="flex sm:hidden justify-center mb-6 animate-fade-in px-4">
        <button
          onClick={() => { trackEvent('Home — Free Trial Banner'); setShowAuth(true) }}
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-full px-5 py-2.5 shadow-lg shadow-purple-600/30 ring-1 ring-white/20 hover:brightness-110 transition-all duration-150"
        >
          <span className="text-lg">🎁</span>
          <span className="text-white font-semibold text-sm">First 3 tokens free</span>
          <span className="w-px h-4 bg-white/30" />
          <span className="text-white/80 text-sm">No credit card needed</span>
        </button>
      </div>

      {/* Desktop: full-width bold block */}
      <div className="hidden sm:flex justify-center mb-6 animate-fade-in w-full max-w-3xl mx-auto px-4">
        <button
          onClick={() => { trackEvent('Home — Free Trial Banner'); setShowAuth(true) }}
          className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-xl px-6 py-3.5 shadow-lg shadow-purple-600/35 ring-1 ring-white/20 hover:brightness-110 transition-all duration-150"
        >
          <span className="text-2xl">🎁</span>
          <span className="text-white font-extrabold text-lg tracking-tight">First 3 tokens free</span>
          <span className="w-px h-5 bg-white/30" />
          <span className="text-white font-semibold text-base">No credit card needed</span>
        </button>
      </div>

      {showAuth && <AuthGate onAuthenticated={() => setShowAuth(false)} />}
    </>
  )
}
