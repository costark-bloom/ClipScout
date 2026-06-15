'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import HomeHeader from '@/components/HomeHeader'
import { trackEvent } from '@/lib/analytics'

interface VerifyResult {
  isTrial?: boolean
  trialEndsAt?: string | null
}

function formatTrialEnd(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

/**
 * Detects whether the user had a search in-flight when they were sent through
 * the trial flow. We look at the persisted Zustand snapshot in sessionStorage
 * (not the live hook — this runs in a useEffect, no hydration to wait for).
 *
 * The script and segments are persisted by useAppStore's `persist` middleware,
 * and sessionStorage survives the Stripe round-trip (same tab, same origin).
 * If both are present, the user was mid-search before the auth/trial gate —
 * we should route them back to /results, not /, so they don't have to retype.
 */
function detectPendingSearch(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = sessionStorage.getItem('clipscout-session')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const state = parsed?.state ?? {}
    const hasScript = typeof state.script === 'string' && state.script.trim().length > 0
    const hasSegments = Array.isArray(state.segments) && state.segments.length > 0
    return hasScript && hasSegments
  } catch {
    return false
  }
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>('verifying')
  const [result, setResult] = useState<VerifyResult>({})
  // Detected once on mount. We don't re-check on every render because the
  // user might click "Continue" → /results between renders and we'd lose it.
  const [hasPendingSearch, setHasPendingSearch] = useState(false)

  useEffect(() => {
    setHasPendingSearch(detectPendingSearch())
  }, [])

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
          setResult({ isTrial: d.isTrial, trialEndsAt: d.trialEndsAt })
          setStatus('done')
          // Tell the layout-mounted OnboardingModal to drop its cached
          // `needsOnboarding=true` state. Without this, navigating back to
          // /results would re-trigger the trial-offer modal even though the
          // user just paid (the modal otherwise only refetches status once
          // per session in checkedForEmailRef).
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('clipscout:onboarding-completed'))
          }
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
        <h1 className="text-2xl font-extrabold text-purple-950 mb-2">Setting things up…</h1>
        <p className="text-purple-500 text-sm">Just a moment while we activate your account.</p>
      </>
    )
  }

  const isTrial = !!result.isTrial
  const trialEndStr = formatTrialEnd(result.trialEndsAt ?? null)

  return (
    <>
      <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>

      {isTrial ? (
        <>
          <h1 className="text-3xl font-extrabold text-purple-950 mb-3">Your free trial has started</h1>
          <p className="text-purple-600 text-base leading-relaxed mb-2">
            You&apos;ve got <span className="font-semibold text-purple-950">75 credits</span> ready to use and full access
            to every ClipScout feature.
          </p>
          {trialEndStr && (
            <p className="text-purple-600 text-sm mb-8">
              Your trial ends on <span className="font-semibold text-purple-950">{trialEndStr}</span>.
            </p>
          )}
          {!trialEndStr && <div className="mb-8" />}
        </>
      ) : (
        <>
          <h1 className="text-3xl font-extrabold text-purple-950 mb-3">You&apos;re all set!</h1>
          <p className="text-purple-600 text-base leading-relaxed mb-8">
            Your subscription is active. Your credits are ready to use — start finding b-roll for your next script.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {hasPendingSearch ? (
          <>
            <Link
              href="/results"
              onClick={() => trackEvent('Trial Success — Continue Search Clicked')}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Continue your search →
            </Link>
            <Link
              href="/"
              onClick={() => trackEvent('Trial Success — New Search Clicked')}
              className="w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-700 font-semibold px-6 py-3 rounded-xl border border-purple-200 hover:border-purple-400 transition-all text-sm"
            >
              Start a new search
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/"
              onClick={() => trackEvent('Trial Success — Find B-Roll Clicked')}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Find b-roll now
            </Link>
            <Link
              href="/scripts"
              onClick={() => trackEvent('Trial Success — My Scripts Clicked')}
              className="w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-700 font-semibold px-6 py-3 rounded-xl border border-purple-200 hover:border-purple-400 transition-all text-sm"
            >
              My scripts
            </Link>
          </>
        )}
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
