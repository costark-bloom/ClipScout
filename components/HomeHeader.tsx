'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import UserMenu from '@/components/UserMenu'
import AuthGate from '@/components/AuthGate'

export default function HomeHeader() {
  const { status } = useSession()
  const pathname = usePathname()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-purple-200 bg-white/30 backdrop-blur-sm relative z-50">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="ClipScout" className="w-7 h-7" />
          <span className="text-base font-bold text-purple-950 tracking-tight">ClipScout</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-5">
          <Link
            href="/pricing"
            className={`text-sm font-semibold transition-colors pb-0.5 ${
              pathname === '/pricing'
                ? 'text-purple-950 border-b-2 border-purple-600'
                : 'text-purple-700 hover:text-purple-950'
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/contact"
            className={`text-sm font-semibold transition-colors pb-0.5 ${
              pathname === '/contact'
                ? 'text-purple-950 border-b-2 border-purple-600'
                : 'text-purple-700 hover:text-purple-950'
            }`}
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
