import type { AnalyticsDateRange } from '../types/analytics'
import type { Subject, SyllabusModule, SyllabusTopic } from '../types/academics'
import type { AssignmentWithSubject } from '../types/assignments'
import type { DailyGoal } from '../types/dailyGoals'
import type { StudySessionLog, StudySessionWithSubject } from '../types/studyPlanner'

export type AnalyticsDataset<T> =
  | { status: 'available'; data: T }
  | { status: 'unavailable'; error: string }
export type AnalyticsDatasets = {
  academics: AnalyticsDataset<{ subjects: Subject[]; modules: SyllabusModule[]; topics: SyllabusTopic[] }>
  /** All-time rows; status counts are current state, while date trends are range-filtered by calculations. */
  assignments: AnalyticsDataset<AssignmentWithSubject[]>
  /** Rows bounded by the selected local goal_date range. */
  dailyGoals: AnalyticsDataset<DailyGoal[]>
  /** Session definitions are loaded as a whole so recurrence can be expanded inside the selected range. */
  studySessions: AnalyticsDataset<StudySessionWithSubject[]>
  /** Logs are bounded by the selected local occurrence_date range. */
  studySessionLogs: AnalyticsDataset<StudySessionLog[]>
}
export type AnalyticsLoadResult =
  | { status: 'stale'; requestId: number; range: AnalyticsDateRange; comparisonRange?: AnalyticsDateRange }
  | { status: 'complete' | 'partial' | 'unavailable'; requestId: number; range: AnalyticsDateRange; comparisonRange?: AnalyticsDateRange; datasets: AnalyticsDatasets }

export type AnalyticsDataDependencies = {
  loadAcademics: () => Promise<AnalyticsDatasets['academics'] extends AnalyticsDataset<infer T> ? T : never>
  loadAssignments: () => Promise<AssignmentWithSubject[]>
  loadDailyGoals: (range: AnalyticsDateRange) => Promise<DailyGoal[]>
  loadStudySessions: () => Promise<StudySessionWithSubject[]>
  loadStudySessionLogs: (range: AnalyticsDateRange) => Promise<StudySessionLog[]>
}

function message(cause: unknown): string { return cause instanceof Error ? cause.message : 'Could not load this analytics dataset.' }
async function capture<T>(load: () => Promise<T>): Promise<AnalyticsDataset<T>> {
  try { return { status: 'available', data: await load() } }
  catch (cause) { return { status: 'unavailable', error: message(cause) } }
}
function rangeKey(range: AnalyticsDateRange, comparisonRange?: AnalyticsDateRange): string {
  return `${range.startDate}:${range.endDate}:${comparisonRange?.startDate ?? ''}:${comparisonRange?.endDate ?? ''}`
}
function queryRange(range: AnalyticsDateRange, comparisonRange?: AnalyticsDateRange): AnalyticsDateRange {
  if (!comparisonRange) return range
  return {
    startDate: range.startDate < comparisonRange.startDate ? range.startDate : comparisonRange.startDate,
    endDate: range.endDate > comparisonRange.endDate ? range.endDate : comparisonRange.endDate,
  }
}

/** Injectable and in-flight deduplicating loader. Older range responses resolve as stale. */
export function createAnalyticsDataLoader(dependencies: AnalyticsDataDependencies) {
  let requestId = 0
  const inFlight = new Map<string, { requestId: number; promise: Promise<AnalyticsLoadResult> }>()
  return (range: AnalyticsDateRange, comparisonRange?: AnalyticsDateRange): Promise<AnalyticsLoadResult> => {
    const key = rangeKey(range, comparisonRange)
    const pending = inFlight.get(key)
    if (pending && pending.requestId === requestId) return pending.promise
    const id = ++requestId
    const fetchRange = queryRange(range, comparisonRange)
    const load = async (): Promise<AnalyticsLoadResult> => {
      const [academics, assignments, dailyGoals, studySessions, studySessionLogs] = await Promise.all([
        capture(dependencies.loadAcademics),
        capture(dependencies.loadAssignments),
        capture(() => dependencies.loadDailyGoals(fetchRange)),
        capture(dependencies.loadStudySessions),
        capture(() => dependencies.loadStudySessionLogs(fetchRange)),
      ])
      if (id !== requestId) return { status: 'stale', requestId: id, range, comparisonRange }
      const datasets = { academics, assignments, dailyGoals, studySessions, studySessionLogs }
      const states = Object.values(datasets)
      const available = states.filter((item) => item.status === 'available').length
      return {
        status: available === states.length ? 'complete' : available === 0 ? 'unavailable' : 'partial',
        requestId: id, range, comparisonRange, datasets,
      }
    }
    const promise = load().finally(() => { if (inFlight.get(key)?.promise === promise) inFlight.delete(key) })
    inFlight.set(key, { requestId: id, promise })
    return promise
  }
}
