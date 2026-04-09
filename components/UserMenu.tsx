'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function UserMenu() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (status !== 'authenticated' || !session?.user) return null

  const user = session.user
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div ref={menuRef} className="relative shrink-0">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group"
        aria-label="Account menu"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? 'User avatar'}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full ring-2 ring-gray-700 group-hover:ring-indigo-500 transition-all"
            unoptimized
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-600 ring-2 ring-gray-700 group-hover:ring-indigo-500 flex items-center justify-center text-xs font-bold text-white transition-all">
            {initials}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-60 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fade-in">
          {/* User info */}
          <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? ''}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              {user.name && (
                <p className="text-sm font-semibold text-gray-100 truncate">{user.name}</p>
              )}
              {user.email && (
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-900/50 px-2 py-0.5 rounded-full">
                Free plan
              </span>
            </div>

            <button
              onClick={() => { setOpen(false); router.push('/scripts') }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors text-left"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              My scripts
            </button>

            <div className="h-px bg-gray-800 mx-3 my-1" />

            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors text-left"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
