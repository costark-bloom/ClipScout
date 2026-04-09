'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ScriptSegment } from '@/lib/types'
import useAppStore from '@/store/useAppStore'

interface InteractiveScriptProps {
  script: string
  segments: ScriptSegment[]
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export function scrollToSegment(segmentId: string) {
  const el = document.getElementById(`segment-card-${segmentId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export default function InteractiveScript({
  script,
  segments,
  containerRef,
}: InteractiveScriptProps) {
  const { activeSegmentId, setActiveSegment } = useAppStore()
  const spanRefs = useRef<Record<string, HTMLSpanElement | null>>({})

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

  // Build React nodes from script text + sorted segments
  const sortedSegments = [...segments].sort((a, b) => a.startIndex - b.startIndex)

  const nodes: React.ReactNode[] = []
  let cursor = 0
  let segmentIndex = 0
  let currentChapter = 0

  for (const segment of sortedSegments) {
    const { startIndex, endIndex, id } = segment
    const segmentChapter = segment.chapter ?? 1

    // Guard against malformed indices
    if (startIndex < cursor || endIndex <= startIndex || endIndex > script.length) continue

    // Plain text before this segment — split at last newline before a chapter break
    if (startIndex > cursor) {
      const plainText = script.slice(cursor, startIndex)

      // If a new chapter is starting, try to split the plain text at the last newline
      // so the chapter marker lands cleanly between paragraphs
      if (segmentChapter !== currentChapter && currentChapter !== 0) {
        const lastNewline = plainText.lastIndexOf('\n')
        const beforeBreak = lastNewline >= 0 ? plainText.slice(0, lastNewline + 1) : plainText
        const afterBreak = lastNewline >= 0 ? plainText.slice(lastNewline + 1) : ''

        if (beforeBreak) {
          nodes.push(
            <span key={`plain-${cursor}`} className="text-gray-300">{beforeBreak}</span>
          )
        }

        // Chapter marker
        nodes.push(
          <span
            key={`chapter-${segmentChapter}`}
            className="block my-3 select-none"
            contentEditable={false}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-px w-6 bg-indigo-700/60 inline-block align-middle" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-950/50 border border-indigo-900/50 px-2 py-0.5 rounded-full">
                Chapter {segmentChapter}
              </span>
              <span className="h-px flex-1 bg-indigo-700/60 inline-block align-middle" style={{ width: '100%' }} />
            </span>
          </span>
        )

        if (afterBreak) {
          nodes.push(
            <span key={`plain-after-${cursor}`} className="text-gray-300">{afterBreak}</span>
          )
        }
      } else {
        nodes.push(
          <span key={`plain-${cursor}`} className="text-gray-300">{plainText}</span>
        )
      }
    } else if (segmentChapter !== currentChapter && currentChapter !== 0) {
      // Chapter changes right at segment boundary (no plain text gap)
      nodes.push(
        <span
          key={`chapter-${segmentChapter}`}
          className="block my-3 select-none"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-6 bg-indigo-700/60 inline-block align-middle" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-950/50 border border-indigo-900/50 px-2 py-0.5 rounded-full">
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
            ? 'border-indigo-400 bg-indigo-950/60 text-indigo-100 px-0.5'
            : 'border-indigo-600/50 text-gray-300 hover:bg-indigo-950/40 hover:border-indigo-500 hover:text-indigo-100 px-0.5',
        ].join(' ')}
        title={segment.topic}
      >
        {segment.text}
        <sup
          className={[
            'ml-0.5 text-[9px] font-bold tracking-wide rounded px-0.5 transition-all duration-200',
            isActive
              ? 'text-indigo-300 opacity-100'
              : 'text-indigo-500 opacity-0 group-hover/seg:opacity-100',
          ].join(' ')}
        >
          {badge}
        </sup>
      </span>
    )

    cursor = endIndex
  }

  // Remaining plain text after last segment
  if (cursor < script.length) {
    nodes.push(
      <span key="plain-end" className="text-gray-300">
        {script.slice(cursor)}
      </span>
    )
  }

  return (
    <div className="text-sm leading-7 whitespace-pre-wrap font-serif selection:bg-indigo-900/50">
      {nodes}
    </div>
  )
}
