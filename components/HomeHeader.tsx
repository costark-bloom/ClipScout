'use client'

import { useState } from 'react'
import Link from 'next/link'
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="ClipScout" className="w-7 h-7" />
          <span className="text-sm font-semibold text-gray-200 tracking-tight">ClipScout</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Feedback
          </Link>
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
