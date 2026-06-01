'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** YouTube watch URL — will be pre-populated in ytdownloader.io */
  youtubeUrl: string
  videoTitle: string
  /** Called when the user cancels (Cancel button, Esc, backdrop click).
   *  `dontShowAgain` reflects the checkbox state at the moment of cancel. */
  onClose: (dontShowAgain: boolean) => void
  /** Called when user confirms. `dontShowAgain` indicates if they ticked the
   *  suppression checkbox — parent should persist that preference. */
  onContinue: (dontShowAgain: boolean) => void
}

const DOWNLOADER_BASE = 'https://ytdownloader.io/'
// YouTube's own page explaining fair use — the most authoritative source for
// what counts as transformative use of someone else's video on YouTube.
const FAIR_USE_DOCS_URL = 'https://www.youtube.com/howyoutubeworks/policies/copyright/fair-use/'

// localStorage key — versioned (v1) so if we ever materially change the modal
// copy we can re-prompt users by bumping the version.
export const SKIP_YT_WARNING_KEY = 'clipscout_skip_yt_warning_v1'

export function buildYtDownloaderUrl(youtubeUrl: string): string {
  return `${DOWNLOADER_BASE}?url=${encodeURIComponent(youtubeUrl)}`
}

/** Read the saved preference. SSR-safe. */
export function shouldSkipYtWarning(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SKIP_YT_WARNING_KEY) === '1'
  } catch {
    return false
  }
}

/** Persist (or clear) the suppression preference. */
export function setSkipYtWarning(skip: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (skip) {
      window.localStorage.setItem(SKIP_YT_WARNING_KEY, '1')
    } else {
      window.localStorage.removeItem(SKIP_YT_WARNING_KEY)
    }
  } catch {
    // localStorage can throw in private mode / quota-exceeded — silently ignore
  }
}

export default function YouTubeDownloadWarningModal({
  youtubeUrl,
  videoTitle,
  onClose,
  onContinue,
}: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  // Portal-mount flag: we can't call createPortal until after hydration since
  // `document` is undefined on the server. Without the portal the modal renders
  // inside the VideoCard, which has `backdrop-blur` and traps `position: fixed`.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Esc — keeps keyboard UX consistent with other modals.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(dontShowAgain)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, dontShowAgain])

  if (!mounted) return null

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="yt-download-warning-title">
      <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm" onClick={() => onClose(dontShowAgain)} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-purple-300/30 border border-purple-100 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />

        <div className="p-7">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>

          <h2 id="yt-download-warning-title" className="text-xl font-extrabold text-purple-950 text-center mb-2">
            This video is copyrighted
          </h2>

          <p className="text-sm text-purple-700 text-center leading-relaxed mb-4">
            <span className="font-medium text-purple-900">&ldquo;{videoTitle}&rdquo;</span> belongs to its YouTube creator. Before downloading and using this clip in your own content, you should either:
          </p>

          <ul className="text-sm text-purple-700 space-y-2 mb-5 bg-purple-50/60 border border-purple-100 rounded-xl p-4">
            <li className="flex gap-2">
              <span className="text-purple-500 font-semibold shrink-0">1.</span>
              <span>Get the creator&rsquo;s <strong className="text-purple-900">explicit permission</strong> to use the clip, or</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-500 font-semibold shrink-0">2.</span>
              <span><strong className="text-purple-900">Transform the original enough</strong> to qualify as fair use — e.g. commentary, criticism, parody, education, or substantial editing/remixing.</span>
            </li>
          </ul>

          <p className="text-xs text-purple-500 text-center leading-relaxed mb-4">
            Using copyrighted footage without doing one of the above can result in a copyright claim, demonetization, or strike on your channel.{' '}
            <a
              href={FAIR_USE_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 underline hover:text-purple-900 font-medium"
            >
              Learn about fair use on YouTube
            </a>
          </p>

          <p className="text-[11px] text-purple-400 text-center leading-relaxed mb-4 px-2">
            ClipScout doesn&rsquo;t host, store, or download this video — we just surface publicly available results. You are solely responsible for how you use this content and for complying with all applicable copyright laws.
          </p>

          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-400 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs text-purple-600 group-hover:text-purple-800 transition-colors">
              Don&rsquo;t show this warning again for protected YouTube videos
            </span>
          </label>

          <div className="flex gap-2.5">
            <button
              onClick={() => onClose(dontShowAgain)}
              className="flex-1 bg-white hover:bg-purple-50 text-purple-700 font-semibold py-2.5 rounded-xl border border-purple-200 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => onContinue(dontShowAgain)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-1.5"
            >
              Continue
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </button>
          </div>
          {/* Hidden hint: where the user is being sent */}
          <p className="text-[10px] text-purple-400 text-center mt-3">
            Opens ytdownloader.io in a new tab with the link pre-filled.
          </p>
          {/* Reference to avoid unused-var lint if downstream code never reads youtubeUrl directly */}
          <span className="sr-only">{youtubeUrl}</span>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
