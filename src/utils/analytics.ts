import type { AcademicAnalytics, AnalyticsDateRange, AssignmentAnalytics, CountProgress, CountTrend, DailyGoalsAnalytics, DateTrend, PeriodTrend, StudyCategoryBreakdown, StudyOccurrenceCounts, StudyPlannerAnalytics, StudyTrend } from '../types/analytics'
import type { Subject, SyllabusModule, SyllabusTopic } from '../types/academics'
import type { Assignment, AssignmentStatus } from '../types/assignments'
import type { DailyGoal, DailyGoalCategory, DailyGoalPriority } from '../types/dailyGoals'
import type { SessionCategory, StudySessionLog, StudySessionWithSubject } from '../types/studyPlanner'
import { isOverdue } from './assignmentDates'
import { calculateDailyGoalProgress } from './dailyGoalProgress'
import { addCalendarDays, getWeekEnd, getWeekStart, parseDailyGoalDate } from './dailyGoalDates'
import { calculateSessionOccurrences } from './studyPlannerDates'
import { calculateSyllabusProgress } from './syllabusProgress'

const assignmentStatuses: AssignmentStatus[] = ['todo', 'in_progress', 'submitted', 'done']
const goalCategories: DailyGoalCategory[] = ['academics', 'dsa', 'coding', 'placement', 'skills', 'personal', 'other']
const goalPriorities: DailyGoalPriority[] = ['low', 'medium', 'high']
const sessionCategories: SessionCategory[] = ['lecture', 'practical', 'self_study', 'revision', 'other']
const percentage = (completed: number, total: number) => total === 0 ? 0 : Math.round(completed / total * 100)
const progress = (total: number, completed: number): CountProgress => ({ total, completed, pending: total - completed, remaining: total - completed, percentage: percentage(completed, total) })

function validateRange(range: AnalyticsDateRange): void {
  parseDailyGoalDate(range.startDate); parseDailyGoalDate(range.endDate)
  if (range.startDate > range.endDate) throw new Error('Start date must not be after end date.')
}
function datesInRange(range: AnalyticsDateRange): string[] {
  validateRange(range)
  const dates: string[] = []
  for (let date = range.startDate; date <= range.endDate; date = addCalendarDays(date, 1)) dates.push(date)
  return dates
}
function emptyCounts<K extends string>(keys: readonly K[]): Record<K, number> { return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number> }
function emptyProgress<K extends string>(keys: readonly K[]): Record<K, CountProgress> { return Object.fromEntries(keys.map((key) => [key, progress(0, 0)])) as Record<K, CountProgress> }

/** Groups local calendar dates into Monday-starting week and calendar month keys. */
export function groupDateByWeek(date: string): string { parseDailyGoalDate(date); return getWeekStart(date) }
export function groupDateByMonth(date: string): string { parseDailyGoalDate(date); return `${date.slice(0, 7)}-01` }
export function weeklyRanges(range: AnalyticsDateRange): Array<{ startDate: string; endDate: string }> {
  const dates = datesInRange(range); const starts = [...new Set(dates.map(groupDateByWeek))]
  return starts.map((startDate) => ({ startDate, endDate: getWeekEnd(startDate) }))
}
export function monthlyRanges(range: AnalyticsDateRange): Array<{ startDate: string; endDate: string }> {
  const dates = datesInRange(range); const starts = [...new Set(dates.map(groupDateByMonth))]
  return starts.map((startDate) => {
    const [year, month] = startDate.slice(0, 7).split('-').map(Number)
    const lastDay = new Date(year, month, 0, 12).getDate()
    return { startDate, endDate: `${startDate.slice(0, 7)}-${String(lastDay).padStart(2, '0')}` }
  })
}
function inRange(date: string, range: AnalyticsDateRange): boolean { return date >= range.startDate && date <= range.endDate }
function localDateFromInstant(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error('Analytics timestamp is invalid.')
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function calculateAcademicAnalytics(subjects: Subject[], modules: SyllabusModule[], topics: SyllabusTopic[]): AcademicAnalytics {
  const subjectProgress = calculateSyllabusProgress(modules, topics, subjects)
  const byId = new Map(subjects.map((subject) => [subject.id, subject]))
  const rows = subjectProgress.map((item) => ({ ...item, name: byId.get(item.subjectId)?.name ?? item.subjectId, hasSyllabus: item.total > 0 }))
  const total = rows.reduce((sum, item) => sum + item.total, 0)
  const completed = rows.reduce((sum, item) => sum + item.completed, 0)
  const section = (key: 'theory' | 'practical') => {
    const count = rows.reduce((sum, item) => sum + item[key].total, 0)
    const done = rows.reduce((sum, item) => sum + item[key].completed, 0)
    return progress(count, done)
  }
  return { ...progress(total, completed), subjects: rows, theory: section('theory'), practical: section('practical'), subjectsWithoutSyllabus: subjects.filter((subject) => !rows.some((row) => row.subjectId === subject.id && row.hasSyllabus)).map(({ id, name }) => ({ id, name })) }
}

export function calculateAssignmentAnalytics(assignments: Assignment[], now: Date, range: AnalyticsDateRange): AssignmentAnalytics {
  const dates = datesInRange(range); const statuses = emptyCounts(assignmentStatuses)
  for (const assignment of assignments) statuses[assignment.status] += 1
  const countTrend = (selector: (item: Assignment) => string | null, localize = false): CountTrend[] => {
    const counts = new Map<string, number>()
    for (const item of assignments) { const value = selector(item); if (value) { const date = localize ? localDateFromInstant(value) : value.slice(0, 10); if (inRange(date, range)) counts.set(date, (counts.get(date) ?? 0) + 1) } }
    return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }))
  }
  const done = statuses.done
  return { total: assignments.length, statuses, pending: statuses.todo + statuses.in_progress, submitted: statuses.submitted, done,
    overdue: assignments.filter((item) => isOverdue(item, now)).length, completionPercentage: percentage(done, assignments.length),
    createdDateTrend: countTrend((item) => item.created_at, true), dueDateTrend: countTrend((item) => item.due_at, true) }
}

export function calculateDailyGoalsAnalytics(goals: DailyGoal[], range: AnalyticsDateRange, todayDate: string): DailyGoalsAnalytics {
  const dates = datesInRange(range); parseDailyGoalDate(todayDate)
  const selected = goals.filter((goal) => inRange(goal.goal_date, range))
  const future = selected.filter((goal) => goal.goal_date > todayDate)
  const current = selected.filter((goal) => goal.goal_date <= todayDate)
  const base = calculateDailyGoalProgress(current)
  const breakdown = <K extends DailyGoalCategory | DailyGoalPriority>(keys: readonly K[], field: 'category' | 'priority') => {
    const result = emptyProgress(keys)
    for (const key of keys) { const items = current.filter((goal) => goal[field] === key); result[key] = progress(items.length, items.filter((goal) => goal.status === 'completed').length) }
    return result
  }
  const dailyTrend: DateTrend[] = dates.map((date) => {
    const items = current.filter((goal) => goal.goal_date === date)
    const p = calculateDailyGoalProgress(items)
    return { date, total: p.total, completed: p.completed, pending: p.pending, future: future.filter((goal) => goal.goal_date === date).length }
  })
  const aggregatePeriods = (ranges: Array<{ startDate: string; endDate: string }>): PeriodTrend[] => ranges.map(({ startDate, endDate }) => {
    const items = current.filter((goal) => goal.goal_date >= startDate && goal.goal_date <= endDate)
    const result = calculateDailyGoalProgress(items)
    return { ...result, remaining: result.pending, startDate, endDate }
  })
  return { ...progress(base.total, base.completed), categories: breakdown(goalCategories, 'category'), priorities: breakdown(goalPriorities, 'priority'), futureGoals: future.length, dailyTrend,
    weeklyTrend: aggregatePeriods(weeklyRanges(range)), monthlyTrend: aggregatePeriods(monthlyRanges(range)) }
}

function minutesBetween(start: string, end: string): number {
  const parse = (value: string) => {
    const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] ?? 0) > 59) throw new Error('Study session time is invalid.')
    return Number(match[1]) * 60 + Number(match[2]) + Number(match[3] ?? 0) / 60
  }
  const duration = parse(end) - parse(start)
  if (duration < 0) throw new Error('Study session end time must not be before its start time.')
  return duration
}
function emptyStudyCounts(): StudyOccurrenceCounts { return { total: 0, completed: 0, skipped: 0, explicitlyPlanned: 0, unlogged: 0 } }
function emptyStudyBreakdown(): StudyCategoryBreakdown {
  return Object.fromEntries(sessionCategories.map((category) => [category, { ...emptyStudyCounts(), scheduledMinutes: 0, completedScheduledMinutes: 0 }])) as StudyCategoryBreakdown
}

export function calculateStudyPlannerAnalytics(sessions: StudySessionWithSubject[], logs: StudySessionLog[], range: AnalyticsDateRange): StudyPlannerAnalytics {
  const occurrences = calculateSessionOccurrences(sessions, range.startDate, range.endDate)
  const uniqueOccurrenceKeys = new Set<string>()
  for (const occurrence of occurrences) {
    const key = `${occurrence.session.id}:${occurrence.occurrence_date}`
    if (uniqueOccurrenceKeys.has(key)) throw new Error('Duplicate scheduled occurrence detected.')
    uniqueOccurrenceKeys.add(key)
  }
  const logsByKey = new Map<string, StudySessionLog>()
  for (const log of logs) {
    const key = `${log.session_id}:${log.occurrence_date}`
    if (logsByKey.has(key)) throw new Error('Duplicate study session occurrence log detected.')
    logsByKey.set(key, log)
  }
  const categories = emptyStudyBreakdown()
  const dayMap = new Map<string, StudyTrend>()
  const zeroTrend = (date: string): StudyTrend => ({ date, ...emptyStudyCounts(), scheduledMinutes: 0, completedScheduledMinutes: 0 })
  const trendDates = datesInRange(range).map(zeroTrend)
  trendDates.forEach((trend) => dayMap.set(trend.date, trend))
  const overall = { ...emptyStudyCounts(), scheduledMinutes: 0, completedScheduledMinutes: 0 }
  const personal = { scheduledMinutes: 0, completedScheduledMinutes: 0 }
  const lecture = { scheduledMinutes: 0, completedScheduledMinutes: 0 }
  const practical = { scheduledMinutes: 0, completedScheduledMinutes: 0 }
  for (const occurrence of occurrences) {
    const duration = minutesBetween(occurrence.start_time, occurrence.end_time)
    const log = logsByKey.get(`${occurrence.session.id}:${occurrence.occurrence_date}`)
    const category = categories[occurrence.session.session_category]
    const trend = dayMap.get(occurrence.occurrence_date)!
    const targets = [overall, trend, category]
    for (const target of targets) { target.total += 1; target.scheduledMinutes += duration }
    const durationBucket = occurrence.session.session_category === 'lecture' ? lecture : occurrence.session.session_category === 'practical' ? practical : personal
    durationBucket.scheduledMinutes += duration
    if (!log) { for (const target of targets) target.unlogged += 1; continue }
    if (log.status === 'completed') { for (const target of targets) { target.completed += 1; target.completedScheduledMinutes += duration } }
    else if (log.status === 'skipped') for (const target of targets) target.skipped += 1
    else for (const target of targets) target.explicitlyPlanned += 1
    if (log.status === 'completed') durationBucket.completedScheduledMinutes += duration
  }
  const weeklyTrend = weeklyRanges(range).map(({ startDate, endDate }) => {
    const bounded = trendDates.filter((item) => item.date >= startDate && item.date <= endDate)
    const sum = bounded.reduce((acc, item) => {
      for (const key of ['total', 'completed', 'skipped', 'explicitlyPlanned', 'unlogged', 'scheduledMinutes', 'completedScheduledMinutes'] as const) acc[key] += item[key]
      return acc
    }, { ...emptyStudyCounts(), scheduledMinutes: 0, completedScheduledMinutes: 0 })
    return { ...sum, date: startDate, startDate, endDate }
  })
  return { ...overall, categoryBreakdown: categories, personalStudy: personal, lecture, practical, dailyTrend: trendDates, weeklyTrend }
}
