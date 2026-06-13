'use client'

import { useEffect } from 'react'
import { VALUE_SCREENS } from '@/lib/onboarding-config'
import { trackEvent } from '@/lib/analytics'
import ValueIcon from './ValueIcon'

interface ValueScreensProps {
  /** Which slide is showing (0-based). */
  slideIndex: number
  onContinue: () => void
}

export default function ValueScreens({ slideIndex, onContinue }: ValueScreensProps) {
  const screen = VALUE_SCREENS[slideIndex]
  const isLast = slideIndex === VALUE_SCREENS.length - 1

  useEffect(() => {
    trackEvent('Onboarding — Value Screen Viewed', {
      slide_index: slideIndex,
      slide_title: screen.title,
    })
  }, [slideIndex, screen.title])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in" key={slideIndex}>
        <ValueIcon icon={screen.icon} />

        <div className="space-y-4 max-w-md">
          <h1 className="text-3xl sm:text-4xl font-bold text-purple-950 tracking-tight">
            {screen.title}
          </h1>
          <p className="text-base sm:text-lg text-purple-700 leading-relaxed">
            {screen.body}
          </p>
        </div>

        {/* Slide indicator dots */}
        <div className="flex items-center gap-2 pt-2">
          {VALUE_SCREENS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slideIndex ? 'w-8 bg-purple-600' : 'w-1.5 bg-purple-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Sticky CTA at the bottom of the content area */}
      <div className="mt-10 sticky bottom-0">
        <button
          onClick={() => {
            trackEvent('Onboarding — Value Screen Continued', {
              slide_index: slideIndex,
              slide_title: screen.title,
            })
            onContinue()
          }}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-4 rounded-2xl text-base shadow-lg shadow-purple-300/40 transition-all"
        >
          {isLast ? 'Got it →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
