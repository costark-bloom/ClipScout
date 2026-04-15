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
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-purple-200 bg-white/30 backdrop-blur-sm relative z-50">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={() => setMenuOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="ClipScout" className="w-7 h-7" />
          <span className="text-base font-bold text-purple-950 tracking-tight">ClipScout</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-semibold transition-colors pb-0.5 ${
                pathname === href
                  ? 'text-purple-950 border-b-2 border-purple-600'
                  : 'text-purple-700 hover:text-purple-950'
              }`}
            >
              {label}
            </Link>
          ))}
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

        {/* Mobile right side */}
        <div className="flex md:hidden items-center gap-3">
          {status === 'authenticated' && <UserMenu />}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="p-2 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-b border-purple-200 bg-white/70 backdrop-blur-sm z-40 relative">
          <nav className="flex flex-col px-6 py-3 gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-semibold py-2.5 border-b border-purple-100 last:border-0 transition-colors ${
                  pathname === href ? 'text-purple-950' : 'text-purple-700'
                }`}
              >
                {label}
              </Link>
            ))}
            {status !== 'authenticated' && (
              <button
                onClick={() => { setMenuOpen(false); setShowAuth(true) }}
                className="text-sm font-semibold text-purple-700 py-2.5 text-left"
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
      )}

      {showAuth && (
        <AuthGate onAuthenticated={() => setShowAuth(false)} />
      )}
    </>
  )
}
