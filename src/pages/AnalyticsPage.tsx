import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, CalendarClock, CheckSquare, Clock3, RefreshCw } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import StatCard from '../components/dashboard/StatCard'
import AcademicAnalyticsSection from '../components/analytics/AcademicAnalyticsSection'
import AssignmentAnalyticsSection from '../components/analytics/AssignmentAnalyticsSection'
import DailyGoalsAnalyticsSection from '../components/analytics/DailyGoalsAnalyticsSection'
import StudyPlannerAnalyticsSection from '../components/analytics/StudyPlannerAnalyticsSection'
import type { FilterOption } from '../components/analytics/AnalyticsFilterSelect'
import { loadAnalyticsForRange } from '../services/analytics'
import type { AnalyticsDataset, AnalyticsLoadResult } from '../utils/analyticsDataLoader'
import type { AcademicAnalytics, AnalyticsRangeSelection, AssignmentAnalytics, DailyGoalsAnalytics, StudyPlannerAnalytics } from '../types/analytics'
import { calculateAcademicAnalytics, calculateAssignmentAnalytics, calculateDailyGoalsAnalytics, calculateStudyPlannerAnalytics } from '../utils/analytics'
import { getPreviousAnalyticsDateRange, resolveAnalyticsDateRange } from '../utils/analyticsDateRange'
import { filterAcademicRows, filterAssignmentsBySubject, filterDailyGoalsByCategory, filterStudySessions, resetAnalyticsFilters } from '../utils/analyticsFilters'
import type { AnalyticsFilterState, PlannerSessionType } from '../utils/analyticsFilters'
import { calculatePeriodComparison } from '../utils/periodComparison'
import type { PeriodComparison } from '../utils/periodComparison'
import { createLatestRequestGate } from '../utils/latestRequest'
import { getTodayLocalDate, parseDailyGoalDate } from '../utils/dailyGoalDates'
import type { DailyGoalCategory } from '../types/dailyGoals'
import type { SessionCategory } from '../types/studyPlanner'

type RangeMode = 'weekly' | 'monthly' | 'custom'
type Metrics<T> = { status: 'available'; data: T } | { status: 'unavailable'; error: string }

function calculate<T, R>(dataset: AnalyticsDataset<T> | undefined, fn: (data: T) => R): Metrics<R> {
  if (!dataset || dataset.status === 'unavailable') return { status: 'unavailable', error: dataset?.error ?? 'This dataset is unavailable.' }
  try { return { status: 'available', data: fn(dataset.data) } }
  catch (cause) { return { status: 'unavailable', error: cause instanceof Error ? cause.message : 'Could not calculate this section.' } }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(parseDailyGoalDate(value))
}

function sumTrend(values: Array<{ count: number }>): number { return values.reduce((sum, item) => sum + item.count, 0) }

export default function AnalyticsPage() {
  const today = getTodayLocalDate()
  const [mode, setMode] = useState<RangeMode>('monthly')
  const [anchorDate, setAnchorDate] = useState(today)
  const currentMonth = resolveAnalyticsDateRange({ kind: 'monthly', date: today })
  const [customStart, setCustomStart] = useState(currentMonth.startDate)
  const [customEnd, setCustomEnd] = useState(currentMonth.endDate)
  const [filters, setFilters] = useState<AnalyticsFilterState>(resetAnalyticsFilters)
  const { academicSubjectId: academicSubjectFilter, assignmentSubjectId: assignmentSubjectFilter, dailyGoalCategory: goalCategoryFilter, plannerCategory: plannerCategoryFilter, plannerType: plannerActivityType } = filters
  const [result, setResult] = useState<AnalyticsLoadResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const requestGate = useRef(createLatestRequestGate())

  const rangeSelection = useMemo<AnalyticsRangeSelection>(() => mode === 'custom'
    ? { kind: 'custom', startDate: customStart, endDate: customEnd }
    : { kind: mode, date: anchorDate }, [anchorDate, customEnd, customStart, mode])
  const selectedRange = useMemo(() => {
    try { return { range: resolveAnalyticsDateRange(rangeSelection), comparisonRange: getPreviousAnalyticsDateRange(rangeSelection), error: null } }
    catch (cause) { return { range: null, comparisonRange: null, error: cause instanceof Error ? cause.message : 'Choose a valid date range.' } }
  }, [rangeSelection])

  useEffect(() => {
    if (!selectedRange.range) {
      setLoading(false)
      setResult(null)
      setRequestError(selectedRange.error)
      return
    }
    const requestId = requestGate.current.begin()
    let active = true
    setLoading(true)
    setResult(null)
    setRequestError(null)
    void loadAnalyticsForRange(selectedRange.range, selectedRange.comparisonRange ?? undefined).then((data) => {
      if (!active || !requestGate.current.isCurrent(requestId) || data.status === 'stale') return
      setResult(data)
    }).catch((cause: unknown) => {
      if (!active || !requestGate.current.isCurrent(requestId)) return
      setRequestError(cause instanceof Error ? cause.message : 'Could not load analytics data.')
    }).finally(() => {
      if (active && requestGate.current.isCurrent(requestId)) setLoading(false)
    })
    return () => {
      active = false
      requestGate.current.invalidate()
    }
  }, [retry, selectedRange.comparisonRange?.endDate, selectedRange.comparisonRange?.startDate, selectedRange.error, selectedRange.range?.endDate, selectedRange.range?.startDate])

  const range = selectedRange.range
  const datasets = result && result.status !== 'stale' ? result.datasets : undefined
  const academics = useMemo(() => calculate(datasets?.academics, (data): AcademicAnalytics => {
    const filtered = filterAcademicRows(data, academicSubjectFilter)
    return calculateAcademicAnalytics(filtered.subjects, filtered.modules, filtered.topics)
  }), [academicSubjectFilter, datasets?.academics])
  const assignments = useMemo(() => calculate(datasets?.assignments, (data): AssignmentAnalytics => calculateAssignmentAnalytics(filterAssignmentsBySubject(data, assignmentSubjectFilter), new Date(), range ?? { startDate: today, endDate: today })), [assignmentSubjectFilter, datasets?.assignments, range?.endDate, range?.startDate, today])
  const goals = useMemo(() => calculate(datasets?.dailyGoals, (data): DailyGoalsAnalytics => calculateDailyGoalsAnalytics(filterDailyGoalsByCategory(data, goalCategoryFilter), range ?? { startDate: today, endDate: today }, today)), [datasets?.dailyGoals, goalCategoryFilter, range?.endDate, range?.startDate, today])
  const subjectOptions = useMemo<FilterOption[]>(() => {
    const rows = new Map<string, string>()
    if (datasets?.academics.status === 'available') for (const subject of datasets.academics.data.subjects) rows.set(subject.id, `${subject.name}${subject.kind === 'lab' ? ' · Lab' : ''}`)
    if (datasets?.assignments.status === 'available') for (const assignment of datasets.assignments.data) if (assignment.subject) rows.set(assignment.subject.id, `${assignment.subject.name}${assignment.subject.kind === 'lab' ? ' · Lab' : ''}`)
    return [...rows].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }))
  }, [datasets?.academics, datasets?.assignments])
  const planner = useMemo(() => {
    const sessions = datasets?.studySessions
    const logs = datasets?.studySessionLogs
    if (!sessions || sessions.status === 'unavailable') return { status: 'unavailable', error: sessions?.error ?? 'Study sessions are unavailable.' } as Metrics<StudyPlannerAnalytics>
    if (!logs || logs.status === 'unavailable') return { status: 'unavailable', error: logs?.error ?? 'Study session logs are unavailable.' } as Metrics<StudyPlannerAnalytics>
    try { return { status: 'available', data: calculateStudyPlannerAnalytics(filterStudySessions(sessions.data, plannerCategoryFilter, plannerActivityType), logs.data, range ?? { startDate: today, endDate: today }) } as Metrics<StudyPlannerAnalytics> }
    catch (cause) { return { status: 'unavailable', error: cause instanceof Error ? cause.message : 'Could not calculate Study Planner analytics.' } as Metrics<StudyPlannerAnalytics> }
  }, [datasets?.studySessionLogs, datasets?.studySessions, plannerActivityType, plannerCategoryFilter, range?.endDate, range?.startDate, today])

  const assignmentComparisons = useMemo(() => {
    if (assignments.status !== 'available' || !datasets || datasets.assignments.status !== 'available' || !selectedRange.comparisonRange) return null
    const selected = filterAssignmentsBySubject(datasets.assignments.data, assignmentSubjectFilter)
    const prior = calculateAssignmentAnalytics(selected, new Date(), selectedRange.comparisonRange)
    return {
      created: calculatePeriodComparison(sumTrend(assignments.data.createdDateTrend), sumTrend(prior.createdDateTrend)),
      due: calculatePeriodComparison(sumTrend(assignments.data.dueDateTrend), sumTrend(prior.dueDateTrend)),
    }
  }, [assignmentSubjectFilter, assignments, datasets, selectedRange.comparisonRange])
  const goalCompletedComparison = useMemo<PeriodComparison | undefined>(() => {
    if (goals.status !== 'available' || !datasets || datasets.dailyGoals.status !== 'available' || !selectedRange.comparisonRange) return undefined
    const prior = calculateDailyGoalsAnalytics(filterDailyGoalsByCategory(datasets.dailyGoals.data, goalCategoryFilter), selectedRange.comparisonRange, today)
    return calculatePeriodComparison(goals.data.completed, prior.completed)
  }, [datasets, goalCategoryFilter, goals, selectedRange.comparisonRange, today])
  const plannerDurationComparison = useMemo<PeriodComparison | undefined>(() => {
    const sessions = datasets?.studySessions
    const logs = datasets?.studySessionLogs
    if (planner.status !== 'available' || !sessions || sessions.status === 'unavailable' || !logs || logs.status === 'unavailable' || !selectedRange.comparisonRange) return undefined
    const prior = calculateStudyPlannerAnalytics(filterStudySessions(sessions.data, plannerCategoryFilter, plannerActivityType), logs.data, selectedRange.comparisonRange)
    return calculatePeriodComparison(planner.data.completedScheduledMinutes / 60, prior.completedScheduledMinutes / 60)
  }, [datasets?.studySessionLogs, datasets?.studySessions, planner, plannerActivityType, plannerCategoryFilter, selectedRange.comparisonRange])

  const cards = [
    { label: 'Syllabus completion', value: academics.status === 'available' ? `${academics.data.percentage}%` : '—', detail: academics.status === 'available' ? `${academics.data.completed} of ${academics.data.total} topics complete` : 'Academic data unavailable', icon: BookOpen, tone: 'blue' as const },
    { label: 'Assignments done', value: assignments.status === 'available' ? `${assignments.data.done} / ${assignments.data.total}` : '—', detail: assignments.status === 'available' ? `${assignments.data.pending} pending · ${assignments.data.overdue} overdue` : 'Assignment data unavailable', icon: CalendarClock, tone: 'amber' as const },
    { label: 'Daily Goals', value: goals.status === 'available' ? `${goals.data.completed} / ${goals.data.total}` : '—', detail: goals.status === 'available' ? `${goals.data.percentage}% complete · ${goals.data.futureGoals} future` : 'Daily Goals data unavailable', icon: CheckSquare, tone: 'green' as const },
    { label: 'Sessions completed', value: planner.status === 'available' ? `${planner.data.completed} / ${planner.data.total}` : '—', detail: planner.status === 'available' ? `${planner.data.completedScheduledMinutes} of ${planner.data.scheduledMinutes} scheduled minutes` : 'Study Planner data unavailable', icon: Clock3, tone: 'violet' as const },
  ]

  const rangeLabel = range ? `${formatDate(range.startDate)} – ${formatDate(range.endDate)}` : 'Choose a valid date range'
  const previousRangeLabel = selectedRange.comparisonRange ? `${formatDate(selectedRange.comparisonRange.startDate)} – ${formatDate(selectedRange.comparisonRange.endDate)}` : undefined
  const activeFilters = [
    academicSubjectFilter ? `Academics: ${subjectOptions.find((option) => option.value === academicSubjectFilter)?.label ?? 'selected subject'}` : '',
    assignmentSubjectFilter ? `Assignments: ${subjectOptions.find((option) => option.value === assignmentSubjectFilter)?.label ?? 'selected subject'}` : '',
    goalCategoryFilter !== 'all' ? `Goals: ${goalCategoryFilter}` : '',
    plannerCategoryFilter !== 'all' ? `Planner category: ${plannerCategoryFilter.replace('_', ' ')}` : '',
    plannerActivityType !== 'all' ? `Planner type: ${plannerActivityType}` : '',
  ].filter(Boolean)
  const setAcademicSubjectFilter = (value: string) => setFilters((current) => ({ ...current, academicSubjectId: value }))
  const setAssignmentSubjectFilter = (value: string) => setFilters((current) => ({ ...current, assignmentSubjectId: value }))
  const setGoalCategoryFilter = (value: DailyGoalCategory | 'all') => setFilters((current) => ({ ...current, dailyGoalCategory: value }))
  const setPlannerCategoryFilter = (value: SessionCategory | 'all') => setFilters((current) => ({ ...current, plannerCategory: value }))
  const setPlannerActivityType = (value: PlannerSessionType) => setFilters((current) => ({ ...current, plannerType: value }))
  const resetFilters = () => setFilters(resetAnalyticsFilters())

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <PageHeading eyebrow="SemesterOS / Insights" title="Analytics" description="A date-based view of your academics, assignments, goals, and planned study." />
        <fieldset className="min-w-0 rounded-xl border border-white/[0.07] bg-[#0d1421] p-3 xl:mt-1 xl:min-w-[430px]">
          <legend className="sr-only">Analytics date range</legend>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[120px] flex-1 flex-col gap-1.5 text-[11px] text-slate-400">Period
              <select aria-label="Analytics period" value={mode} onChange={(event) => setMode(event.target.value as RangeMode)} className="h-9 rounded-lg border border-white/10 bg-[#111a2a] px-2.5 text-xs text-slate-200 outline-none focus:border-blue-400/50">
                <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom range</option>
              </select>
            </label>
            {mode !== 'custom' ? <label className="flex min-w-[145px] flex-1 flex-col gap-1.5 text-[11px] text-slate-400">{mode === 'weekly' ? 'Week containing' : 'Month containing'}
              <input aria-label={mode === 'weekly' ? 'Date in selected week' : 'Date in selected month'} type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} className="h-9 min-w-0 rounded-lg border border-white/10 bg-[#111a2a] px-2 text-xs text-slate-200 outline-none focus:border-blue-400/50" />
            </label> : <>
              <label className="flex min-w-[130px] flex-1 flex-col gap-1.5 text-[11px] text-slate-400">Start date
                <input aria-label="Custom range start date" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-9 min-w-0 rounded-lg border border-white/10 bg-[#111a2a] px-2 text-xs text-slate-200 outline-none focus:border-blue-400/50" />
              </label>
              <label className="flex min-w-[130px] flex-1 flex-col gap-1.5 text-[11px] text-slate-400">End date
                <input aria-label="Custom range end date" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-9 min-w-0 rounded-lg border border-white/10 bg-[#111a2a] px-2 text-xs text-slate-200 outline-none focus:border-blue-400/50" />
              </label>
            </>}
          </div>
          <p className="mt-2 break-words text-[11px] tabular-nums text-slate-500" aria-live="polite">Selected range: {rangeLabel}</p>
          {selectedRange.error && <p role="alert" className="mt-1 text-xs text-rose-300">{selectedRange.error}</p>}
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0d1421] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-300">Active filters</p>
          <p className="mt-1 break-words text-[11px] text-slate-500">{activeFilters.length ? activeFilters.join(' · ') : 'All subjects, categories, and activity types'}</p>
          {previousRangeLabel && <p className="mt-1 break-words text-[10px] text-slate-500">Comparable previous period: {previousRangeLabel}. Assignment status and syllabus values are current snapshots.</p>}
        </div>
        <button type="button" disabled={!activeFilters.length} onClick={resetFilters} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Reset filters</button>
      </div>

      {requestError && <div role="alert" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] px-4 py-3 text-sm text-rose-200"><span className="min-w-0 flex-1 break-words">{requestError}</span>{range && <button type="button" onClick={() => setRetry((value) => value + 1)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.05]"><RefreshCw size={13} />Retry</button>}</div>}
      {(result?.status === 'partial' || result?.status === 'unavailable') && <div role="status" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/10 bg-amber-300/[0.035] px-3 py-2 text-xs text-amber-100/80"><span className="min-w-0 flex-1 break-words">{result.status === 'partial' ? 'Some analytics data could not be loaded. Available sections are still shown; unavailable sections explain the issue.' : 'Analytics data could not be loaded. Retry to try again.'}</span><button type="button" onClick={() => setRetry((value) => value + 1)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-slate-200 hover:bg-white/[0.05]"><RefreshCw size={12} />Retry</button></div>}
      {loading && <p role="status" className="text-xs text-slate-500">Loading analytics for {rangeLabel}…</p>}

      <section aria-label="Analytics summary" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <StatCard key={card.label} {...card} allowTextWrap value={loading ? '—' : card.value} />)}
      </section>

      <section aria-label="Analytics details" className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <AcademicAnalyticsSection loading={loading} analytics={academics.status === 'available' ? academics.data : undefined} error={academics.status === 'unavailable' ? academics.error : undefined} subjectFilter={academicSubjectFilter} subjectOptions={subjectOptions} onSubjectFilterChange={setAcademicSubjectFilter} />

        <AssignmentAnalyticsSection loading={loading} analytics={assignments.status === 'available' ? assignments.data : undefined} error={assignments.status === 'unavailable' ? assignments.error : undefined} rangeLabel={rangeLabel} subjectFilter={assignmentSubjectFilter} subjectOptions={subjectOptions} onSubjectFilterChange={setAssignmentSubjectFilter} createdComparison={assignmentComparisons?.created} dueComparison={assignmentComparisons?.due} previousRangeLabel={previousRangeLabel} />

        <DailyGoalsAnalyticsSection loading={loading} analytics={goals.status === 'available' ? goals.data : undefined} error={goals.status === 'unavailable' ? goals.error : undefined} rangeLabel={rangeLabel} categoryFilter={goalCategoryFilter} onCategoryFilterChange={setGoalCategoryFilter} completedComparison={goalCompletedComparison} previousRangeLabel={previousRangeLabel} />

        <StudyPlannerAnalyticsSection loading={loading} analytics={planner.status === 'available' ? planner.data : undefined} error={planner.status === 'unavailable' ? planner.error : undefined} rangeLabel={rangeLabel} categoryFilter={plannerCategoryFilter} activityType={plannerActivityType} onCategoryFilterChange={setPlannerCategoryFilter} onActivityTypeChange={setPlannerActivityType} completedDurationComparison={plannerDurationComparison} previousRangeLabel={previousRangeLabel} />
      </section>
    </div>
  )
}
