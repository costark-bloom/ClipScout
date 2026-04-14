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
      <header className="flex items-center justify-between px-6 py-4 border-b border-purple-200 bg-white/30 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="ClipScout" className="w-7 h-7" />
          <span className="text-sm font-semibold text-purple-950 tracking-tight">ClipScout</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">
          <Link
            href="/contact"
            className="text-sm text-purple-700 hover:text-purple-950 transition-colors"
          >
            Contact
          </Link>
          {status === 'authenticated' ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-sm text-purple-900 hover:text-purple-950 border border-purple-300 hover:border-purple-500 px-4 py-1.5 rounded-lg transition-all duration-150 bg-white/40"
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
