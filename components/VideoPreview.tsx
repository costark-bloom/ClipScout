'use client'

import { useEffect, useRef } from 'react'
import type { VideoResult } from '@/lib/types'

interface VideoPreviewProps {
  video: VideoResult
  onClose: () => void
}

const PLATFORM_COLORS = {
  youtube: 'bg-red-600',
  pexels: 'bg-green-600',
  pixabay: 'bg-blue-600',
}

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  pexels: 'Pexels',
  pixabay: 'Pixabay',
}

export default function VideoPreview({ video, onClose }: VideoPreviewProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4"
    >
      <div className="relative w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${PLATFORM_COLORS[video.platform]} text-white shrink-0`}
            >
              {PLATFORM_LABELS[video.platform]}
            </span>
            <h3 className="text-sm font-medium text-gray-200 truncate">{video.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <a
              href={video.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              View source
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-200 transition-colors"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video player */}
        <div className="relative aspect-video bg-black">
          {(video.platform === 'youtube' || video.platform === 'pexels') && video.embedUrl ? (
            <iframe
              src={
                video.platform === 'youtube'
                  ? `${video.embedUrl}?autoplay=1&mute=1&rel=0&modestbranding=1&start=${video.startTimestamp ?? 0}`
                  : `${video.embedUrl}?autoplay=1&muted=1`
              }
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : video.platform === 'pixabay' && video.embedUrl ? (
            <video
              src={`${video.embedUrl}#t=${video.startTimestamp ?? 0}`}
              className="w-full h-full object-contain"
              controls
              autoPlay
              muted
              playsInline
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <p className="text-sm">Preview not available — view the original source</p>
            </div>
          )}
        </div>

        {/* Footer meta */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500 space-y-0.5">
            {video.channelOrAuthor && <p>By {video.channelOrAuthor}</p>}
            {video.duration && <p>Duration: {video.duration}</p>}
            {video.startTimestamp != null && video.startTimestamp > 0 && (
              <p className="text-indigo-400">
                Starting at {Math.floor(video.startTimestamp / 60)}:{String(video.startTimestamp % 60).padStart(2, '0')} — best matched chapter
              </p>
            )}
          </div>
          <p className="text-[10px] text-gray-600 max-w-xs text-right">
            Preview only. Verify licensing before use.
          </p>
        </div>
      </div>
    </div>
  )
}
