'use client'

import { useEffect, useRef } from 'react'
import type { ScriptSegment, VideoResult } from '@/lib/types'
import useAppStore from '@/store/useAppStore'
import VideoCard from './VideoCard'

interface SegmentCardProps {
  segment: ScriptSegment
  segmentNumber: number
  videos: VideoResult[]
  onIntersect: (segmentId: string) => void
}

export default function SegmentCard({
  segment,
  segmentNumber,
  videos,
  onIntersect,
}: SegmentCardProps) {
  const { activeSegmentId, setActiveSegment } = useAppStore()
  const isActive = activeSegmentId === segment.id
  const cardRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // IntersectionObserver for bidirectional sync
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
              onIntersect(segment.id)
            }, 100)
          }
        })
      },
      { threshold: 0.4 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [segment.id, onIntersect])

  const handleQuoteClick = () => {
    setActiveSegment(segment.id)
    // Scroll the script span into view (InteractiveScript handles this via useEffect)
  }

  return (
    <div
      id={`segment-card-${segment.id}`}
      ref={cardRef}
      style={{ scrollMarginTop: '80px' }}
      className={[
        'rounded-2xl border transition-all duration-300 overflow-hidden',
        isActive
          ? 'border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-950/20'
          : 'border-gray-800 bg-gray-900/50',
      ].join(' ')}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div
          className={[
            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
            isActive ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400',
          ].join(' ')}
        >
          B{segmentNumber}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-200 truncate">{segment.topic}</h3>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {videos.length} clip{videos.length !== 1 ? 's' : ''} found ·{' '}
            {segment.searchQueries.length} search queries
          </p>
        </div>
        {isActive && (
          <span className="ml-auto shrink-0 text-[10px] font-medium text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
      </div>

      {/* Script quote */}
      <blockquote
        onClick={handleQuoteClick}
        className="mx-5 mb-4 pl-3 border-l-2 border-gray-700 hover:border-indigo-500 cursor-pointer transition-colors duration-200 group"
        title="Click to highlight in script"
      >
        <p className="text-xs leading-6 text-gray-400 group-hover:text-gray-300 italic line-clamp-3 transition-colors">
          &ldquo;{segment.text}&rdquo;
        </p>
      </blockquote>

      {/* Search queries pills */}
      <div className="px-5 mb-4 flex flex-wrap gap-1.5">
        {segment.searchQueries.map((q, i) => (
          <span key={i} className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
            {q}
          </span>
        ))}
      </div>

      {/* Video results horizontal scroll */}
      {videos.length > 0 ? (
        <div className="px-5 pb-5 overflow-x-auto">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-5 mb-5 rounded-xl bg-gray-800/50 border border-gray-800 px-4 py-6 text-center">
          <svg
            className="w-8 h-8 text-gray-700 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <p className="text-xs text-gray-600">No clips found for this segment.</p>
          <p className="text-[10px] text-gray-700 mt-1">Try adjusting the search queries above.</p>
        </div>
      )}
    </div>
  )
}
