'use client'

import { useState, useEffect } from 'react'

const SESSION_KEY = 'clipscout_disclaimer_dismissed'

export default function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    setDismissed(sessionStorage.getItem(SESSION_KEY) === '1')
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="relative bg-amber-50/80 border border-amber-300 text-amber-800 px-4 py-2.5 text-xs flex items-start gap-3">
      <svg
        className="w-4 h-4 mt-0.5 shrink-0 text-amber-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <span className="flex-1">
        <strong className="font-semibold text-amber-700">Copyright notice:</strong> ClipScout
        discovers and previews publicly available video content. It does not download or host any
        videos. Verifying licensing terms and obtaining proper rights before using footage in your
        projects is your responsibility. YouTube content is subject to YouTube&apos;s Terms of
        Service. Pexels and Pixabay videos are generally royalty-free — check individual licenses.
      </span>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors ml-2"
        aria-label="Dismiss disclaimer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
