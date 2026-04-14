'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  creator: { label: 'Creator',  color: 'text-purple-600 bg-purple-100 border-purple-200' },
  pro:     { label: 'Pro',      color: 'text-indigo-600 bg-indigo-100 border-indigo-200' },
  agency:  { label: 'Agency',   color: 'text-blue-600 bg-blue-100 border-blue-200' },
}

export default function UserMenu() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [planLabel, setPlanLabel] = useState<{ label: string; color: string } | null>(null)

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

  // Fetch current subscription plan whenever the dropdown opens
  useEffect(() => {
    if (!open || status !== 'authenticated') return
    fetch('/api/user/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.subscription_plan && d.subscription_status === 'active') {
          setPlanLabel(PLAN_LABELS[d.subscription_plan] ?? null)
        } else {
          setPlanLabel(null) // free trial
        }
      })
      .catch(() => {})
  }, [open, status])

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
        className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 group"
        aria-label="Account menu"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? 'User avatar'}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full ring-2 ring-purple-300 group-hover:ring-purple-500 transition-all"
            unoptimized
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-600 ring-2 ring-purple-300 group-hover:ring-purple-500 flex items-center justify-center text-xs font-bold text-white transition-all">
            {initials}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-60 bg-white/95 backdrop-blur-sm border border-purple-200 rounded-xl shadow-xl shadow-purple-200/40 overflow-hidden z-50 animate-fade-in">
          {/* User info */}
          <div className="px-4 py-4 border-b border-purple-100 flex items-center gap-3">
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
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              {user.name && (
                <p className="text-sm font-semibold text-purple-950 truncate">{user.name}</p>
              )}
              {user.email && (
                <p className="text-xs text-purple-500 truncate">{user.email}</p>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <div className="px-4 py-2 flex items-center gap-2">
              {planLabel ? (
                <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border ${planLabel.color}`}>
                  {planLabel.label} plan
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-600 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                  Free plan
                </span>
              )}
            </div>

            <button
              onClick={() => { setOpen(false); router.push('/scripts') }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-700 hover:text-purple-950 hover:bg-purple-50 transition-colors text-left"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              My scripts
            </button>

            <button
              onClick={() => { setOpen(false); router.push('/settings') }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-700 hover:text-purple-950 hover:bg-purple-50 transition-colors text-left"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Settings
            </button>

            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-700 hover:text-purple-950 hover:bg-purple-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              Contact
            </Link>

            <div className="h-px bg-purple-100 mx-3 my-1" />

            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors text-left"
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
