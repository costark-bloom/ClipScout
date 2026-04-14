'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ScriptSegment } from '@/lib/types'
import useAppStore from '@/store/useAppStore'

interface SelectionPopover {
  top: number
  left: number
  text: string
  startIndex: number
  endIndex: number
}

interface InteractiveScriptProps {
  script: string
  segments: ScriptSegment[]
  containerRef?: React.RefObject<HTMLDivElement | null>
  onAddSegment?: (text: string, startIndex: number, endIndex: number) => void
  /** Character offset where each chapter starts. chunkOffsets[0]=0, [1]=where ch2 starts, etc. */
  chunkOffsets?: number[]
  /** Total number of chapters in the full script */
  totalChapters?: number
  /** Chapters whose segments have been analyzed (chapter numbers, 1-based) */
  analyzedChapters?: Set<number>
  /** Called when user clicks "Load Chapter X" in the script panel */
  onLoadChapter?: (chapter: number) => void
  /** Whether a specific chapter is currently being loaded */
  loadingChapter?: number | null
  /** Show the first-time hint pointing at the first unsegmented plain text */
  showHint?: boolean
  /** Called when user dismisses the hint */
  onDismissHint?: () => void
}

export function scrollToSegment(segmentId: string) {
  const el = document.getElementById(`segment-card-${segmentId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Walk up DOM to find nearest ancestor with data-text-start.
// Returns null if a data-segment-id is found first (selection over an existing segment).
function findTextStart(node: Node, container: HTMLElement): number | null {
  let el: Element | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
  while (el && el !== container) {
    if ((el as HTMLElement).dataset.segmentId) return null
    if ((el as HTMLElement).dataset.textStart !== undefined) {
      return Number((el as HTMLElement).dataset.textStart)
    }
    el = el.parentElement
  }
  return null
}

export default function InteractiveScript({
  script,
  segments,
  containerRef,
  onAddSegment,
  chunkOffsets = [],
  totalChapters = 1,
  analyzedChapters = new Set([1]),
  onLoadChapter,
  loadingChapter = null,
  showHint = false,
  onDismissHint,
}: InteractiveScriptProps) {
  const { activeSegmentId, setActiveSegment } = useAppStore()
  const spanRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const scriptRef = useRef<HTMLDivElement>(null)
  const [popover, setPopover] = useState<SelectionPopover | null>(null)
  const [hintPos, setHintPos] = useState<{ top: number; left: number } | null>(null)

  // Position the hint tooltip over the first plain-text (unsegmented) span
  useEffect(() => {
    if (!showHint || !scriptRef.current) { setHintPos(null); return }
    const el = scriptRef.current.querySelector<HTMLElement>('[data-text-start]')
    if (!el) { setHintPos(null); return }

    // Highlight the target sentence with a warm amber glow so it's distinct from the purple selection color
    el.style.background = 'rgba(251,191,36,0.18)'
    el.style.borderRadius = '3px'
    el.style.transition = 'background 0.3s'

    const update = () => {
      const r = el.getBoundingClientRect()
      setHintPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    return () => {
      el.style.background = ''
      el.style.borderRadius = ''
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [showHint, segments.length])

  // Scroll the active script span into view when activeSegmentId changes externally
  useEffect(() => {
    if (!activeSegmentId) return
    const span = spanRefs.current[activeSegmentId]
    if (span) {
      const container = containerRef?.current
      if (container) {
        const spanRect = span.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const isVisible =
          spanRect.top >= containerRect.top && spanRect.bottom <= containerRect.bottom
        if (!isVisible) {
          span.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } else {
        span.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeSegmentId, containerRef])

  const handleSegmentClick = useCallback(
    (segmentId: string) => {
      setActiveSegment(segmentId)
      scrollToSegment(segmentId)
    },
    [setActiveSegment]
  )

  // Dismiss popover when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-add-segment-popover]')) {
        setPopover(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Dismiss popover on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopover(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Detect text selection in non-segment regions
  const handleMouseUp = useCallback(() => {
    if (!onAddSegment) return
    const container = scriptRef.current
    if (!container) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setPopover(null)
      return
    }

    const selectedText = selection.toString().trim()
    if (selectedText.length < 3) {
      setPopover(null)
      return
    }

    const range = selection.getRangeAt(0)

    // Bail if the selection is not inside this script container
    if (!container.contains(range.commonAncestorContainer)) {
      setPopover(null)
      return
    }

    // Bail if selection contains or crosses any existing segment span
    const fragment = range.cloneContents()
    if (fragment.querySelector('[data-segment-id]')) {
      setPopover(null)
      return
    }

    // Determine character offsets using data-text-start attributes
    const startTextStart = findTextStart(range.startContainer, container)
    const endTextStart = findTextStart(range.endContainer, container)

    if (startTextStart === null || endTextStart === null) {
      setPopover(null)
      return
    }

    const startIndex = startTextStart + range.startOffset
    const endIndex = endTextStart + range.endOffset

    if (endIndex <= startIndex) {
      setPopover(null)
      return
    }

    // Double-check: ensure range doesn't overlap any existing segment
    const overlaps = segments.some(
      (s) => !(endIndex <= s.startIndex || startIndex >= s.endIndex)
    )
    if (overlaps) {
      setPopover(null)
      return
    }

    // Position the popover above the selection
    const rect = range.getBoundingClientRect()
    setPopover({
      top: rect.top - 44,
      left: Math.max(8, rect.left + rect.width / 2 - 64),
      text: selectedText,
      startIndex,
      endIndex,
    })
  }, [onAddSegment, segments])

  const handleAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (!popover || !onAddSegment) return
      onAddSegment(popover.text, popover.startIndex, popover.endIndex)
      setPopover(null)
      window.getSelection()?.removeAllRanges()
    },
    [popover, onAddSegment]
  )

  // Build React nodes from script text + sorted segments
  const sortedSegments = [...segments].sort((a, b) => a.startIndex - b.startIndex)

  const nodes: React.ReactNode[] = []
  let cursor = 0
  let segmentIndex = 0
  let currentChapter = 0

  for (const segment of sortedSegments) {
    const { startIndex, endIndex, id } = segment
    const segmentChapter = segment.chapter ?? 1

    if (startIndex < cursor || endIndex <= startIndex || endIndex > script.length) continue

    if (startIndex > cursor) {
      const plainText = script.slice(cursor, startIndex)

      if (segmentChapter !== currentChapter && currentChapter !== 0) {
        const lastNewline = plainText.lastIndexOf('\n')
        const beforeBreak = lastNewline >= 0 ? plainText.slice(0, lastNewline + 1) : plainText
        const afterBreak = lastNewline >= 0 ? plainText.slice(lastNewline + 1) : ''

        if (beforeBreak) {
          nodes.push(
            <span key={`plain-${cursor}`} data-text-start={cursor} className="text-purple-900">
              {beforeBreak}
            </span>
          )
        }

        nodes.push(
          <span
            key={`chapter-${segmentChapter}`}
            className="block my-3 select-none"
            contentEditable={false}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-px w-6 bg-purple-300 inline-block align-middle" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-purple-600 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                Chapter {segmentChapter}
              </span>
              <span className="h-px flex-1 bg-purple-300 inline-block align-middle" style={{ width: '100%' }} />
            </span>
          </span>
        )

        if (afterBreak) {
          nodes.push(
            <span key={`plain-after-${cursor}`} data-text-start={cursor + (lastNewline >= 0 ? lastNewline + 1 : 0)} className="text-purple-900">
              {afterBreak}
            </span>
          )
        }
      } else {
        nodes.push(
          <span key={`plain-${cursor}`} data-text-start={cursor} className="text-purple-900">
            {plainText}
          </span>
        )
      }
    } else if (segmentChapter !== currentChapter && currentChapter !== 0) {
      nodes.push(
        <span
          key={`chapter-${segmentChapter}`}
          className="block my-3 select-none"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-6 bg-purple-300 inline-block align-middle" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-purple-600 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
              Chapter {segmentChapter}
            </span>
          </span>
        </span>
      )
    }

    currentChapter = segmentChapter

    const isActive = activeSegmentId === id
    segmentIndex++
    const badge = `B${segmentIndex}`

    nodes.push(
      <span
        key={id}
        ref={(el) => { spanRefs.current[id] = el }}
        data-segment-id={id}
        onClick={() => handleSegmentClick(id)}
        className={[
          'relative cursor-pointer rounded-sm transition-all duration-200 group/seg',
          'border-b-2',
          isActive
            ? 'border-purple-500 bg-purple-100/60 text-purple-950 px-0.5'
            : 'border-indigo-600/50 text-purple-900 hover:bg-purple-100/60 hover:border-purple-500 hover:text-purple-950 px-0.5',
        ].join(' ')}
        title={segment.topic}
      >
        {segment.text}
        <sup
          className={[
            'ml-0.5 text-[9px] font-bold tracking-wide rounded px-0.5 transition-all duration-200',
            isActive
              ? 'text-purple-600 opacity-100'
              : 'text-purple-500 opacity-0 group-hover/seg:opacity-100',
          ].join(' ')}
        >
          {badge}
        </sup>
      </span>
    )

    cursor = endIndex
  }

  // Determine the cutoff: the start of the first unanalyzed chapter in the script
  // chunkOffsets[i] is the character offset where chapter (i+1) starts
  let cutoffOffset = script.length
  let nextUnanalyzedChapter: number | null = null
  for (let i = 0; i < totalChapters; i++) {
    const chapterNum = i + 1
    if (!analyzedChapters.has(chapterNum)) {
      // The chapter boundary is chunkOffsets[i] if available, otherwise we can't determine it
      const boundary = chunkOffsets[i] ?? script.length
      cutoffOffset = Math.min(cutoffOffset, boundary)
      nextUnanalyzedChapter = chapterNum
      break
    }
  }

  // Render trailing plain text within loaded chapters only
  if (cursor < cutoffOffset) {
    nodes.push(
      <span key="plain-end" data-text-start={cursor} className="text-purple-900">
        {script.slice(cursor, cutoffOffset)}
      </span>
    )
  }

  // Render "Load Chapter X" button for the next unanalyzed chapter
  if (nextUnanalyzedChapter !== null && onLoadChapter) {
    const isLoadingThis = loadingChapter === nextUnanalyzedChapter
    nodes.push(
      <span key={`load-ch-${nextUnanalyzedChapter}`} className="block mt-5 select-none relative" contentEditable={false}>
        <button
          disabled={isLoadingThis}
          onClick={() => onLoadChapter(nextUnanalyzedChapter!)}
          className={[
            'flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border transition-all duration-200',
            isLoadingThis
              ? 'bg-purple-50 border-purple-200 text-purple-400 cursor-not-allowed'
              : 'bg-white/70 hover:bg-purple-100 border-purple-200 hover:border-purple-400 text-purple-700 hover:text-purple-950',
          ].join(' ')}
        >
          {isLoadingThis ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading Chapter {nextUnanalyzedChapter}…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
              Load Chapter {nextUnanalyzedChapter}
              <span className="text-purple-400 font-normal">· 1 credit</span>
            </>
          )}
        </button>

      </span>
    )
  }

  return (
    <>
      <div
        ref={scriptRef}
        onMouseUp={handleMouseUp}
        className="text-sm leading-7 whitespace-pre-wrap font-serif selection:bg-violet-300/70"
      >
        {nodes}
      </div>

      {/* First-time hint — anchored to first unsegmented plain text */}
      {showHint && hintPos && typeof window !== 'undefined' && createPortal(
        <div
          style={{ position: 'absolute', top: hintPos.top, left: hintPos.left, zIndex: 9999 }}
        >
          {/* Two-layer arrow: border colour + white fill on top */}
          <div style={{ position: 'relative', height: 10, marginLeft: 16, width: 20 }}>
            {/* Border layer */}
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: 0, height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderBottom: '10px solid #d8b4fe',
            }} />
            {/* White fill layer (sits 1px lower to show border) */}
            <div style={{
              position: 'absolute', top: 1, left: 1,
              width: 0, height: 0,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderBottom: '9px solid white',
            }} />
          </div>

          <div style={{ width: 232 }} className="bg-white border border-purple-300 rounded-xl shadow-2xl shadow-purple-300/50 p-4">
            <p className="text-xs font-bold text-purple-950 mb-1">Missed a moment?</p>
            <p className="text-xs text-purple-600 leading-relaxed mb-3">
              Highlight any text the AI skipped, then click{' '}
              <span className="font-semibold text-purple-800">&ldquo;Add segment&rdquo;</span>{' '}
              to find footage for it.
            </p>
            <button
              onMouseDown={(e) => { e.stopPropagation(); onDismissHint?.() }}
              className="text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Got it
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Floating "Add segment" popover — rendered in body to escape scroll containers */}
      {popover && typeof window !== 'undefined' && createPortal(
        <div
          data-add-segment-popover
          style={{ top: popover.top, left: popover.left }}
          className="fixed z-50 pointer-events-auto"
        >
          <button
            onMouseDown={handleAddClick}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-xl shadow-indigo-950/60 flex items-center gap-1.5 whitespace-nowrap transition-colors border border-indigo-400/20"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add segment
          </button>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-indigo-600 rotate-45 border-r border-b border-indigo-400/20" />
        </div>,
        document.body
      )}
    </>
  )
}
