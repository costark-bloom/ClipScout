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
import UpgradeModal from '@/components/UpgradeModal'
import type { ScriptSegment } from '@/lib/types'
import { trackEvent } from '@/lib/analytics'

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
    showUpgradeModal,
    setShowUpgradeModal,
    _hasHydrated,
    setActiveSegment,
    setChapterStatus,
    addSearchResults,
    addSegments,
    updateSegment,
    reset,
    scriptChunkOffsets,
    scriptChunkCount,
    savedScriptContext,
    setSavedScriptContext,
    videoOrientation,
  } = useAppStore()

  const [loadingSegmentIds, setLoadingSegmentIds] = useState<Set<string>>(new Set())
  const [loadingChapterInScript, setLoadingChapterInScript] = useState<number | null>(null)
  const [showLoadChapterHint, setShowLoadChapterHint] = useState(false)
  const [scriptDrawerOpen, setScriptDrawerOpen] = useState(false)
  // Track if the user has a paid plan (for upgrade modal messaging)
  const [isFreeTrial, setIsFreeTrial] = useState(true)

  const scriptPanelRef = useRef<HTMLDivElement>(null)
  const videoPanelRef = useRef<HTMLDivElement>(null)
  const [pendingScrollSegmentId, setPendingScrollSegmentId] = useState<string | null>(null)
  const [visibleChapters, setVisibleChapters] = useState<number[]>([])
  const { isAuthenticated, isLoading: authLoading } = useAuthGate()
  const [showGate, setShowGate] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState<'analyzing' | 'searching'>('analyzing')
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const allChapters = getChapters(segments)
  const totalClips = searchResults.reduce((sum, r) => sum + r.videos.length, 0)

  // Scroll the video panel to a newly added manual segment card once it mounts.
  // We scroll videoPanelRef directly because its overflow-hidden parent blocks scrollIntoView.
  useEffect(() => {
    if (!pendingScrollSegmentId) return
    let attempts = 0
    const tryScroll = () => {
      const panel = videoPanelRef.current
      const card = document.getElementById(`segment-card-${pendingScrollSegmentId}`)
      if (panel && card) {
        const panelRect = panel.getBoundingClientRect()
        const cardRect = card.getBoundingClientRect()
        const targetScrollTop = panel.scrollTop + (cardRect.top - panelRect.top) - 20
        panel.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
        setPendingScrollSegmentId(null)
      } else if (attempts < 25) {
        attempts++
        setTimeout(tryScroll, 80)
      }
    }
    tryScroll()
  }, [pendingScrollSegmentId])

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

  // Set of chapter numbers that have been analyzed (i.e. have segments in the store)
  const analyzedChapters = new Set(segments.map((s) => s.chapter ?? 1))
  // During analysis, pretend all chapters are visible so the full script renders as plain text
  const analyzedChaptersForPanel = isAnalyzing
    ? new Set(Array.from({ length: Math.max(scriptChunkCount, 1) }, (_, i) => i + 1))
    : analyzedChapters

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
          body: JSON.stringify({ segments: chapterSegments, orientation: videoOrientation }),
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

  // Fetch subscription status once the user is authenticated (for upgrade modal messaging)
  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/user/settings')
      .then((r) => r.json())
      .then((d) => setIsFreeTrial(!d.subscription_plan || d.subscription_status !== 'active'))
      .catch(() => {})
  }, [isAuthenticated])

  // Show "add segment" hint on the 1st, 6th, 11th… script submission
  // Triggers once chapter 1 is done so there's actually plain text visible to point at
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!script || segments.length === 0) return
    const count = parseInt(localStorage.getItem('clipscout_script_count') ?? '0', 10)
    // Show on 1st, 6th, 11th… submission (count % 5 === 1)
    if (count % 5 === 1) {
      setShowLoadChapterHint(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, segments.length])

  /**
   * Called when user clicks "Load Chapter X" in the LEFT SCRIPT PANEL.
   * Analyzes the chapter (deducting 1 credit) then loads its videos.
   */
  const handleLoadChapterFromScript = useCallback(
    async (chapterNum: number) => {
      trackEvent('Button Click', { button_name: 'Load Chapter', page: 'Results', chapter: chapterNum })
      const chunkIndex = chapterNum - 1

      setLoadingChapterInScript(chapterNum)
      setShowLoadChapterHint(false)

      const credRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, chunkIndex, scriptContext: savedScriptContext, segmentIdOffset: segments.length }),
      })

      if (!credRes.ok) {
        const errData = await credRes.json().catch(() => ({}))
        setLoadingChapterInScript(null)
        if (credRes.status === 402 || errData.error === 'INSUFFICIENT_CREDITS') {
          setShowUpgradeModal(true)
          return
        }
        console.error('Chapter analyze error:', errData)
        return
      }

      if (!credRes.body) {
        setLoadingChapterInScript(null)
        return
      }

      const reader = credRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const newSegments: import('@/lib/types').ScriptSegment[] = []

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            const parsed = JSON.parse(line)
            if (parsed.error === 'INSUFFICIENT_CREDITS') {
              setShowUpgradeModal(true)
              setLoadingChapterInScript(null)
              return
            }
            if (parsed.scriptContext && !savedScriptContext) {
              setSavedScriptContext(parsed.scriptContext)
            }
            if (parsed.segments) {
              newSegments.push(...parsed.segments)
              addSegments(parsed.segments)
            }
          }
        }
      } catch (e) {
        console.error('Load chapter stream error:', e)
        setLoadingChapterInScript(null)
        return
      }

      setLoadingChapterInScript(null)

      // Make the chapter visible in the right panel and search for videos
      if (newSegments.length > 0) {
        if (!visibleChapters.includes(chapterNum)) {
          setVisibleChapters((prev) => [...prev, chapterNum])
        }
        setChapterStatus(chapterNum, 'loading')
        try {
          const searchRes = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segments: newSegments, orientation: videoOrientation }),
          })
          if (searchRes.ok) {
            const { results } = await searchRes.json()
            addSearchResults(results)
          }
        } finally {
          setChapterStatus(chapterNum, 'done')
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [script, segments.length, savedScriptContext, visibleChapters, addSegments, addSearchResults, setChapterStatus, setShowUpgradeModal, setSavedScriptContext]
  )

  const handleStartOver = () => {
    trackEvent('Button Click', { button_name: 'Start Over', page: 'Results' })
    reset()
    router.push('/')
  }

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleSaveScript = async () => {
    if (saveState === 'saving' || saveState === 'saved') return
    trackEvent('Button Click', { button_name: 'Save Script', page: 'Results' })
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
      trackEvent('Button Click', { button_name: 'Add Segment', page: 'Results' })
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
      setPendingScrollSegmentId(id)

      let topic = text.slice(0, 60)
      let searchQueries = [text.slice(0, 80)]

      try {
        // 1. Get AI-generated topic + search queries (pass surrounding script text for context)
        const surroundingText = script.slice(Math.max(0, startIndex - 300), endIndex + 300)
        const analyzeRes = await fetch('/api/analyze-segment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, surroundingText }),
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
            orientation: videoOrientation,
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
    const panel = videoPanelRef.current
    const card = document.getElementById(`segment-card-${segmentId}`)
    if (panel && card) {
      const panelRect = panel.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      panel.scrollTo({ top: panel.scrollTop + (cardRect.top - panelRect.top) - 20, behavior: 'smooth' })
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/60 backdrop-blur-sm border border-red-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-purple-950">Something went wrong</h2>
          <p className="text-sm text-purple-700">{error}</p>
          <button onClick={handleStartOver} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative">
      {/* Upgrade modal — shown when credits run out */}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} isFreeTrial={isFreeTrial} />
      )}


      {/* Auth gate overlay */}
      {showGate && (
        <AuthGate onAuthenticated={() => setShowGate(false)} />
      )}

      {/* Page content — blurred when gate is showing */}
      <div className={showGate ? 'pointer-events-none select-none filter blur-sm brightness-50 transition-all duration-300' : 'transition-all duration-300'}>

      <DisclaimerBanner />

      {/* Mobile: chapter pill row */}
      {segments.length > 0 && (
        <div className="md:hidden bg-white/40 backdrop-blur-sm border-b border-purple-200 px-4 py-2 overflow-x-auto">
          <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
            {segments.map((seg, i) => (
              <button
                key={seg.id}
                onClick={() => handlePillClick(seg.id)}
                className={[
                  'text-xs font-bold px-3 py-1.5 rounded-full transition-colors shrink-0',
                  activeSegmentId === seg.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200 hover:text-purple-900',
                ].join(' ')}
              >
                B{i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile script drawer — slides up from bottom */}
      {scriptDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setScriptDrawerOpen(false)} />
          {/* Drawer */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-t-2xl border-t border-purple-200 shadow-2xl flex flex-col" style={{ maxHeight: '75dvh' }}>
            <div className="px-5 py-4 border-b border-purple-200 shrink-0 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-purple-500 font-semibold">Your script</span>
                {segments.length > 0 && (
                  <div className="text-xs font-semibold text-purple-800 mt-0.5">
                    {segments.length} segments · {allChapters.length} chapter{allChapters.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleStartOver} className="text-[11px] text-purple-500 hover:text-purple-800 transition-colors">Start over</button>
                <button onClick={() => setScriptDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div ref={scriptPanelRef} className="flex-1 overflow-y-auto px-5 py-4">
              {script ? (
                <InteractiveScript
                  script={script}
                  segments={segments}
                  containerRef={scriptPanelRef}
                  onAddSegment={handleAddSegment}
                  chunkOffsets={scriptChunkOffsets}
                  totalChapters={scriptChunkCount}
                  analyzedChapters={analyzedChaptersForPanel}
                  onLoadChapter={isAnalyzing ? undefined : handleLoadChapterFromScript}
                  loadingChapter={loadingChapterInScript}
                  showHint={false}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Mobile floating action buttons */}
      {segments.length > 0 && !scriptDrawerOpen && (
        <div className="md:hidden fixed bottom-5 right-4 z-30 flex flex-col gap-2 items-end">
          <button
            onClick={() => setScriptDrawerOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-purple-900/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            View script
          </button>
        </div>
      )}

      {/* Use dvh instead of vh to handle iOS Safari toolbar correctly */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100dvh - 40px)' }}>
        {/* LEFT PANEL */}
        <div className="hidden md:flex flex-col w-[30%] min-w-[280px] max-w-sm border-r border-purple-200 overflow-hidden bg-white/20 backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-purple-200 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-purple-500 font-semibold">Your script</span>
              <button onClick={handleStartOver} className="text-[10px] text-purple-500 hover:text-purple-800 transition-colors">Start over</button>
            </div>
            {segments.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-purple-800">
                  {segments.length} segments · {allChapters.length} chapter{allChapters.length !== 1 ? 's' : ''}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse-slow" />
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
                chunkOffsets={scriptChunkOffsets}
                totalChapters={scriptChunkCount}
                analyzedChapters={analyzedChaptersForPanel}
                onLoadChapter={isAnalyzing ? undefined : handleLoadChapterFromScript}
                loadingChapter={loadingChapterInScript}
                showHint={showLoadChapterHint}
                onDismissHint={() => setShowLoadChapterHint(false)}
              />
            ) : (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-3 bg-purple-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                ))}
              </div>
            )}
          </div>

          {segments.length > 0 && (
            <div className="px-5 py-3 border-t border-purple-200 shrink-0 space-y-1.5">
              <p className="text-[10px] text-purple-500 leading-relaxed">
                <span className="inline-block border-b-2 border-purple-400/50 text-purple-600 mr-1">Underlined text</span>
                = B-roll segment. Click to jump to clips.
              </p>
              <p className="text-[10px] text-purple-500 leading-relaxed">
                Highlight any other text to add a custom segment.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white/40 backdrop-blur-sm border-b border-purple-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-950">
                  {isAnalyzing
                    ? 'Analyzing script…'
                    : isLoading
                    ? 'Finding footage…'
                    : segments.length > 0
                    ? `${segments.length} segments · ${allChapters.length} chapters · ${totalClips} clips loaded`
                    : 'ClipScout'}
                </p>
                {isLoading && (
                  <p className="text-[10px] text-purple-500">
                    {isAnalyzing ? 'AI is reading your script…' : 'Finding footage…'}
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
                    border-purple-300 text-purple-600 hover:bg-purple-100 hover:text-purple-800"
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
                className="hidden md:flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-950 border border-purple-200 hover:border-purple-400 px-3 py-1.5 rounded-lg transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                Start over
              </button>
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
            <div ref={videoPanelRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-10">
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
                        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                          Chapter {chapterNum}
                        </span>
                        {status === 'done' && (
                          <span className="text-[9px] bg-purple-100 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded-full">
                            {chapterSegments.length} segments · {searchResults.filter(r => chapterSegments.some(s => s.id === r.segmentId)).reduce((sum, r) => sum + r.videos.length, 0)} clips
                          </span>
                        )}
                      </div>
                      <div className="flex-1 h-px bg-purple-200" />
                    </div>

                    {/* Chapter content */}
                    {isVisible && (status === 'loading' || status === 'done' || status === 'idle') ? (
                      <div className="space-y-5">
                        {chapterSegments.map((segment) => {
                          const segIndex = segments.findIndex(s => s.id === segment.id)
                          const result = searchResults.find((r) => r.segmentId === segment.id)
                          const isManualLoading = loadingSegmentIds.has(segment.id)

                          if (isManualLoading) {
                            return (
                              <div key={segment.id} id={`segment-card-${segment.id}`} style={{ scrollMarginTop: '80px' }} className="rounded-2xl border border-purple-200 bg-white/50 backdrop-blur-sm p-8 flex flex-col items-center justify-center gap-3 text-center">
                                <svg className="animate-spin w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <p className="text-sm font-semibold text-purple-800">Loading your new segment</p>
                                <p className="text-xs text-purple-500">Finding the best footage for your selection…</p>
                              </div>
                            )
                          }

                          if (status === 'loading' && !result) {
                            return (
                              <div key={segment.id} id={`segment-card-${segment.id}`} style={{ scrollMarginTop: '80px' }} className="rounded-2xl border border-purple-200 bg-white/30 p-5 space-y-3 animate-pulse">
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-lg bg-purple-200" />
                                  <div className="h-4 bg-purple-200 rounded w-40" />
                                </div>
                                <div className="h-3 bg-purple-200 rounded w-full" />
                                <div className="h-3 bg-purple-200 rounded w-3/4" />
                                <div className="flex gap-3">
                                  {[1, 2, 3].map(j => <div key={j} className="w-52 h-28 rounded-xl bg-purple-200 shrink-0" />)}
                                </div>
                              </div>
                            )
                          }

                          return (
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
                      <div className="rounded-2xl border border-dashed border-purple-300 p-6 text-center text-purple-500 text-sm">
                        {chapterSegments.length} segment{chapterSegments.length !== 1 ? 's' : ''} waiting…
                      </div>
                    ) : null}

                    {/* Next chapter button — shown at bottom of each chapter when it's done */}
                    {status === 'done' && !isLastChapter && nextChapter && (
                      <div className="mt-8 flex justify-center">
                        {chapterStatus[nextChapter] === 'loading' ? (
                          <div className="flex items-center gap-2 text-sm text-purple-600">
                            <svg className="animate-spin h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading Chapter {nextChapter}…
                          </div>
                        ) : chapterStatus[nextChapter] === 'done' ? null : (
                          <button
                            onClick={() => handleLoadNextChapter(nextChapter)}
                            className="group flex items-center gap-2.5 bg-white/40 hover:bg-purple-100 border border-purple-200 hover:border-purple-400 text-purple-700 hover:text-purple-950 font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm"
                          >
                            <span>Load Chapter {nextChapter}</span>
                            <span className="text-purple-400 group-hover:text-purple-600 text-xs">
                              {segments.filter(s => (s.chapter ?? 1) === nextChapter).length} segments
                            </span>
                            <svg className="w-4 h-4 text-purple-500 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <p className="text-sm text-purple-700">No visual segments were identified in your script.</p>
                <p className="text-xs text-purple-500">Try a script with more descriptive visual content.</p>
                <button onClick={handleStartOver} className="mt-4 text-sm text-purple-600 hover:text-purple-900 transition-colors">
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
