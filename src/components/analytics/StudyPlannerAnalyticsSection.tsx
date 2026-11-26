import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { StudyPlannerAnalytics } from '../../types/analytics'
import type { SessionCategory } from '../../types/studyPlanner'
import { AnalyticsSection } from './AnalyticsSection'
import { chartColors, lineMarkers } from './chartTheme'
import AnalyticsFilterSelect from './AnalyticsFilterSelect'
import PeriodComparison from './PeriodComparison'
import type { PeriodComparison as PeriodComparisonValues } from '../../utils/periodComparison'
import AnalyticsTooltip from './AnalyticsTooltip'

type Props = { analytics?: StudyPlannerAnalytics; loading: boolean; error?: string; rangeLabel: string; categoryFilter: SessionCategory | 'all'; activityType: 'all' | 'lecture' | 'practical' | 'personal'; onCategoryFilterChange: (value: SessionCategory | 'all') => void; onActivityTypeChange: (value: 'all' | 'lecture' | 'practical' | 'personal') => void; completedDurationComparison?: PeriodComparisonValues; previousRangeLabel?: string }

const categoryLabels: Record<SessionCategory, string> = {
  self_study: 'Self-study', revision: 'Revision', lecture: 'Lecture', practical: 'Practical', other: 'Other activity',
}
const categoryOrder: SessionCategory[] = ['self_study', 'revision', 'lecture', 'practical', 'other']
const occurrenceStatuses = [
  { key: 'completed', label: 'Completed', color: chartColors.green },
  { key: 'skipped', label: 'Skipped', color: chartColors.rose },
  { key: 'explicitlyPlanned', label: 'Planned', color: chartColors.blue },
  { key: 'unlogged', label: 'Unlogged', color: chartColors.slate },
] as const
const axisTick = { fill: chartColors.axis, fontSize: 9 }

function hours(minutes: number): string { return `${(minutes / 60).toFixed(1)} h` }

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: string }) {
  return <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.02] p-3"><p className="break-words text-[11px] text-slate-500">{label}</p><p className={`mt-1 break-words text-xl font-semibold tabular-nums ${tone}`}>{value}</p>{detail && <p className="mt-1 break-words text-[10px] text-slate-500">{detail}</p>}</div>
}

function DurationTrend({ title, data, dateLabel }: { title: string; data: Array<{ date: string; scheduledMinutes: number; completedScheduledMinutes: number }>; dateLabel: string }) {
  const chartData = data.map((item) => ({ ...item, scheduledHours: item.scheduledMinutes / 60, completedHours: item.completedScheduledMinutes / 60 }))
  return <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.015] p-3">
    <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words text-xs font-semibold text-slate-300">{title}</h3><div className="flex flex-wrap gap-3"><span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><i className="h-2 w-2 shrink-0 rounded-full bg-blue-300" />Scheduled</span><span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><i className="h-2 w-2 shrink-0 rounded-full bg-emerald-300" />Completed scheduled</span></div></div>
    {chartData.length ? <div role="img" aria-label={`${title}; durations are scheduled durations, not actual time spent`} className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={22} tick={axisTick} tickFormatter={(date: string) => dateLabel === 'daily' || dateLabel === 'weekly' ? date.slice(5) : date.slice(0, 7)} />
          <YAxis axisLine={false} tickLine={false} width={38} tick={axisTick} tickFormatter={(value: number) => `${value}h`} />
          <AnalyticsTooltip labelFormatter={(date) => `${dateLabel === 'daily' ? 'Date' : dateLabel === 'weekly' ? 'Week starting' : 'Month'}: ${date}`} formatter={(value, name) => [`${Number(value).toFixed(2)} h`, name]} />
          <Line type="monotone" dataKey="scheduledHours" name="Scheduled duration" stroke={chartColors.blue} strokeWidth={2} {...lineMarkers(chartColors.blue)} />
          <Line type="monotone" dataKey="completedHours" name="Completed scheduled duration" stroke={chartColors.green} strokeWidth={2} {...lineMarkers(chartColors.green)} />
        </LineChart>
      </ResponsiveContainer>
    </div> : <p className="py-8 text-center text-xs text-slate-500">No {dateLabel} duration trend in this range.</p>}
  </div>
}

export default function StudyPlannerAnalyticsSection({ analytics, loading, error, rangeLabel, categoryFilter, activityType, onCategoryFilterChange, onActivityTypeChange, completedDurationComparison, previousRangeLabel }: Props) {
  const completionRate = analytics && analytics.total > 0 ? Math.round(analytics.completed / analytics.total * 100) : null
  const statusData = analytics ? occurrenceStatuses.map((status) => ({ name: status.label, value: analytics[status.key] })) : []
  const categoryData = analytics ? categoryOrder.map((category) => ({
    name: categoryLabels[category],
    scheduledHours: analytics.categoryBreakdown[category].scheduledMinutes / 60,
    completedHours: analytics.categoryBreakdown[category].completedScheduledMinutes / 60,
    scheduledMinutes: analytics.categoryBreakdown[category].scheduledMinutes,
    completedScheduledMinutes: analytics.categoryBreakdown[category].completedScheduledMinutes,
  })) : []
  const otherDuration = analytics?.categoryBreakdown.other.scheduledMinutes ?? 0
  const revisionDuration = analytics?.categoryBreakdown.revision.scheduledMinutes ?? 0

  return (
    <AnalyticsSection title="Study Planner analytics" loading={loading} error={error}>
      {analytics ? <div>
        <p className="mb-3 text-[11px] text-slate-500">Selected range · {rangeLabel} · durations are scheduled time, not actual time spent.</p>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AnalyticsFilterSelect label="Session category" value={categoryFilter} options={[{ value: 'all', label: 'All categories' }, ...categoryOrder.map((value) => ({ value, label: categoryLabels[value] }))]} onChange={(value) => onCategoryFilterChange(value as SessionCategory | 'all')} />
          <AnalyticsFilterSelect label="Session type" value={activityType} options={[{ value: 'all', label: 'All session types' }, { value: 'lecture', label: 'Lectures' }, { value: 'practical', label: 'Practicals' }, { value: 'personal', label: 'Personal activities' }]} onChange={(value) => onActivityTypeChange(value as 'all' | 'lecture' | 'practical' | 'personal')} />
        </div>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(6,minmax(0,1fr))]">
          <MetricCard label="Scheduled occurrences" value={String(analytics.total)} tone="text-white" />
          <MetricCard label="Completed" value={String(analytics.completed)} tone="text-emerald-200" />
          <MetricCard label="Skipped" value={String(analytics.skipped)} tone="text-rose-200" />
          <MetricCard label="Explicitly planned" value={String(analytics.explicitlyPlanned)} tone="text-blue-200" />
          <MetricCard label="Unlogged" value={String(analytics.unlogged)} tone="text-slate-300" />
          <MetricCard label="Session completion rate" value={completionRate === null ? '—' : `${completionRate}%`} detail={analytics.total ? `${analytics.completed} / ${analytics.total} occurrences` : 'No occurrences in range'} tone="text-violet-200" />
        </div>
        <p className="mt-2 text-right text-[10px] text-slate-500">Completion rate = completed logs ÷ all scheduled occurrences in the selected range, including skipped, planned, and unlogged occurrences.</p>
        {previousRangeLabel && completedDurationComparison && <div className="mt-3"><p className="mb-2 text-[10px] text-slate-500">Comparison expands both periods using current session definitions; historical schedule snapshots are not stored.</p><PeriodComparison label="Completed scheduled duration comparison" values={completedDurationComparison} previousRangeLabel={previousRangeLabel} unit=" h" digits={1} /></div>}

        <div className="mt-5">
          <div className="mb-2"><h3 className="text-xs font-semibold text-slate-300">Scheduled duration summary</h3><p className="mt-1 text-[10px] text-slate-500">Completed scheduled duration counts only occurrences with a completed log. Personal study is a subtotal excluding lecture and practical; it includes self-study, revision, and other.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            <MetricCard label="Total scheduled duration" value={hours(analytics.scheduledMinutes)} detail="All generated occurrences" tone="text-white" />
            <MetricCard label="Completed scheduled duration" value={hours(analytics.completedScheduledMinutes)} detail="Completed logs only" tone="text-emerald-200" />
            <MetricCard label="Personal study subtotal" value={hours(analytics.personalStudy.scheduledMinutes)} detail="Excludes lecture and practical" tone="text-blue-200" />
            <MetricCard label="Revision duration" value={hours(revisionDuration)} tone="text-violet-200" />
            <MetricCard label="Lecture duration" value={hours(analytics.lecture.scheduledMinutes)} tone="text-blue-200" />
            <MetricCard label="Practical duration" value={hours(analytics.practical.scheduledMinutes)} tone="text-amber-200" />
            <MetricCard label="Other activity duration" value={hours(otherDuration)} tone="text-slate-200" />
          </div>
        </div>

        {analytics.total === 0 ? <div className="mt-5 rounded-lg border border-dashed border-white/[0.09] px-4 py-7 text-center text-sm text-slate-500">No recurring or one-time sessions are scheduled in this date range.</div> : <>
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
            <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.015] p-3">
              <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words text-xs font-semibold text-slate-300">Occurrence status distribution</h3><div className="flex flex-wrap gap-3">{occurrenceStatuses.map((status) => <span key={status.key} className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><i className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: status.color }} />{status.label}: {analytics[status.key]}</span>)}</div></div>
              <div role="img" aria-label="Donut chart showing completed, skipped, explicitly planned, and unlogged occurrences" className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                      {statusData.map((item, index) => <Cell key={item.name} fill={occurrenceStatuses[index].color} />)}
                    </Pie>
                    <AnalyticsTooltip formatter={(value, name) => [`${value} occurrences (${analytics.total ? Math.round(Number(value) / analytics.total * 100) : 0}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.015] p-3">
              <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words text-xs font-semibold text-slate-300">Scheduled duration by category</h3><div className="flex flex-wrap gap-3"><span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><i className="h-2 w-2 shrink-0 rounded-sm bg-blue-300" />Scheduled</span><span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><i className="h-2 w-2 shrink-0 rounded-full bg-emerald-300" />Completed scheduled</span></div></div>
              <div role="img" aria-label="Horizontal bars comparing scheduled and completed scheduled duration by session category" className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap={12}>
                    <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(value: number) => `${value}h`} />
                    <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={axisTick} />
                    <AnalyticsTooltip formatter={(value, name, item) => [`${Number(value).toFixed(2)} h · ${name === 'Scheduled' ? item.payload.scheduledMinutes : item.payload.completedScheduledMinutes} min`, name]} />
                    <Bar dataKey="scheduledHours" name="Scheduled" fill={chartColors.blue} radius={[0, 3, 3, 0]} />
                    <Bar dataKey="completedHours" name="Completed scheduled" fill={chartColors.green} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
            <DurationTrend title="Daily scheduled vs completed scheduled duration" data={analytics.dailyTrend} dateLabel="daily" />
            <DurationTrend title="Weekly scheduled duration trend · Monday–Sunday" data={analytics.weeklyTrend} dateLabel="weekly" />
          </div>
        </>}
      </div> : null}
    </AnalyticsSection>
  )
}
