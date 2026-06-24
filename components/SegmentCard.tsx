'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { ScriptSegment, VideoResult } from '@/lib/types'
import { ALL_VIDEO_SOURCES } from '@/lib/types'
import useAppStore from '@/store/useAppStore'
import VideoCard from './VideoCard'
import { trackEvent } from '@/lib/analytics'

interface SegmentCardProps {
  segment: ScriptSegment
  segmentNumber: number
  videos: VideoResult[]
  /** Number of clips for this segment that were hidden by the active source filter. */
  hiddenBySourceFilter?: number
  onIntersect: (segmentId: string) => void
  onInsufficientCredits?: () => void
  /** Fired when /api/search/more rejects with SUBSCRIPTION_INACTIVE (past_due,
   *  canceled, etc.). The status string lets the parent pick the right copy. */
  onSubscriptionInactive?: (status: string) => void
}

type LoadMoreState = 'idle' | 'loading' | 'done' | 'error'

export default function SegmentCard({
  segment,
  segmentNumber,
  videos,
  hiddenBySourceFilter = 0,
  onIntersect,
  onInsufficientCredits,
  onSubscriptionInactive,
}: SegmentCardProps) {
  const { activeSegmentId, setActiveSegment, appendVideosToSegment, videoOrientation, enabledSources, setEnabledSources } = useAppStore()
  const { status: authStatus } = useSession()
  const isActive = activeSegmentId === segment.id
  const cardRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [loadMoreState, setLoadMoreState] = useState<LoadMoreState>('idle')
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  // Snapshot of how many videos existed before the last "load more" so we can split into rows
  const originalCountRef = useRef<number>(videos.length)

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
  }

  const handleLoadMore = async () => {
    if (loadMoreState === 'loading') return

    trackEvent('Load More Clicked', { segment_topic: segment.topic, segment_text: segment.text.slice(0, 120) })

    originalCountRef.current = videos.length
    setLoadMoreState('loading')
    setLoadMoreError(null)

    try {
      const res = await fetch('/api/search/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment,
          orientation: videoOrientation,
          enabledSources,
          excludeUrls: videos.map((v) => v.sourceUrl),
        }),
      })

      if (res.status === 401) {
        setLoadMoreState('idle')
        return
      }

      if (res.status === 402) {
        setLoadMoreState('idle')
        const errBody = await res.json().catch(() => ({}))
        if (errBody.error === 'SUBSCRIPTION_INACTIVE') {
          onSubscriptionInactive?.(
            typeof errBody.status === 'string' ? errBody.status : 'past_due',
          )
        } else {
          onInsufficientCredits?.()
        }
        return
      }

      if (!res.ok) {
        throw new Error('Search failed')
      }

      const { videos: moreVideos } = await res.json()

      if (!moreVideos || moreVideos.length === 0) {
        setLoadMoreState('done')
        return
      }

      appendVideosToSegment(segment.id, moreVideos)
      setLoadMoreState('done')
    } catch (err) {
      console.error('[load more]', err)
      setLoadMoreError('Failed to load more. Try again.')
      setLoadMoreState('error')
    }
  }

  const isAuthenticated = authStatus === 'authenticated'

  return (
    <div
      id={`segment-card-${segment.id}`}
      ref={cardRef}
      style={{ scrollMarginTop: '80px' }}
      className={[
        'rounded-2xl border transition-all duration-300 overflow-hidden',
        isActive
          ? 'border-purple-400 bg-white/90 shadow-lg shadow-purple-200/60'
          : 'border-purple-200 bg-white/80',
      ].join(' ')}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div
          className={[
            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
            isActive ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600',
          ].join(' ')}
        >
          B{segmentNumber}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-purple-950 truncate">{segment.topic}</h3>
          <p className="text-[10px] text-purple-500 mt-0.5">
            {videos.length} clip{videos.length !== 1 ? 's' : ''} found ·{' '}
            {segment.searchQueries.length} search queries
          </p>
        </div>

        {/* Load more button — top-right of header */}
        <div className="ml-auto shrink-0 flex items-center gap-2">
          {isActive && (
            <span className="text-[10px] font-medium text-purple-600 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
          {loadMoreState === 'done' ? (
            <span className="text-[10px] text-purple-500 font-medium">✓ Loaded</span>
          ) : loadMoreState === 'error' ? (
            <button
              onClick={isAuthenticated ? handleLoadMore : onInsufficientCredits}
              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Retry
            </button>
          ) : (
            <button
              onClick={isAuthenticated ? handleLoadMore : onInsufficientCredits}
              disabled={loadMoreState === 'loading'}
              className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-300 disabled:cursor-not-allowed text-white transition-colors"
            >
              {loadMoreState === 'loading' ? (
                <>
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading…
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Load more
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Script quote */}
      <blockquote
        onClick={handleQuoteClick}
        className="mx-5 mb-4 pl-3 border-l-2 border-purple-300 hover:border-purple-500 cursor-pointer transition-colors duration-200 group"
        title="Click to highlight in script"
      >
        <p className="text-xs leading-6 text-purple-700 group-hover:text-purple-950 italic line-clamp-3 transition-colors">
          &ldquo;{segment.text}&rdquo;
        </p>
      </blockquote>

      {/* Search queries pills */}
      <div className="px-5 mb-4 flex flex-wrap gap-1.5">
        {segment.searchQueries.map((q, i) => (
          <span key={i} className="text-[10px] bg-purple-100 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full">
            {q}
          </span>
        ))}
      </div>

      {/* Source-filter notice: clips were loaded but the active filter hides them. */}
      {hiddenBySourceFilter > 0 && (
        <div className="mx-5 mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h13.5m-13.5 6h13.5m-13.5 6h9M18 9l3 3-3 3" />
          </svg>
          <p className="text-[11px] text-amber-800 flex-1">
            {hiddenBySourceFilter} clip{hiddenBySourceFilter !== 1 ? 's' : ''} hidden by your source filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setEnabledSources([...ALL_VIDEO_SOURCES])
              trackEvent('Source Filter Changed', {
                context: 'Results — Segment Notice',
                source: 'all',
                enabled: true,
                enabled_sources_after: ALL_VIDEO_SOURCES.join(','),
                enabled_sources_count: ALL_VIDEO_SOURCES.length,
              })
            }}
            className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0"
          >
            Show all
          </button>
        </div>
      )}

      {/* Video results — original row */}
      {videos.length > 0 ? (
        <div className="space-y-4">
          <div className="px-5 overflow-x-auto">
            <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
              {videos.slice(0, originalCountRef.current).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>

          {/* More videos row — only shown after a successful load more */}
          {loadMoreState === 'done' && videos.length > originalCountRef.current && (
            <div className="px-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-500">More clips</span>
                <div className="flex-1 h-px bg-purple-100" />
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {videos.slice(originalCountRef.current).map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mx-5 rounded-xl bg-purple-50/60 border border-purple-200 px-4 py-6 text-center">
          <svg
            className="w-8 h-8 text-purple-300 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <p className="text-xs text-purple-600">No clips found for this segment.</p>
          <p className="text-[10px] text-purple-400 mt-1">Try adjusting the search queries above.</p>
        </div>
      )}

      {/* bottom padding */}
      <div className="pb-5" />
    </div>
  )
}
