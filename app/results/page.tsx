'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useAppStore from '@/store/useAppStore'
import InteractiveScript from '@/components/InteractiveScript'
import SegmentCard from '@/components/SegmentCard'
import LoadingState from '@/components/LoadingState'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import AuthGate, { useAuthGate } from '@/components/AuthGate'
import UserMenu from '@/components/UserMenu'
import type { ScriptSegment } from '@/lib/types'

// Returns sorted unique chapter numbers from segments
function getChapters(segments: ScriptSegment[]): number[] {
  return [...new Set(segments.map((s) => s.chapter ?? 1))].sort((a, b) => a - b)
}

export default function ResultsPage() {
  const router = useRouter()
  const {
    script,
    segments,
    searchResults,
    activeSegmentId,
    isAnalyzing,
    chapterStatus,
    error,
    _hasHydrated,
    setActiveSegment,
    setChapterStatus,
    addSearchResults,
    addSegments,
    updateSegment,
    reset,
  } = useAppStore()

  const [loadingSegmentIds, setLoadingSegmentIds] = useState<Set<string>>(new Set())

  const scriptPanelRef = useRef<HTMLDivElement>(null)
  const [visibleChapters, setVisibleChapters] = useState<number[]>([])
  const { isAuthenticated, isLoading: authLoading } = useAuthGate()
  const [showGate, setShowGate] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState<'analyzing' | 'searching'>('analyzing')
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const allChapters = getChapters(segments)
  const totalClips = searchResults.reduce((sum, r) => sum + r.videos.length, 0)

  // Redirect home if there's no script — but wait for sessionStorage to rehydrate first
  useEffect(() => {
    if (!_hasHydrated) return
    if (!script && !isAnalyzing) router.replace('/')
  }, [_hasHydrated, script, isAnalyzing, router])

  // Auto-load chapter 1 as soon as segments are available
  useEffect(() => {
    if (segments.length === 0) return
    const chapter1 = allChapters[0]
    if (chapter1 === undefined) return
    if (chapterStatus[chapter1]) return // already loading or done
    loadChapter(chapter1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments])

  // Show auth gate once chapter 1 finishes loading (if not already authenticated)
  useEffect(() => {
    if (authLoading) return // wait for session to resolve
    const chapter1 = allChapters[0]
    if (!chapter1) return
    if (chapterStatus[chapter1] === 'done' && !isAuthenticated) {
      setShowGate(true)
    }
    if (isAuthenticated) setShowGate(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterStatus, isAuthenticated, authLoading])

  const chapter1 = allChapters[0]
  const chapter1Status = chapter1 !== undefined ? (chapterStatus[chapter1] ?? 'idle') : 'idle'
  const isLoading = isAnalyzing || (segments.length > 0 && chapter1Status !== 'done')

  // Drive progress bar: 0-50% while analyzing, 50-95% while searching, 100% when done
  useEffect(() => {
    if (progressRef.current) clearInterval(progressRef.current)

    if (isAnalyzing) {
      setLoadingStage('analyzing')
      setProgress((p) => Math.max(p, 0))
      progressRef.current = setInterval(() => {
        setProgress((p) => {
          const target = 48
          if (p >= target) return p
          return p + (target - p) * 0.05
        })
      }, 300)
    } else if (segments.length > 0 && chapter1Status !== 'done') {
      setLoadingStage('searching')
      setProgress(50)
      progressRef.current = setInterval(() => {
        setProgress((p) => {
          const target = 93
          if (p >= target) return p
          return p + (target - p) * 0.04
        })
      }, 300)
    } else if (chapter1Status === 'done') {
      setProgress(100)
    }

    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [isAnalyzing, segments.length, chapter1Status])

  // Track which chapters are visible in the UI
  useEffect(() => {
    if (segments.length === 0) return
    const firstChapter = allChapters[0]
    if (firstChapter !== undefined && !visibleChapters.includes(firstChapter)) {
      setVisibleChapters([firstChapter])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments])

  const loadChapter = useCallback(
    async (chapterNum: number) => {
      const chapterSegments = segments.filter((s) => (s.chapter ?? 1) === chapterNum)
      if (chapterSegments.length === 0) return

      setChapterStatus(chapterNum, 'loading')

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments: chapterSegments }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Search failed')
        }

        const { results } = await res.json()
        addSearchResults(results)
        setChapterStatus(chapterNum, 'done')
      } catch (err) {
        console.error(`Chapter ${chapterNum} search failed:`, err)
        setChapterStatus(chapterNum, 'idle') // allow retry
      }
    },
    [segments, setChapterStatus, addSearchResults]
  )

  const handleLoadNextChapter = (chapterNum: number) => {
    if (!visibleChapters.includes(chapterNum)) {
      setVisibleChapters((prev) => [...prev, chapterNum])
    }
    if (!chapterStatus[chapterNum] || chapterStatus[chapterNum] === 'idle') {
      loadChapter(chapterNum)
    }
  }

  const handleStartOver = () => {
    reset()
    router.push('/')
  }

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleSaveScript = async () => {
    if (saveState === 'saving' || saveState === 'saved') return
    setSaveState('saving')
    const title = script.split(/\s+/).slice(0, 8).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Untitled script'
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: script, segment_count: segments.length, segments, search_results: searchResults }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const handleAddSegment = useCallback(
    async (text: string, startIndex: number, endIndex: number) => {
      const id = `manual_${Date.now()}`

      // Determine which chapter this position belongs to
      const chapter = [...segments]
        .filter((s) => s.startIndex <= startIndex)
        .sort((a, b) => b.startIndex - a.startIndex)[0]?.chapter ?? 1

      const placeholder: ScriptSegment = {
        id,
        text,
        topic: 'Analyzing…',
        searchQueries: [text.slice(0, 80)],
        startIndex,
        endIndex,
        chapter,
      }

      addSegments([placeholder])
      setLoadingSegmentIds((prev) => new Set([...prev, id]))

      // Scroll to the new card once it mounts
      setTimeout(() => {
        document.getElementById(`segment-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)

      let topic = text.slice(0, 60)
      let searchQueries = [text.slice(0, 80)]

      try {
        // 1. Get AI-generated topic + search queries
        const analyzeRes = await fetch('/api/analyze-segment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (analyzeRes.ok) {
          const data = await analyzeRes.json()
          topic = data.topic ?? topic
          searchQueries = data.searchQueries ?? searchQueries
          updateSegment(id, { topic, searchQueries })
        }

        // 2. Search for videos
        const searchRes = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segments: [{ ...placeholder, topic, searchQueries }],
          }),
        })
        if (searchRes.ok) {
          const { results } = await searchRes.json()
          addSearchResults(results)
        }
      } finally {
        setLoadingSegmentIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [segments, addSegments, updateSegment, addSearchResults]
  )

  const handleSegmentIntersect = useCallback(
    (segmentId: string) => setActiveSegment(segmentId),
    [setActiveSegment]
  )

  const handlePillClick = (segmentId: string) => {
    setActiveSegment(segmentId)
    document.getElementById(`segment-card-${segmentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-red-900/50 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/50 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-100">Something went wrong</h2>
          <p className="text-sm text-gray-400">{error}</p>
          <button onClick={handleStartOver} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative">
      {/* Auth gate overlay */}
      {showGate && (
        <AuthGate onAuthenticated={() => setShowGate(false)} />
      )}

      {/* Page content — blurred when gate is showing */}
      <div className={showGate ? 'pointer-events-none select-none filter blur-sm brightness-50 transition-all duration-300' : 'transition-all duration-300'}>

      <DisclaimerBanner />

      {/* Mobile: chapter pill row */}
      {segments.length > 0 && (
        <div className="md:hidden bg-gray-900 border-b border-gray-800 px-4 py-2 overflow-x-auto">
          <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
            {segments.map((seg, i) => (
              <button
                key={seg.id}
                onClick={() => handlePillClick(seg.id)}
                className={[
                  'text-xs font-bold px-3 py-1.5 rounded-full transition-colors shrink-0',
                  activeSegmentId === seg.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200',
                ].join(' ')}
              >
                B{i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 40px)' }}>
        {/* LEFT PANEL */}
        <div className="hidden md:flex flex-col w-[30%] min-w-[280px] max-w-sm border-r border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">Your script</span>
              <button onClick={handleStartOver} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">Start over</button>
            </div>
            {segments.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-300">
                  {segments.length} segments · {allChapters.length} chapter{allChapters.length !== 1 ? 's' : ''}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-slow" />
              </div>
            )}
          </div>

          <div ref={scriptPanelRef} className="flex-1 overflow-y-auto px-5 py-4">
            {script ? (
              <InteractiveScript
                script={script}
                segments={segments}
                containerRef={scriptPanelRef}
                onAddSegment={handleAddSegment}
              />
            ) : (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-800 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                ))}
              </div>
            )}
          </div>

          {segments.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-800 shrink-0 space-y-1.5">
              <p className="text-[10px] text-gray-700 leading-relaxed">
                <span className="inline-block border-b-2 border-indigo-600/50 text-gray-500 mr-1">Underlined text</span>
                = B-roll segment. Click to jump to clips.
              </p>
              <p className="text-[10px] text-gray-700 leading-relaxed">
                Highlight any other text to add a custom segment.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-200">
                  {isAnalyzing
                    ? 'Analyzing script…'
                    : isLoading
                    ? 'Finding footage…'
                    : segments.length > 0
                    ? `${segments.length} segments · ${allChapters.length} chapters · ${totalClips} clips loaded`
                    : 'ClipScout'}
                </p>
                {isLoading && (
                  <p className="text-[10px] text-gray-600">
                    {isAnalyzing ? 'AI is reading your script…' : 'Searching YouTube, Pexels & Pixabay…'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <button
                  onClick={handleSaveScript}
                  disabled={saveState === 'saving' || saveState === 'saved'}
                  className="hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 disabled:opacity-60
                    border-indigo-800 text-indigo-400 hover:bg-indigo-900/30 hover:text-indigo-300"
                >
                  {saveState === 'saving' && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {saveState === 'saved' && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                  {saveState === 'error' && (
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  )}
                  {saveState === 'idle' && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                    </svg>
                  )}
                  {saveState === 'saved' ? 'Saved!' : saveState === 'error' ? 'Error' : 'Save script'}
                </button>
              )}
              <button
                onClick={handleStartOver}
                className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-3 py-1.5 rounded-lg transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                Start over
              </button>
              <Link
                href="/contact"
                className="hidden md:block text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Feedback
              </Link>
              <UserMenu />
            </div>
          </div>

          {/* Loading overlay — stays until chapter 1 videos are ready */}
          {isLoading && (
            <div className="flex-1 overflow-y-auto">
              <LoadingState stage={loadingStage} progress={progress} segmentCount={segments.length} />
            </div>
          )}

          {/* Chapter-by-chapter results */}
          {!isLoading && segments.length > 0 && (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10">
              {allChapters.map((chapterNum, chapterIdx) => {
                const chapterSegments = segments.filter((s) => (s.chapter ?? 1) === chapterNum)
                const isVisible = visibleChapters.includes(chapterNum)
                const status = chapterStatus[chapterNum] ?? 'idle'
                const nextChapter = allChapters[chapterIdx + 1]
                const isLastChapter = chapterIdx === allChapters.length - 1
                const prevChapterDone = chapterIdx === 0 || chapterStatus[allChapters[chapterIdx - 1]] === 'done'

                return (
                  <div key={chapterNum}>
                    {/* Chapter header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                          Chapter {chapterNum}
                        </span>
                        {status === 'done' && (
                          <span className="text-[9px] bg-indigo-950/60 text-indigo-400 border border-indigo-900/50 px-1.5 py-0.5 rounded-full">
                            {chapterSegments.length} segments · {searchResults.filter(r => chapterSegments.some(s => s.id === r.segmentId)).reduce((sum, r) => sum + r.videos.length, 0)} clips
                          </span>
                        )}
                      </div>
                      <div className="flex-1 h-px bg-gray-800" />
                    </div>

                    {/* Chapter content */}
                    {isVisible && (status === 'loading' || status === 'done' || status === 'idle') ? (
                      <div className="space-y-5">
                        {chapterSegments.map((segment) => {
                          const segIndex = segments.findIndex(s => s.id === segment.id)
                          const result = searchResults.find((r) => r.segmentId === segment.id)
                          const isManualLoading = loadingSegmentIds.has(segment.id)

                          return (status === 'loading' && !result) || isManualLoading ? (
                            // Per-segment skeleton while loading
                            <div key={segment.id} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 space-y-3 animate-pulse">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-gray-800" />
                                <div className="h-4 bg-gray-800 rounded w-40" />
                              </div>
                              <div className="h-3 bg-gray-800 rounded w-full" />
                              <div className="h-3 bg-gray-800 rounded w-3/4" />
                              <div className="flex gap-3">
                                {[1, 2, 3].map(j => <div key={j} className="w-52 h-28 rounded-xl bg-gray-800 shrink-0" />)}
                              </div>
                            </div>
                          ) : (
                            <SegmentCard
                              key={segment.id}
                              segment={segment}
                              segmentNumber={segIndex + 1}
                              videos={result?.videos ?? []}
                              onIntersect={handleSegmentIntersect}
                            />
                          )
                        })}
                      </div>
                    ) : !isVisible ? (
                      // Chapter not yet revealed
                      <div className="rounded-2xl border border-dashed border-gray-800 p-6 text-center text-gray-600 text-sm">
                        {chapterSegments.length} segment{chapterSegments.length !== 1 ? 's' : ''} waiting…
                      </div>
                    ) : null}

                    {/* Next chapter button — shown at bottom of each chapter when it's done */}
                    {status === 'done' && !isLastChapter && nextChapter && (
                      <div className="mt-8 flex justify-center">
                        {chapterStatus[nextChapter] === 'loading' ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading Chapter {nextChapter}…
                          </div>
                        ) : chapterStatus[nextChapter] === 'done' ? null : (
                          <button
                            onClick={() => handleLoadNextChapter(nextChapter)}
                            className="group flex items-center gap-2.5 bg-gray-900 hover:bg-indigo-950/60 border border-gray-700 hover:border-indigo-500/60 text-gray-300 hover:text-indigo-200 font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm"
                          >
                            <span>Load Chapter {nextChapter}</span>
                            <span className="text-gray-600 group-hover:text-indigo-400 text-xs">
                              {segments.filter(s => (s.chapter ?? 1) === nextChapter).length} segments
                            </span>
                            <svg className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="h-16" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && segments.length === 0 && script && (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="space-y-3">
                <p className="text-sm text-gray-500">No visual segments were identified in your script.</p>
                <p className="text-xs text-gray-600">Try a script with more descriptive visual content.</p>
                <button onClick={handleStartOver} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                  Try a different script →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div> {/* end blur wrapper */}
    </div>
  )
}
