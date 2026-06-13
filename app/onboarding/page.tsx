'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * The onboarding flow is now rendered as a modal overlay (see
 * components/onboarding/OnboardingModal.tsx). This route exists only as a
 * compatibility redirect so old links / bookmarks / external tools that
 * point at `/onboarding` still land somewhere sensible — the modal will
 * automatically appear on top of /results for users who haven't completed it.
 */
export default function OnboardingRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/results')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-white to-purple-50">
      <svg className="animate-spin h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}
