'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import HomeHeader from '@/components/HomeHeader'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>('verifying')

  useEffect(() => {
    if (!sessionId) { setStatus('done'); return }

    fetch('/api/stripe/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          console.error('[success] verify error:', d.error)
          setStatus('error')
        } else {
          setStatus('done')
        }
      })
      .catch(() => setStatus('error'))
  }, [sessionId])

  if (status === 'verifying') {
    return (
      <>
        <div className="w-20 h-20 rounded-full bg-purple-100 border-2 border-purple-200 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <svg className="w-8 h-8 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-purple-950 mb-2">Activating your plan…</h1>
        <p className="text-purple-500 text-sm">Just a moment while we set up your account.</p>
      </>
    )
  }

  return (
    <>
      <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>

      <h1 className="text-3xl font-extrabold text-purple-950 mb-3">You&apos;re all set!</h1>
      <p className="text-purple-600 text-base leading-relaxed mb-8">
        Your subscription is active. Your credits are ready to use — start finding b-roll for your next script.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          Find b-roll now
        </Link>
        <Link
          href="/scripts"
          className="w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-700 font-semibold px-6 py-3 rounded-xl border border-purple-200 hover:border-purple-400 transition-all text-sm"
        >
          My scripts
        </Link>
      </div>
    </>
  )
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <HomeHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-md">
          <Suspense fallback={
            <div className="w-20 h-20 rounded-full bg-purple-100 border-2 border-purple-200 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-8 h-8 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          }>
            <SuccessContent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
