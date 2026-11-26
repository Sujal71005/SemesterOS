import type { SubjectProgress } from '../utils/syllabusProgress'
import type { AssignmentStatus } from './assignments'
import type { DailyGoalCategory, DailyGoalPriority } from './dailyGoals'
import type { SessionCategory } from './studyPlanner'

export type AnalyticsDateRange = { startDate: string; endDate: string }
export type AnalyticsRangeSelection =
  | { kind: 'weekly'; date: string }
  | { kind: 'monthly'; date: string }
  | { kind: 'custom'; startDate: string; endDate: string }
export type CountProgress = { total: number; completed: number; pending: number; remaining: number; percentage: number }
export type AcademicAnalytics = CountProgress & {
  subjects: Array<SubjectProgress & { name: string; hasSyllabus: boolean }>
  theory: CountProgress
  practical: CountProgress
  subjectsWithoutSyllabus: Array<{ id: string; name: string }>
}
export type StatusDistribution<K extends string> = Record<K, number>
export type DateTrend = { date: string; total: number; completed: number; pending: number; future: number }
export type CountTrend = { date: string; count: number }
export type PeriodTrend = CountProgress & { startDate: string; endDate: string }
export type CategoryBreakdown<K extends string> = Record<K, CountProgress>
export type AssignmentAnalytics = {
  total: number; statuses: StatusDistribution<AssignmentStatus>; pending: number; submitted: number; done: number
  overdue: number; completionPercentage: number
  createdDateTrend: CountTrend[]; dueDateTrend: CountTrend[]
}
export type DailyGoalsAnalytics = CountProgress & {
  categories: CategoryBreakdown<DailyGoalCategory>
  priorities: CategoryBreakdown<DailyGoalPriority>
  futureGoals: number
  dailyTrend: DateTrend[]; weeklyTrend: PeriodTrend[]; monthlyTrend: PeriodTrend[]
}
export type StudyDurationProgress = { scheduledMinutes: number; completedScheduledMinutes: number }
export type StudyOccurrenceCounts = { total: number; completed: number; skipped: number; explicitlyPlanned: number; unlogged: number }
export type StudyCategoryBreakdown = Record<SessionCategory, StudyOccurrenceCounts & StudyDurationProgress>
export type StudyTrend = StudyOccurrenceCounts & StudyDurationProgress & { date: string }
export type StudyPlannerAnalytics = StudyOccurrenceCounts & StudyDurationProgress & {
  categoryBreakdown: StudyCategoryBreakdown
  personalStudy: StudyDurationProgress
  lecture: StudyDurationProgress
  practical: StudyDurationProgress
  dailyTrend: StudyTrend[]
  weeklyTrend: Array<StudyTrend & { startDate: string; endDate: string }>
}
