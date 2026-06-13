'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import OnboardingFlow from './OnboardingFlow'

/**
 * Paths where the onboarding modal should NOT appear. A curious new user
 * should still be able to read terms/privacy/pricing/contact without being
 * blocked by the funnel.
 */
const SUPPRESSED_PATHS = new Set<string>([
  '/pricing',
  '/pricing/success',
  '/privacy',
  '/terms',
  '/contact',
  '/reset-password',
])

function isSuppressed(path: string): boolean {
  if (SUPPRESSED_PATHS.has(path)) return true
  if (path.startsWith('/pricing/')) return true
  if (path.startsWith('/reset-password/')) return true
  return false
}

/**
 * Full-screen modal that overlays the current page whenever the signed-in
 * user hasn't completed onboarding. Renders via portal to escape any parent
 * CSS stacking context (matches the pattern used by VideoPreview and the
 * source-filter dropdown).
 *
 * Status is fetched once per email (per session) and cached in refs so we
 * don't hammer the API on every route change.
 */
export default function OnboardingModal() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  // Per-session memo so we only hit /api/onboarding/status once per login.
  const checkedForEmailRef = useRef<string | null>(null)

  // Portal-mount guard (SSR-safe rendering).
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch onboarding status when auth resolves.
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) {
      // Reset on sign-out so the next sign-in re-checks.
      checkedForEmailRef.current = null
      setNeedsOnboarding(false)
      return
    }

    const email = session.user.email
    if (checkedForEmailRef.current === email) return

    let cancelled = false
    fetch('/api/onboarding/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        checkedForEmailRef.current = email
        setNeedsOnboarding(!!data.needsOnboarding)
      })
      .catch(() => {
        // Network blip — fail open, never trap the user.
        checkedForEmailRef.current = email
        setNeedsOnboarding(false)
      })

    return () => {
      cancelled = true
    }
  }, [session, status])

  // Lock body scroll while the modal is visible.
  useEffect(() => {
    if (!mounted) return
    const shouldShow = needsOnboarding && !isSuppressed(pathname)
    if (shouldShow) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [mounted, needsOnboarding, pathname])

  if (!mounted) return null
  if (!needsOnboarding) return null
  if (isSuppressed(pathname)) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to ClipScout"
    >
      {/* Dimmed/blurred backdrop — lets the underlying /results page show
          through so it's clear this is an overlay, not a full page. */}
      <div className="absolute inset-0 bg-purple-950/50 backdrop-blur-sm" />

      {/* Modal card — centered, capped at a comfortable reading width.
          On mobile it fills the viewport almost edge-to-edge so survey
          options still have room to breathe. */}
      <div className="relative w-full max-w-lg h-[min(720px,92vh)] bg-white rounded-2xl shadow-2xl shadow-purple-950/30 overflow-hidden flex flex-col">
        <OnboardingFlow
          onComplete={() => {
            setNeedsOnboarding(false)
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
