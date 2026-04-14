'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useAppStore from '@/store/useAppStore'

const EXAMPLE_SCRIPTS = [
  `The Amazon rainforest, often called the "lungs of the Earth," produces about 20% of the world's oxygen. Stretching across nine countries in South America, this vast jungle is home to an estimated 10% of all species on Earth. Towering trees rise over 50 meters into the sky, forming a dense canopy that blocks out sunlight. Jaguars prowl the forest floor while colorful macaws fly overhead. Rivers wind through the jungle, teeming with piranhas and pink river dolphins. But this incredible ecosystem is under threat — deforestation rates have reached alarming levels, with fires and logging destroying millions of acres each year.`,
  `Electric vehicles are transforming how we think about transportation. Modern EVs can travel over 300 miles on a single charge, with charging stations now appearing in parking lots, shopping malls, and highways across the country. Inside, the cabins are minimalist and tech-forward — large touchscreens replacing traditional dashboards. Manufacturing plants hum with robotic arms assembling battery packs with precision. On the road, the silent acceleration of an electric motor feels nothing like a gasoline engine. Meanwhile, wind turbines and solar panels are increasingly powering the grid that charges them.`,
]

export default function ScriptInput() {
  const router = useRouter()
  const { setScript, addSegments, setIsAnalyzing, setError, reset } = useAppStore()
  const [localScript, setLocalScript] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wordCount = localScript.trim() ? localScript.trim().split(/\s+/).length : 0
  const charCount = localScript.length

  const handleExample = () => {
    const example = EXAMPLE_SCRIPTS[Math.floor(Math.random() * EXAMPLE_SCRIPTS.length)]
    setLocalScript(example)
    textareaRef.current?.focus()
  }

  const handleSubmit = async () => {
    if (!localScript.trim() || isSubmitting) return

    setIsSubmitting(true)
    reset()
    setScript(localScript.trim())

    try {
      setIsAnalyzing(true)
      router.push('/results')

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: localScript.trim() }),
      })

      if (!analyzeRes.ok || !analyzeRes.body) {
        const err = await analyzeRes.json()
        throw new Error(err.error || 'Failed to analyze script')
      }

      // Read NDJSON stream — add segments to store as each chunk completes
      const reader = analyzeRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let totalSegments = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const parsed = JSON.parse(line)
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.segments) {
            addSegments(parsed.segments)
            totalSegments += parsed.segments.length
          }
        }
      }

      if (totalSegments === 0) {
        throw new Error('No segments were identified — the AI may be busy. Please try again.')
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

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="relative group">
        <textarea
          ref={textareaRef}
          value={localScript}
          onChange={(e) => setLocalScript(e.target.value)}
          placeholder="Paste your video script here…

The app will identify every visually descriptive moment — like 'towering skyscrapers reflect the morning sun' or 'children playing in a park' — and find matching B-roll footage from YouTube, Pexels, and Pixabay."
          rows={14}
          className="w-full bg-white/60 border border-purple-200 text-purple-950 placeholder-purple-400 rounded-xl px-5 py-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 font-mono backdrop-blur-sm"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
          }}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-3">
          <span className="text-xs text-purple-400">
            {wordCount > 0 && `${wordCount.toLocaleString()} words · ${charCount.toLocaleString()} chars`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!localScript.trim() || isSubmitting}
          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-100 disabled:text-purple-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Find B-Roll
              <span className="text-purple-200 text-xs font-normal">⌘↵</span>
            </>
          )}
        </button>

        <button
          onClick={handleExample}
          className="px-4 py-3 rounded-xl border border-purple-200 text-purple-600 hover:text-purple-900 hover:border-purple-400 text-sm transition-all duration-200 bg-white/40"
        >
          Try an example
        </button>
      </div>
    </div>
  )
}
