import { SURVEY_QUESTIONS, SurveyAnswers } from './onboarding-config'

/**
 * Compute the "you waste X hours/year" stat shown on the impact screen.
 * Falls back to a reasonable estimate if the user skipped the relevant
 * questions (shouldn't be possible in current flow, but defensive).
 */
export interface ImpactStats {
  minutesPerVideo: number
  videosPerMonth: number
  hoursPerMonth: number
  hoursPerYear: number
  workWeeksPerYear: number
}

const DEFAULT_MINUTES = 60
const DEFAULT_VIDEOS = 4

function findOption(questionId: string, optionId: string) {
  const q = SURVEY_QUESTIONS.find((qq) => qq.id === questionId)
  if (!q) return undefined
  return q.options.find((o) => o.id === optionId)
}

export function calculateImpact(answers: SurveyAnswers): ImpactStats {
  const timeAnswer = answers['time_per_video']
  const videoAnswer = answers['videos_per_month']

  const timeOpt =
    typeof timeAnswer === 'string'
      ? findOption('time_per_video', timeAnswer)
      : undefined
  const videoOpt =
    typeof videoAnswer === 'string'
      ? findOption('videos_per_month', videoAnswer)
      : undefined

  const minutesPerVideo = timeOpt?.minutes ?? DEFAULT_MINUTES
  const videosPerMonth = videoOpt?.count ?? DEFAULT_VIDEOS

  const hoursPerMonth = (minutesPerVideo * videosPerMonth) / 60
  const hoursPerYear = hoursPerMonth * 12
  const workWeeksPerYear = hoursPerYear / 40

  return {
    minutesPerVideo,
    videosPerMonth,
    hoursPerMonth,
    hoursPerYear,
    workWeeksPerYear,
  }
}

/** Pretty-print hours: 96 → "96", 5.4 → "5". Avoid awkward decimals. */
export function formatHours(hours: number): string {
  if (hours < 10) return hours.toFixed(1).replace(/\.0$/, '')
  return Math.round(hours).toString()
}

/** Pretty-print work weeks: 2.4 → "2.4", 0.3 → "0.3". */
export function formatWeeks(weeks: number): string {
  if (weeks < 1) return weeks.toFixed(1)
  if (weeks < 10) return weeks.toFixed(1).replace(/\.0$/, '')
  return Math.round(weeks).toString()
}
