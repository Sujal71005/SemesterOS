import { listSyllabusAnalytics } from './academics'
import { listAssignments } from './assignments'
import { listDailyGoalsByDateRange } from './dailyGoals'
import { listSessionLogsByDateRange, listStudySessions } from './studyPlanner'
import type { AnalyticsDateRange, AnalyticsRangeSelection } from '../types/analytics'
import { createAnalyticsDataLoader } from '../utils/analyticsDataLoader'
import { resolveAnalyticsDateRange } from '../utils/analyticsDateRange'

const loadRange = createAnalyticsDataLoader({
  loadAcademics: listSyllabusAnalytics,
  loadAssignments: listAssignments,
  loadDailyGoals: ({ startDate, endDate }) => listDailyGoalsByDateRange(startDate, endDate),
  loadStudySessions: listStudySessions,
  loadStudySessionLogs: ({ startDate, endDate }) => listSessionLogsByDateRange(startDate, endDate),
})

/** Resolves weekly, monthly, or custom local dates before issuing user-scoped requests. */
export function loadAnalytics(selection: AnalyticsRangeSelection) {
  return loadRange(resolveAnalyticsDateRange(selection))
}

/** Also available to callers that already resolved a local date range. */
export function loadAnalyticsForRange(range: AnalyticsDateRange, comparisonRange?: AnalyticsDateRange) {
  const selected = resolveAnalyticsDateRange({ kind: 'custom', ...range })
  const comparison = comparisonRange ? resolveAnalyticsDateRange({ kind: 'custom', ...comparisonRange }) : undefined
  return loadRange(selected, comparison)
}
