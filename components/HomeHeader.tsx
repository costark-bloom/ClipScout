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
          <span className="text-sm font-semibold text-white tracking-tight">ClipScout</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5">
          <Link
            href="/contact"
            className="text-sm text-gray-200 hover:text-white transition-colors"
          >
            Contact
          </Link>
          {status === 'authenticated' ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-sm text-white hover:text-white border border-gray-600 hover:border-gray-400 px-4 py-1.5 rounded-lg transition-all duration-150"
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
