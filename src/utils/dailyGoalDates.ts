import { validateDailyGoalDate } from './dailyGoalValidation'

const dateKey = (date: Date) => `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Parse a calendar date at local noon to avoid UTC and DST date shifts. */
export function parseDailyGoalDate(value: string): Date {
  validateDailyGoalDate(value)
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date
}

export function getTodayLocalDate(now = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Enter a valid current date.')
  return dateKey(now)
}

export function formatDailyGoalDate(value: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    .format(parseDailyGoalDate(value))
}

export function addCalendarDays(value: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error('Day offset must be an integer.')
  const date = parseDailyGoalDate(value)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

export function getPreviousDay(value: string): string { return addCalendarDays(value, -1) }
export function getNextDay(value: string): string { return addCalendarDays(value, 1) }

export function getWeekStart(value: string): string {
  const date = parseDailyGoalDate(value)
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  return dateKey(date)
}

export function getWeekEnd(value: string): string { return addCalendarDays(getWeekStart(value), 6) }

export function getWeekDates(value: string): string[] {
  const start = getWeekStart(value)
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index))
}

export function isDateInWeek(value: string, weekDate: string): boolean {
  parseDailyGoalDate(value)
  const start = getWeekStart(weekDate)
  return value >= start && value <= getWeekEnd(weekDate)
}
