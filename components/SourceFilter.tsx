'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useAppStore from '@/store/useAppStore'
import { trackEvent } from '@/lib/analytics'
import { ALL_VIDEO_SOURCES, type VideoSource } from '@/lib/types'

interface SourceFilterProps {
  /**
   * - `inline`  : home page — full-width button, panel left-aligned to trigger
   * - `compact` : results page sticky header — smaller, panel right-aligned to trigger
   */
  variant?: 'inline' | 'compact'
  /** Analytics context (e.g. "Home", "Results"). Sent with the change event. */
  analyticsContext?: string
}

interface SourceMeta {
  id: VideoSource
  label: string
  tag: string
  tagColor: 'green' | 'amber' | 'red'
  tooltip: string
}

const SOURCES: SourceMeta[] = [
  {
    id: 'pexels',
    label: 'Pexels',
    tag: 'royalty-free',
    tagColor: 'green',
    tooltip: 'Pexels stock footage — royalty-free, safe for commercial use with no attribution required.',
  },
  {
    id: 'pixabay',
    label: 'Pixabay',
    tag: 'royalty-free',
    tagColor: 'green',
    tooltip: 'Pixabay stock footage — royalty-free, safe for commercial use with no attribution required.',
  },
  {
    id: 'youtube_cc',
    label: 'YouTube — Creative Commons',
    tag: 'reusable',
    tagColor: 'amber',
    tooltip: 'YouTube clips licensed under Creative Commons. Free to reuse with attribution to the original creator.',
  },
  {
    id: 'youtube_protected',
    label: 'YouTube — Protected',
    tag: 'fair use only',
    tagColor: 'red',
    tooltip: 'Standard YouTube clips. Copyright remains with the creator — only use if your use clearly qualifies as fair use (commentary, criticism, parody, education) or you have permission.',
  },
]

const DOT_COLORS: Record<SourceMeta['tagColor'], string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
}

// Panel width (matches Tailwind w-80 = 20rem = 320px). Hardcoded so we can
// clamp the computed `left` value to keep the panel on screen.
const PANEL_WIDTH = 320
const PANEL_GAP = 8 // gap between trigger bottom and panel top

interface AnchorPosition {
  top: number
  // Exactly one of `left` / `right` is set, mirroring how the panel anchors.
  left?: number
  right?: number
}

export default function SourceFilter({ variant = 'inline', analyticsContext = 'Unknown' }: SourceFilterProps) {
  const enabledSources = useAppStore((s) => s.enabledSources)
  const toggleSource = useAppStore((s) => s.toggleSource)
  const setEnabledSources = useAppStore((s) => s.setEnabledSources)

  const [isOpen, setIsOpen] = useState(false)
  // Portal-mount flag: `document` is undefined during SSR.
  const [mounted, setMounted] = useState(false)
  const [anchor, setAnchor] = useState<AnchorPosition>({ top: 0, left: 0 })

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isCompact = variant === 'compact'

  /**
   * Compute panel anchor from the trigger's bounding rect.
   * - compact (results header): anchor to trigger's right edge
   * - inline (home page): anchor to trigger's left edge, clamped so the
   *   320px panel never spills off the right side of the viewport
   */
  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (isCompact) {
      setAnchor({
        top: rect.bottom + PANEL_GAP,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    } else {
      const margin = 8
      const maxLeft = window.innerWidth - PANEL_WIDTH - margin
      setAnchor({
        top: rect.bottom + PANEL_GAP,
        left: Math.min(Math.max(margin, rect.left), Math.max(margin, maxLeft)),
      })
    }
  }, [isCompact])

  // Compute initial position synchronously to avoid a one-frame flash at (0,0)
  // when the panel first appears.
  useLayoutEffect(() => {
    if (isOpen) updatePosition()
  }, [isOpen, updatePosition])

  // Keep the panel pinned to the trigger as the user scrolls or resizes the
  // window. Capture-phase listener so nested scroll containers also fire.
  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, updatePosition])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const insideTrigger = triggerRef.current?.contains(target)
      const insidePanel = panelRef.current?.contains(target)
      if (!insideTrigger && !insidePanel) setIsOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const handleToggle = (source: VideoSource) => {
    const isCurrentlyEnabled = enabledSources.includes(source)
    // Block unchecking the last enabled source.
    if (isCurrentlyEnabled && enabledSources.length === 1) return

    toggleSource(source)

    const after = isCurrentlyEnabled
      ? enabledSources.filter((s) => s !== source)
      : [...enabledSources, source]

    trackEvent('Source Filter Changed', {
      context: analyticsContext,
      source,
      enabled: !isCurrentlyEnabled,
      enabled_sources_after: after.join(','),
      enabled_sources_count: after.length,
    })
  }

  const handleSelectAll = () => {
    if (enabledSources.length === ALL_VIDEO_SOURCES.length) return
    setEnabledSources([...ALL_VIDEO_SOURCES])
    trackEvent('Source Filter Changed', {
      context: analyticsContext,
      source: 'all',
      enabled: true,
      enabled_sources_after: ALL_VIDEO_SOURCES.join(','),
      enabled_sources_count: ALL_VIDEO_SOURCES.length,
    })
  }

  const allOn = enabledSources.length === ALL_VIDEO_SOURCES.length
  const triggerLabel = allOn
    ? 'All sources'
    : `${enabledSources.length} of ${ALL_VIDEO_SOURCES.length} sources`

  const panel = (
    <div
      ref={panelRef}
      role="listbox"
      aria-multiselectable="true"
      aria-label="Select footage sources"
      style={{
        position: 'fixed',
        top: anchor.top,
        ...(anchor.left !== undefined ? { left: anchor.left } : {}),
        ...(anchor.right !== undefined ? { right: anchor.right } : {}),
        width: PANEL_WIDTH,
      }}
      className="z-[100] rounded-xl border border-purple-200 bg-white shadow-xl shadow-purple-200/60 overflow-hidden max-w-[calc(100vw-1rem)]"
    >
      {/* Header row: title + "Select all" affordance */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-100 bg-purple-50/50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
          Footage sources
        </span>
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={allOn}
          className="text-[11px] font-semibold text-purple-600 hover:text-purple-900 disabled:opacity-40 disabled:cursor-default underline-offset-2 hover:underline"
        >
          Select all
        </button>
      </div>

      {/* Checkbox rows */}
      <ul className="py-1">
        {SOURCES.map((meta) => {
          const isOn = enabledSources.includes(meta.id)
          const isLastEnabled = isOn && enabledSources.length === 1
          return (
            <li key={meta.id}>
              <button
                type="button"
                onClick={() => handleToggle(meta.id)}
                disabled={isLastEnabled}
                title={isLastEnabled ? 'At least one source must stay selected' : meta.tooltip}
                role="option"
                aria-selected={isOn}
                className={[
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  isLastEnabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:bg-purple-50',
                ].join(' ')}
              >
                {/* Checkbox */}
                <span
                  className={[
                    'flex items-center justify-center w-4 h-4 rounded border-2 shrink-0 transition-colors',
                    isOn
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-white border-purple-300',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {isOn && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5 5 9l4.5-5.5" />
                    </svg>
                  )}
                </span>

                {/* Label */}
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-purple-950 truncate">
                    {meta.label}
                  </span>
                </span>

                {/* License tag pill */}
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-600 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 shrink-0">
                  <span className={['w-1.5 h-1.5 rounded-full', DOT_COLORS[meta.tagColor]].join(' ')} />
                  {meta.tag}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <div className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={[
          'inline-flex items-center gap-2 rounded-xl border transition-all duration-150 font-semibold',
          isCompact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs',
          allOn
            ? 'bg-white/60 border-purple-200 text-purple-700 hover:border-purple-400 hover:bg-white'
            : 'bg-purple-50 border-purple-300 text-purple-800 hover:border-purple-400',
        ].join(' ')}
      >
        <svg
          className={isCompact ? 'w-3 h-3 text-purple-500' : 'w-3.5 h-3.5 text-purple-500'}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h13.5m-13.5 6h13.5m-13.5 6h9M18 9l3 3-3 3" />
        </svg>
        <span className="whitespace-nowrap">Sources: {triggerLabel}</span>
        {!allOn && (
          <span className="inline-flex items-center rounded-full bg-purple-200 text-purple-800 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5">
            Filtered
          </span>
        )}
        <svg
          className={[
            isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5',
            'transition-transform duration-150',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Portal the panel to document.body so it escapes any ancestor
          stacking context (backdrop-filter / transform / filter / contain). */}
      {mounted && isOpen && createPortal(panel, document.body)}
    </div>
  )
}
