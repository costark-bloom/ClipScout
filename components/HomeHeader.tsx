'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import UserMenu from '@/components/UserMenu'
import AuthGate from '@/components/AuthGate'

export default function HomeHeader() {
  const { status } = useSession()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-900">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow shadow-indigo-950/50">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-200 tracking-tight">ClipScout</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {status === 'authenticated' ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-sm text-gray-400 hover:text-gray-200 border border-gray-800 hover:border-gray-700 px-4 py-1.5 rounded-lg transition-all duration-150"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {showAuth && (
        <AuthGate onAuthenticated={() => setShowAuth(false)} />
      )}
    </>
  )
}
