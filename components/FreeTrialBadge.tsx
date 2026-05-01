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
      <div className="flex justify-center mb-8 animate-fade-in w-full max-w-3xl mx-auto px-4">
        <button
          onClick={() => {
            trackEvent('Button Click', { button_name: 'Free Trial Banner', page: 'Home' })
            setShowAuth(true)
          }}
          className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-2xl px-8 py-5 shadow-xl shadow-purple-600/40 ring-2 ring-white/20 cursor-pointer hover:brightness-110 transition-all duration-150"
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">🎁</span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">
                First 3 chapters free
              </span>
              <span className="hidden sm:block w-px h-8 bg-white/30" />
              <span className="text-white font-semibold text-xl md:text-2xl">
                No credit card needed
              </span>
            </div>
          </div>
        </button>
      </div>

      {showAuth && <AuthGate onAuthenticated={() => setShowAuth(false)} />}
    </>
  )
}
