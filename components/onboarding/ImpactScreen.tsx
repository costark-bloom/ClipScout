'use client'

import { useEffect } from 'react'
import { SurveyAnswers } from '@/lib/onboarding-config'
import { calculateImpact, formatHours, formatWeeks } from '@/lib/onboarding-math'
import { trackEvent } from '@/lib/analytics'

interface ImpactScreenProps {
  answers: SurveyAnswers
  onContinue: () => void
}

export default function ImpactScreen({ answers, onContinue }: ImpactScreenProps) {
  const stats = calculateImpact(answers)

  useEffect(() => {
    trackEvent('Onboarding — Impact Screen Viewed', {
      minutes_per_video: stats.minutesPerVideo,
      videos_per_month: stats.videosPerMonth,
      hours_per_year: Math.round(stats.hoursPerYear),
    })
  }, [stats.minutesPerVideo, stats.videosPerMonth, stats.hoursPerYear])

  const hoursStr = formatHours(stats.hoursPerYear)
  const weeksStr = formatWeeks(stats.workWeeksPerYear)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
        {/* Hero number */}
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-purple-500">
            Your estimate
          </p>
          <div className="relative">
            <div className="text-7xl sm:text-8xl font-bold bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 bg-clip-text text-transparent tabular-nums leading-none">
              {hoursStr}
            </div>
            <div className="text-xl text-purple-700 font-medium mt-2">
              hours / year
            </div>
          </div>
        </div>

        <p className="text-lg text-purple-800 leading-relaxed max-w-md">
          That&apos;s how long you spend hunting for B-roll across multiple sites — about{' '}
          <span className="font-semibold text-purple-950">{weeksStr} full work weeks</span> a year.
        </p>

        {/* Comparison card */}
        <div className="w-full max-w-md bg-white border border-purple-200 rounded-2xl p-6 shadow-md shadow-purple-100">
          <div className="flex items-stretch divide-x divide-purple-100">
            <div className="flex-1 pr-4 text-center">
              <div className="text-xs uppercase tracking-wider font-semibold text-purple-400 mb-2">
                Today
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {stats.minutesPerVideo} min
              </div>
              <div className="text-xs text-purple-500 mt-1">per video</div>
            </div>
            <div className="flex-1 pl-4 text-center">
              <div className="text-xs uppercase tracking-wider font-semibold text-indigo-500 mb-2">
                With ClipScout
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ~30 sec
              </div>
              <div className="text-xs text-purple-500 mt-1">per video</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-purple-600 max-w-md">
          We built ClipScout so you can stop tab-hopping and get back to creating.
        </p>
      </div>

      <div className="mt-10 sticky bottom-0">
        <button
          onClick={() => {
            trackEvent('Onboarding — Impact Screen Continued', {
              hours_per_year: Math.round(stats.hoursPerYear),
            })
            onContinue()
          }}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-4 rounded-2xl text-base shadow-lg shadow-purple-300/40 transition-all"
        >
          Show me my offer →
        </button>
      </div>
    </div>
  )
}
