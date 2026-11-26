import { validateDailyGoalDate } from './dailyGoalValidation'

/** Validated inclusive bounds for filtering logs by their local occurrence_date column. */
export function getStudySessionLogDateBounds(startDate: string, endDate: string): { startDate: string; endDate: string } {
  const start = validateDailyGoalDate(startDate)
  const end = validateDailyGoalDate(endDate)
  if (start > end) throw new Error('Start date must not be after end date.')
  return { startDate: start, endDate: end }
}
