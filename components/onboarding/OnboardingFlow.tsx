'use client'

import { useEffect, useMemo, useState } from 'react'
import OnboardingShell from './OnboardingShell'
import ValueScreens from './ValueScreens'
import SurveyStep from './SurveyStep'
import ImpactScreen from './ImpactScreen'
import TrialOffer from './TrialOffer'
import {
  VALUE_SCREENS,
  SURVEY_QUESTIONS,
  SurveyAnswers,
} from '@/lib/onboarding-config'
import { trackEvent } from '@/lib/analytics'

/**
 * Multi-step state machine for the new-user funnel. Pure UI — agnostic about
 * whether it lives inside a modal, a dedicated page, or anywhere else.
 */
type Phase = 'value' | 'survey' | 'impact' | 'offer'

interface Step {
  phase: Phase
  /** Phase-local index (which slide / which question). */
  index: number
}

function buildSteps(): Step[] {
  const steps: Step[] = []
  VALUE_SCREENS.forEach((_, i) => steps.push({ phase: 'value', index: i }))
  SURVEY_QUESTIONS.forEach((_, i) => steps.push({ phase: 'survey', index: i }))
  steps.push({ phase: 'impact', index: 0 })
  steps.push({ phase: 'offer', index: 0 })
  return steps
}

interface OnboardingFlowProps {
  /** Called after the user successfully starts checkout (no-op for now since
   *  we redirect to Stripe, but reserved for non-trial completion paths). */
  onComplete?: () => void
  /**
   * When true, jump straight to the TrialOffer step. Used for users who
   * already filled out the survey but bailed at the Stripe checkout — no
   * point in re-asking 6 questions they already answered.
   */
  skipToTrialOffer?: boolean
}

export default function OnboardingFlow({
  onComplete: _onComplete,
  skipToTrialOffer = false,
}: OnboardingFlowProps) {
  const steps = useMemo(buildSteps, [])
  const totalSteps = steps.length

  // Find the index of the 'offer' step at module init — used both as the
  // initial step when skipping and to keep the back button safe (we don't
  // want to let returning users navigate back into the survey they already
  // completed; the data is already saved server-side anyway).
  const offerStepIndex = useMemo(
    () => steps.findIndex((s) => s.phase === 'offer'),
    [steps],
  )

  const [currentStep, setCurrentStep] = useState(() =>
    skipToTrialOffer && offerStepIndex >= 0 ? offerStepIndex : 0,
  )
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [isStartingTrial, setIsStartingTrial] = useState(false)

  useEffect(() => {
    trackEvent('Onboarding — Started', { resumed: skipToTrialOffer })
  }, [skipToTrialOffer])

  const step = steps[currentStep]

  const scrollFlowToTop = () => {
    // Find the scroll container (the modal's overflow-y-auto wrapper) and
    // reset it. We also reset window scroll as a fallback for page-mounted use.
    if (typeof document !== 'undefined') {
      const scroller = document.getElementById('onboarding-scroller')
      if (scroller) scroller.scrollTop = 0
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1)
      scrollFlowToTop()
    }
  }

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
      scrollFlowToTop()
    }
  }

  const handleSurveyChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  /**
   * Free-text values for "other"-style options live under their own keys in
   * the same answers map (e.g. `current_sources_other_text`). The /complete
   * endpoint just dumps the whole map into the JSONB column, so no special
   * server-side handling is needed.
   */
  const freeTextKey = (questionId: string, optionId: string) =>
    `${questionId}_${optionId}_text`

  const handleFreeTextChange = (questionId: string, optionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [freeTextKey(questionId, optionId)]: text }))
  }

  const collectFreeTextValues = (questionId: string): Record<string, string> => {
    const question = SURVEY_QUESTIONS.find((q) => q.id === questionId)
    if (!question) return {}
    const out: Record<string, string> = {}
    for (const option of question.options) {
      if (!option.freeText) continue
      const v = answers[freeTextKey(questionId, option.id)]
      if (typeof v === 'string') out[option.id] = v
    }
    return out
  }

  const handleStartTrial = async (interval: 'monthly' | 'annual') => {
    setIsStartingTrial(true)
    try {
      // Persist survey responses BEFORE the redirect so we never lose them,
      // and so the user isn't trapped in onboarding if they close the Stripe tab.
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: answers,
          selected_interval: interval,
        }),
      })

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: 'creator',
          interval,
          trial: true,
          from: 'onboarding',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      console.error('[onboarding] start trial failed', err)
      setIsStartingTrial(false)
      alert(err instanceof Error ? err.message : 'Something went wrong starting your trial.')
    }
  }

  // Disable Back for users who jumped straight to the offer — letting them
  // navigate into survey/value screens with empty answers would just create
  // a half-broken experience. They've already answered, server has the data.
  const canGoBack = !skipToTrialOffer && currentStep > 0

  return (
    <OnboardingShell
      stepIndex={currentStep}
      totalSteps={totalSteps}
      onBack={canGoBack ? goBack : undefined}
    >
      {step.phase === 'value' && (
        <ValueScreens slideIndex={step.index} onContinue={goNext} />
      )}

      {step.phase === 'survey' && (
        <SurveyStep
          question={SURVEY_QUESTIONS[step.index]}
          questionIndex={step.index}
          totalQuestions={SURVEY_QUESTIONS.length}
          value={answers[SURVEY_QUESTIONS[step.index].id]}
          onChange={(value) => handleSurveyChange(SURVEY_QUESTIONS[step.index].id, value)}
          freeTextValues={collectFreeTextValues(SURVEY_QUESTIONS[step.index].id)}
          onFreeTextChange={(optionId, text) =>
            handleFreeTextChange(SURVEY_QUESTIONS[step.index].id, optionId, text)
          }
          onContinue={goNext}
        />
      )}

      {step.phase === 'impact' && (
        <ImpactScreen answers={answers} onContinue={goNext} />
      )}

      {step.phase === 'offer' && (
        <TrialOffer
          onStartTrial={handleStartTrial}
          isLoading={isStartingTrial}
        />
      )}
    </OnboardingShell>
  )
}
