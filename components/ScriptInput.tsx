'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import useAppStore from '@/store/useAppStore'
import UpgradeModal from '@/components/UpgradeModal'
import { splitIntoChunks } from '@/lib/chunks'
import { trackEvent } from '@/lib/analytics'
import { useCredits } from '@/hooks/useCredits'
import type { VideoOrientation } from '@/lib/types'

const EXAMPLE_SCRIPTS = [
  `Deep in the Amazon rainforest, towering trees rise sixty meters into the sky, their canopies locking together in an unbroken sea of green. Shafts of golden light pierce through the leaves and illuminate the forest floor below, where jaguars stalk silently through the undergrowth. Scarlet macaws burst from the treetops in flashes of red and blue, screeching as they cross the open air above the river.

The Amazon River winds through the jungle like a brown serpent — wide, slow, and teeming with life. Pink river dolphins surface alongside wooden canoes, while fishermen cast nets into the murky water at dawn. Piranhas dart in silver schools beneath the surface, visible only when the sun catches their scales just right.

But this magnificent world is shrinking. Satellite footage shows vast corridors of forest reduced to smoldering ash, cleared for cattle ranches and soybean fields. Bulldozers tear through ancient trees while plumes of smoke rise into the sky and drift across entire states. Indigenous communities stand at the edge of cleared land, watching the horizon where their forest once stood.

Conservation teams trek through the remaining jungle, tagging wildlife and planting seedlings in cleared patches. Camera traps capture rare footage of tapirs, giant anteaters, and ocelots navigating a landscape cut apart by dirt roads. The race to protect what remains is happening in real time — every hectare saved a small victory against a relentless tide.`,

  `The starting gun fires and dozens of electric motorcycles launch off the line simultaneously, their silence broken only by the whine of motors and the screech of tires on asphalt. Riders lean hard into the first hairpin corner, knee sliders grazing the track as they thread through at over 150 miles per hour.

In the pit lane, mechanics crouch over exposed battery packs, swapping modules with practiced precision. Holographic displays on the pit wall show live telemetry — temperature gradients across the battery cells, torque curves, regenerative braking data scrolling in green numbers on black screens.

Off the track, the technology is reshaping everyday streets. Charging stations glow in the predawn light of highway rest stops, rows of cables snaking into cars parked under LED canopies. Inside a gigafactory, robotic arms weld battery casings in showers of sparks while autonomous forklifts ferry components across a floor the size of several city blocks.

Wind farms stretch across ridge lines at sunset, their blades spinning slowly against an orange sky, feeding power into the grid that will charge tomorrow's morning commute. On a coastal road, a single electric sedan moves silently past crashing waves — no exhaust, no noise, just the hiss of tires on wet pavement and the open road ahead.`,
]

type InputMode = 'script' | 'keywords'

export default function ScriptInput() {
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const isGuest = authStatus !== 'loading' && !session
  const {
    setScript, addSegments, setIsAnalyzing, setError, reset,
    showUpgradeModal, setShowUpgradeModal,
    setScriptChunks, setSavedScriptContext,
    videoOrientation, setVideoOrientation,
    setIsExampleScript, setIsKeywordMode,
  } = useAppStore()

  const [inputMode, setInputMode] = useState<InputMode>('keywords')
  const [localScript, setLocalScript] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tooltipDismissed, setTooltipDismissed] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const keywordInputRef = useRef<HTMLInputElement>(null)

  const { credits } = useCredits()
  // null = unauthenticated (no limit enforced — guests are free up to auth gate)
  const keywordLimit = credits !== null ? credits : null
  const atKeywordLimit = keywordLimit !== null && keywords.length >= keywordLimit
  const remainingSlots = keywordLimit !== null ? Math.max(0, keywordLimit - keywords.length) : null

  const showExampleTooltip = isGuest && !tooltipDismissed && !localScript && inputMode === 'script'

  const wordCount = localScript.trim() ? localScript.trim().split(/\s+/).length : 0
  const charCount = localScript.length

  const handleExample = () => {
    const example = EXAMPLE_SCRIPTS[Math.floor(Math.random() * EXAMPLE_SCRIPTS.length)]
    setLocalScript(example)
    setTooltipDismissed(true)
    textareaRef.current?.focus()
    trackEvent('Home — Try an Example')
  }

  // ── Keyword helpers ──────────────────────────────────────────────────────

  const addKeywordsFromString = useCallback((raw: string) => {
    const parsed = raw
      .split(/[,\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    if (parsed.length === 0) return
    setKeywords((prev) => {
      const existing = new Set(prev.map((k) => k.toLowerCase()))
      const fresh = parsed.filter((k) => !existing.has(k.toLowerCase()))
      // Respect credit limit for authenticated users
      const available = keywordLimit !== null ? Math.max(0, keywordLimit - prev.length) : fresh.length
      return [...prev, ...fresh.slice(0, available)]
    })
  }, [keywordLimit])

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (keywordInput.trim()) {
        addKeywordsFromString(keywordInput)
        setKeywordInput('')
      }
    } else if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1))
    }
  }

  const handleKeywordInputBlur = () => {
    if (keywordInput.trim()) {
      addKeywordsFromString(keywordInput)
      setKeywordInput('')
    }
  }

  const removeKeyword = (idx: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Script submit ────────────────────────────────────────────────────────

  const handleScriptSubmit = async () => {
    if (!localScript.trim() || isSubmitting) return

    trackEvent('Home — Find B-Roll', {
      word_count: localScript.trim().split(/\s+/).length,
      video_orientation: videoOrientation,
    })

    const trimmedScript = localScript.trim()
    const isExample = EXAMPLE_SCRIPTS.some((ex) => ex.trim() === trimmedScript)
    setIsSubmitting(true)
    reset()
    setScript(trimmedScript)
    setIsExampleScript(isExample)
    setIsKeywordMode(false)

    const chunks = splitIntoChunks(trimmedScript)
    setScriptChunks(
      chunks.map((c) => c.offset),
      chunks.length
    )

    try {
      setIsAnalyzing(true)
      const prevCount = parseInt(localStorage.getItem('clipscout_script_count') ?? '0', 10)
      localStorage.setItem('clipscout_script_count', String(prevCount + 1))
      router.push('/results')

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: trimmedScript }),
      })

      if (!analyzeRes.ok || !analyzeRes.body) {
        const err = await analyzeRes.json()
        if (analyzeRes.status === 402 || err.error === 'INSUFFICIENT_CREDITS') {
          setIsAnalyzing(false)
          setShowUpgradeModal(true)
          setIsSubmitting(false)
          return
        }
        throw new Error(err.error || 'Failed to analyze script')
      }

      const reader = analyzeRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
            setIsAnalyzing(false)
            setShowUpgradeModal(true)
            setIsSubmitting(false)
            return
          }
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.chunkMeta) {
            setScriptChunks(
              parsed.chunkMeta.map((c: { offset: number }) => c.offset),
              parsed.chunkMeta.length
            )
          }
          if (parsed.scriptContext) {
            setSavedScriptContext(parsed.scriptContext)
          }
          if (parsed.segments) {
            addSegments(parsed.segments)
          }
        }
      }

      setIsAnalyzing(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setIsAnalyzing(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Keywords submit ──────────────────────────────────────────────────────

  const handleKeywordsSubmit = () => {
    // Flush any partially typed keyword first
    const finalKeywords = [...keywords]
    if (keywordInput.trim()) {
      const extra = keywordInput
        .split(/[,\n]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
      extra.forEach((k) => {
        if (!finalKeywords.map((f) => f.toLowerCase()).includes(k.toLowerCase())) {
          finalKeywords.push(k)
        }
      })
    }

    if (finalKeywords.length === 0 || isSubmitting) return

    trackEvent('Home — Keywords Search', {
      keyword_count: finalKeywords.length,
      video_orientation: videoOrientation,
    })

    setIsSubmitting(true)
    reset()
    setIsKeywordMode(true)
    setIsExampleScript(false)

    const keywordString = finalKeywords.join(', ')
    setScript(keywordString)
    setScriptChunks([0], 1)

    const kwSegments = finalKeywords.map((kw, i) => ({
      id: `kw_${i}_${Date.now()}`,
      text: kw,
      topic: kw,
      searchQueries: [kw],
      startIndex: i,
      endIndex: i,
      chapter: 1,
    }))
    addSegments(kwSegments)

    router.push('/results')
    setIsSubmitting(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} isFreeTrial={true} />}
      <div className="w-full max-w-3xl mx-auto space-y-4">

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-white/50 border border-purple-200 rounded-xl p-1 w-fit">
          {(['keywords', 'script'] as InputMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setInputMode(m); trackEvent(m === 'keywords' ? 'Keywords Toggle Option Clicked' : 'Script Toggle Option Clicked') }}
              className={[
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 capitalize',
                inputMode === m
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-600 hover:bg-purple-100',
              ].join(' ')}
            >
              {m === 'script' ? 'Script' : 'Keywords'}
            </button>
          ))}
        </div>

        {inputMode === 'script' ? (
          /* ── Script mode ── */
          <div className="relative group">
            <textarea
              ref={textareaRef}
              value={localScript}
              onChange={(e) => setLocalScript(e.target.value)}
              placeholder="Paste your video script here…

The app will identify every visually descriptive moment — like 'towering skyscrapers reflect the morning sun' or 'children playing in a park' — and find matching B-roll footage automatically."
              rows={14}
              className="w-full bg-white/60 border border-purple-200 text-purple-950 placeholder-purple-400 rounded-xl px-5 py-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 font-mono backdrop-blur-sm"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleScriptSubmit()
              }}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-3">
              <span className="text-xs text-purple-400">
                {wordCount > 0 && `${wordCount.toLocaleString()} words · ${charCount.toLocaleString()} chars`}
              </span>
            </div>
          </div>
        ) : (
          /* ── Keywords mode ── */
          <div
            className="min-h-[120px] bg-white/60 border border-purple-200 rounded-xl px-4 py-3 flex flex-col gap-3 focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-transparent transition-all duration-200 backdrop-blur-sm cursor-text"
            onClick={() => keywordInputRef.current?.focus()}
          >
            {/* Chips */}
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 bg-purple-100 border border-purple-200 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-full"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeKeyword(i) }}
                      className="text-purple-400 hover:text-purple-700 transition-colors leading-none"
                      aria-label={`Remove ${kw}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              ref={keywordInputRef}
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              onBlur={handleKeywordInputBlur}
              disabled={atKeywordLimit}
              placeholder={
                atKeywordLimit
                  ? 'Keyword limit reached'
                  : keywords.length === 0
                  ? 'Type a keyword and press Enter — e.g. sunset beach, city traffic, coffee shop…'
                  : 'Add another keyword…'
              }
              className="flex-1 bg-transparent text-purple-950 placeholder-purple-400 text-sm focus:outline-none min-w-[200px] disabled:cursor-not-allowed"
            />

            {/* Credit limit helper */}
            {atKeywordLimit ? (
              <p className="text-[11px] text-amber-600 flex items-center gap-1.5">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                You've used all {keywordLimit} of your credits.{' '}
                <a href="/pricing" className="font-semibold underline underline-offset-2 hover:text-amber-800 transition-colors">
                  Buy more →
                </a>
              </p>
            ) : remainingSlots !== null ? (
              <div className="space-y-1">
                <p className="text-[11px] text-purple-500 italic">Tip: the more descriptive your keywords, the better the results — e.g. "golden hour beach waves" beats "beach".</p>
                <p className="text-[11px] text-purple-400 flex items-center justify-between">
                  <span>
                    Press <kbd className="bg-purple-100 border border-purple-200 px-1 py-0.5 rounded text-[10px]">Enter</kbd> or <kbd className="bg-purple-100 border border-purple-200 px-1 py-0.5 rounded text-[10px]">,</kbd> after each keyword · Each keyword uses 1 credit
                  </span>
                  <span className={['font-semibold ml-3 shrink-0', remainingSlots <= 2 ? 'text-amber-500' : 'text-purple-400'].join(' ')}>
                    {remainingSlots} credit{remainingSlots !== 1 ? 's' : ''} remaining
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] text-purple-500 italic">Tip: the more descriptive your keywords, the better the results — e.g. "golden hour beach waves" beats "beach".</p>
                <p className="text-[11px] text-purple-400">
                  Press <kbd className="bg-purple-100 border border-purple-200 px-1 py-0.5 rounded text-[10px]">Enter</kbd> or <kbd className="bg-purple-100 border border-purple-200 px-1 py-0.5 rounded text-[10px]">,</kbd> after each keyword · Each keyword gets its own set of clips
                </p>
              </div>
            )}
          </div>
        )}

        {/* Orientation filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-purple-600 shrink-0">Video format</span>
          <div className="flex items-center gap-1.5 bg-white/50 border border-purple-200 rounded-xl p-1">
            {([
              { value: 'both',       label: 'Both',       icon: '▣' },
              { value: 'horizontal', label: 'Horizontal', icon: '▬' },
              { value: 'vertical',   label: 'Vertical',   icon: '▮' },
            ] as { value: VideoOrientation; label: string; icon: string }[]).map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => {
                  setVideoOrientation(value)
                  trackEvent(`Home — Video Format — ${label}`)
                }}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  videoOrientation === value
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-600 hover:bg-purple-100',
                ].join(' ')}
              >
                <span className="text-[10px] leading-none">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={inputMode === 'script' ? handleScriptSubmit : handleKeywordsSubmit}
            disabled={
              isSubmitting ||
              (inputMode === 'script' ? !localScript.trim() : keywords.length === 0 && !keywordInput.trim())
            }
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-100 disabled:text-purple-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {inputMode === 'script' ? 'Analyzing…' : 'Loading…'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                Find B-Roll
                {inputMode === 'script' && <span className="text-purple-200 text-xs font-normal">⌘↵</span>}
              </>
            )}
          </button>

          {/* "Try an example" only shown in script mode */}
          {inputMode === 'script' && (
            <div className="relative">
              {showExampleTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 animate-bounce-subtle pointer-events-none z-10">
                  <div className="bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg shadow-purple-900/30 whitespace-nowrap">
                    Click to test with an example script
                  </div>
                  <div className="flex justify-center">
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-purple-700" />
                  </div>
                </div>
              )}
              <button
                onClick={handleExample}
                className="px-4 py-3 rounded-xl border border-purple-200 text-purple-600 hover:text-purple-900 hover:border-purple-400 text-sm transition-all duration-200 bg-white/40"
              >
                Try an example
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
