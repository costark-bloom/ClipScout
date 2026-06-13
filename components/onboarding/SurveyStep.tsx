'use client'

import { useEffect } from 'react'
import { SurveyQuestion } from '@/lib/onboarding-config'
import { trackEvent } from '@/lib/analytics'

interface SurveyStepProps {
  question: SurveyQuestion
  /** Index of this question in the survey, used for analytics. */
  questionIndex: number
  totalQuestions: number
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
  /** Current freeform text values, keyed by option id. Only relevant when an
   *  option has `freeText: true` in the config. */
  freeTextValues?: Record<string, string>
  onFreeTextChange?: (optionId: string, text: string) => void
  onContinue: () => void
}

export default function SurveyStep({
  question,
  questionIndex,
  totalQuestions,
  value,
  onChange,
  freeTextValues,
  onFreeTextChange,
  onContinue,
}: SurveyStepProps) {
  useEffect(() => {
    trackEvent('Onboarding — Survey Question Viewed', {
      question_id: question.id,
      question_index: questionIndex,
    })
  }, [question.id, questionIndex])

  const isMulti = question.type === 'multi'
  const selectedIds = isMulti
    ? Array.isArray(value)
      ? value
      : []
    : typeof value === 'string'
      ? [value]
      : []

  const isSelected = (id: string) => selectedIds.includes(id)
  const canContinue = selectedIds.length > 0

  const handleSelect = (id: string) => {
    if (isMulti) {
      const next = isSelected(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
      onChange(next)
      return
    }
    // Single-select: pick + auto-advance for a snappier feel
    onChange(id)
    // Tiny delay so the user sees the highlight before moving on
    setTimeout(() => {
      trackEvent('Onboarding — Survey Answered', {
        question_id: question.id,
        answer: id,
      })
      onContinue()
    }, 220)
  }

  const handleMultiContinue = () => {
    if (!canContinue) return
    trackEvent('Onboarding — Survey Answered', {
      question_id: question.id,
      answer: selectedIds.join(','),
      answer_count: selectedIds.length,
    })
    onContinue()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-8 animate-fade-in" key={question.id}>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-500">
            Question {questionIndex + 1} of {totalQuestions}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-950 tracking-tight text-balance">
            {question.question}
          </h1>
          {isMulti && (
            <p className="text-sm text-purple-600">Select all that apply.</p>
          )}
        </div>

        <div className="space-y-2.5">
          {question.options.map((option) => {
            const selected = isSelected(option.id)
            // Free-text input is only meaningful on multi-select questions —
            // single-select would auto-advance before the user can type.
            const showFreeText = selected && isMulti && option.freeText
            return (
              <div key={option.id}>
                <button
                  onClick={() => handleSelect(option.id)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 flex items-center gap-4 ${
                    selected
                      ? 'border-purple-600 bg-purple-50 shadow-md shadow-purple-200/50'
                      : 'border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50/50'
                  }`}
                >
                  {/* Selection indicator */}
                  <div
                    className={`shrink-0 w-6 h-6 ${
                      isMulti ? 'rounded-md' : 'rounded-full'
                    } border-2 flex items-center justify-center transition-colors ${
                      selected ? 'border-purple-600 bg-purple-600' : 'border-purple-300 bg-white'
                    }`}
                  >
                    {selected && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-base font-medium ${
                      selected ? 'text-purple-950' : 'text-purple-800'
                    }`}
                  >
                    {option.label}
                  </span>
                </button>

                {showFreeText && (
                  <div className="mt-2 pl-3 animate-fade-in">
                    <input
                      type="text"
                      autoFocus
                      value={freeTextValues?.[option.id] ?? ''}
                      onChange={(e) => onFreeTextChange?.(option.id, e.target.value)}
                      placeholder={option.freeTextPlaceholder ?? 'Tell us more (optional)'}
                      maxLength={200}
                      className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 bg-white text-purple-950 placeholder-purple-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-sm"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Continue button only needed for multi-select (single auto-advances) */}
      {isMulti && (
        <div className="mt-10 sticky bottom-0">
          <button
            onClick={handleMultiContinue}
            disabled={!canContinue}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-purple-200 disabled:to-purple-200 disabled:cursor-not-allowed disabled:text-purple-400 text-white font-semibold py-4 rounded-2xl text-base shadow-lg shadow-purple-300/40 transition-all"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}
