import type { AnalyticsDateRange, AnalyticsRangeSelection } from '../types/analytics'
import { addCalendarDays, getWeekEnd, getWeekStart, parseDailyGoalDate } from './dailyGoalDates'

/** Resolves presets using local YYYY-MM-DD calendar dates, without UTC conversion. */
export function resolveAnalyticsDateRange(selection: AnalyticsRangeSelection): AnalyticsDateRange {
  if (selection.kind === 'weekly') {
    const anchor = parseDailyGoalDate(selection.date)
    const date = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`
    return { startDate: getWeekStart(date), endDate: getWeekEnd(date) }
  }
  if (selection.kind === 'monthly') {
    const anchor = parseDailyGoalDate(selection.date)
    const year = anchor.getFullYear()
    const month = anchor.getMonth() + 1
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0, 12).getDate()).padStart(2, '0')}`
    return { startDate, endDate }
  }
  parseDailyGoalDate(selection.startDate)
  parseDailyGoalDate(selection.endDate)
  if (selection.startDate > selection.endDate) throw new Error('Start date must not be after end date.')
  return { startDate: selection.startDate, endDate: selection.endDate }
}

/** Returns the immediately preceding comparable period using inclusive local dates. */
export function getPreviousAnalyticsDateRange(selection: AnalyticsRangeSelection): AnalyticsDateRange {
  const current = resolveAnalyticsDateRange(selection)
  if (selection.kind === 'weekly') {
    return { startDate: addCalendarDays(current.startDate, -7), endDate: addCalendarDays(current.startDate, -1) }
  }
  if (selection.kind === 'monthly') {
    const endDate = addCalendarDays(current.startDate, -1)
    const priorMonth = parseDailyGoalDate(endDate)
    priorMonth.setDate(1)
    const startDate = `${priorMonth.getFullYear()}-${String(priorMonth.getMonth() + 1).padStart(2, '0')}-01`
    return { startDate, endDate }
  }
  const duration = Math.round((parseDailyGoalDate(current.endDate).getTime() - parseDailyGoalDate(current.startDate).getTime()) / 86_400_000) + 1
  const endDate = addCalendarDays(current.startDate, -1)
  return { startDate: addCalendarDays(endDate, 1 - duration), endDate }
}
