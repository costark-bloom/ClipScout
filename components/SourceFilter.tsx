'use client'

import useAppStore from '@/store/useAppStore'
import { trackEvent } from '@/lib/analytics'
import { ALL_VIDEO_SOURCES, type VideoSource } from '@/lib/types'

interface SourceFilterProps {
  /**
   * - `inline`  : home page — full-width row below the search input with a label
   * - `compact` : results page sticky header — denser, no label, right-aligned
   */
  variant?: 'inline' | 'compact'
  /** Analytics context (e.g. "Home", "Results"). Sent with the change event. */
  analyticsContext?: string
}

interface SourceMeta {
  id: VideoSource
  label: string
  tooltip: string
  /** Short license tag shown beside the label */
  tag: string
  /** Tag color (used for the small dot indicator) */
  tagColor: 'green' | 'amber' | 'red'
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

export default function SourceFilter({ variant = 'inline', analyticsContext = 'Unknown' }: SourceFilterProps) {
  const enabledSources = useAppStore((s) => s.enabledSources)
  const toggleSource = useAppStore((s) => s.toggleSource)

  const handleToggle = (source: VideoSource) => {
    const isCurrentlyEnabled = enabledSources.includes(source)
    // Block unchecking the last enabled source — the store guards this too,
    // but blocking in the UI gives instant visual feedback.
    if (isCurrentlyEnabled && enabledSources.length === 1) return

    toggleSource(source)

    const after = isCurrentlyEnabled
      ? enabledSources.filter((s) => s !== source)
      : [...enabledSources, source]

    trackEvent('Source Filter Changed', {
      context: analyticsContext,
      source,
      enabled: !isCurrentlyEnabled,
      // Mixpanel-safe snapshot of the resulting selection (analytics types only accept scalars).
      enabled_sources_after: after.join(','),
      enabled_sources_count: after.length,
    })
  }

  const isCompact = variant === 'compact'

  return (
    <div
      className={[
        'flex flex-wrap items-center gap-2',
        isCompact ? 'gap-1.5' : 'gap-2',
      ].join(' ')}
    >
      {!isCompact && (
        <span className="text-xs font-semibold text-purple-600 shrink-0">
          Sources
        </span>
      )}

      {SOURCES.map((meta) => {
        const isOn = enabledSources.includes(meta.id)
        const isLastEnabled = isOn && enabledSources.length === 1
        return (
          <button
            key={meta.id}
            type="button"
            onClick={() => handleToggle(meta.id)}
            disabled={isLastEnabled}
            title={isLastEnabled ? 'At least one source must stay selected' : meta.tooltip}
            aria-pressed={isOn}
            className={[
              'inline-flex items-center gap-1.5 rounded-full border transition-all duration-150 font-semibold',
              isCompact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
              isOn
                ? 'bg-purple-600 border-purple-600 text-white shadow-sm hover:bg-purple-500'
                : 'bg-white/60 border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-white',
              isLastEnabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer',
            ].join(' ')}
          >
            {/* Checkbox indicator */}
            <span
              className={[
                'flex items-center justify-center rounded-sm border transition-colors',
                isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5',
                isOn ? 'bg-white border-white' : 'bg-transparent border-purple-300',
              ].join(' ')}
              aria-hidden="true"
            >
              {isOn && (
                <svg className={isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path className="text-purple-600" strokeLinecap="round" strokeLinejoin="round" d="M2.5 6.5 5 9l4.5-5.5" />
                </svg>
              )}
            </span>
            <span className="whitespace-nowrap">{meta.label}</span>
            {!isCompact && (
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                  isOn ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-500',
                ].join(' ')}
              >
                <span className={['w-1.5 h-1.5 rounded-full', DOT_COLORS[meta.tagColor]].join(' ')} />
                {meta.tag}
              </span>
            )}
          </button>
        )
      })}

      {/* "All on" / "Reset" affordance when user has trimmed sources. */}
      {enabledSources.length < ALL_VIDEO_SOURCES.length && (
        <button
          type="button"
          onClick={() => {
            useAppStore.getState().setEnabledSources([...ALL_VIDEO_SOURCES])
            trackEvent('Source Filter Changed', {
              context: analyticsContext,
              source: 'all',
              enabled: true,
              enabled_sources_after: ALL_VIDEO_SOURCES.join(','),
              enabled_sources_count: ALL_VIDEO_SOURCES.length,
            })
          }}
          className={[
            'text-purple-600 hover:text-purple-900 underline underline-offset-2 font-medium',
            isCompact ? 'text-[10px]' : 'text-xs',
          ].join(' ')}
        >
          Show all
        </button>
      )}
    </div>
  )
}
