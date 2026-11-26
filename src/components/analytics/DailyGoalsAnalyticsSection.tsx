import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { DailyGoalsAnalytics, PeriodTrend } from '../../types/analytics'
import type { DailyGoalCategory, DailyGoalPriority } from '../../types/dailyGoals'
import { AnalyticsSection } from './AnalyticsSection'
import { chartColors, lineMarkers } from './chartTheme'
import AnalyticsFilterSelect from './AnalyticsFilterSelect'
import PeriodComparison from './PeriodComparison'
import type { PeriodComparison as PeriodComparisonValues } from '../../utils/periodComparison'
import AnalyticsTooltip from './AnalyticsTooltip'

type Props = { analytics?: DailyGoalsAnalytics; loading: boolean; error?: string; rangeLabel: string; categoryFilter: DailyGoalCategory | 'all'; onCategoryFilterChange: (value: DailyGoalCategory | 'all') => void; completedComparison?: PeriodComparisonValues; previousRangeLabel?: string }

const categoryLabels: Record<DailyGoalCategory, string> = {
  academics: 'Academics', dsa: 'DSA', coding: 'Coding', placement: 'Placement', skills: 'Skills', personal: 'Personal', other: 'Other',
}
const priorityLabels: Record<DailyGoalPriority, string> = { high: 'High', medium: 'Medium', low: 'Low' }
const axisTick = { fill: chartColors.axis, fontSize: 9 }

function SummaryMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.02] p-3"><p className="break-words text-[11px] text-slate-500">{label}</p><p className={`mt-1 break-words text-xl font-semibold tabular-nums ${tone}`}>{value}</p><p className="mt-1 break-words text-[10px] text-slate-500">{detail}</p></div>
}

function LegendKey({ label, color }: { label: string; color: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><i className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />{label}</span>
}

function CompletionTrend({ title, data, periodLabel }: { title: string; data: PeriodTrend[]; periodLabel: string }) {
  const chartData = data.map((item) => ({ date: item.startDate, completed: item.completed, pending: item.pending, total: item.total, percentage: item.percentage }))
  return <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.015] p-3">
    <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words text-xs font-semibold text-slate-300">{title}</h3><div className="flex flex-wrap gap-3"><LegendKey label="Completed" color={chartColors.green} /><LegendKey label="Pending" color={chartColors.slate} /></div></div>
    {chartData.length ? <div role="img" aria-label={`${periodLabel} Daily Goals completion trend. Future goals are excluded.`} className="h-[210px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} barCategoryGap={data.length > 12 ? '25%' : '38%'}>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={22} tick={axisTick} tickFormatter={(date: string) => periodLabel === 'Monthly' ? date.slice(0, 7) : date.slice(5)} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} tick={axisTick} />
          <AnalyticsTooltip labelFormatter={(date) => `${periodLabel} beginning ${date}`} formatter={(value, name, item) => [`${value} of ${item.payload.total} goals`, name]} />
          <Bar dataKey="completed" name="Completed" stackId="goals" fill={chartColors.green} radius={[3, 3, 0, 0]} />
          <Bar dataKey="pending" name="Pending" stackId="goals" fill={chartColors.slate} />
        </BarChart>
      </ResponsiveContainer>
    </div> : <p className="py-8 text-center text-xs text-slate-500">No {periodLabel.toLocaleLowerCase()} trend data in this range.</p>}
  </div>
}

export default function DailyGoalsAnalyticsSection({ analytics, loading, error, rangeLabel, categoryFilter, onCategoryFilterChange, completedComparison, previousRangeLabel }: Props) {
  const rangeTotal = analytics ? analytics.total + analytics.futureGoals : 0
  const categoryData = analytics ? (Object.keys(categoryLabels) as DailyGoalCategory[]).map((key) => ({
    name: categoryLabels[key], total: analytics.categories[key].total, completed: analytics.categories[key].completed, pending: analytics.categories[key].pending,
  })) : []
  const priorityData = analytics ? (['high', 'medium', 'low'] as DailyGoalPriority[]).map((key) => ({
    name: priorityLabels[key], completed: analytics.priorities[key].completed, pending: analytics.priorities[key].pending, total: analytics.priorities[key].total,
  })) : []

  return (
    <AnalyticsSection title="Daily Goals analytics" loading={loading} error={error}>
      {analytics ? <div>
        <p className="mb-3 text-[11px] text-slate-500">Current goal status grouped by local assigned date · {rangeLabel}</p>
        <div className="mb-4 max-w-xs"><AnalyticsFilterSelect label="Goal category" value={categoryFilter} options={[{ value: 'all', label: 'All categories' }, ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))]} onChange={(value) => onCategoryFilterChange(value as DailyGoalCategory | 'all')} /></div>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))]">
          <SummaryMetric label="Total goals in period" value={String(rangeTotal)} detail="Includes future goals" tone="text-white" />
          <SummaryMetric label="Completed through today" value={String(analytics.completed)} detail="Current completed status" tone="text-emerald-200" />
          <SummaryMetric label="Pending through today" value={String(analytics.pending)} detail="Current pending status" tone="text-amber-200" />
          <SummaryMetric label="Completion through today" value={`${analytics.percentage}%`} detail={`${analytics.total} goals due through today`} tone="text-blue-200" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-300/[0.09] bg-blue-300/[0.025] px-3 py-2">
          <p className="min-w-0 break-words text-xs text-slate-300">Future goals are kept separate from completion progress.</p>
          <p className="min-w-0 break-words text-xs font-medium tabular-nums text-blue-200">{analytics.futureGoals} future {analytics.futureGoals === 1 ? 'goal' : 'goals'}</p>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">Trends show current goal status by assigned date. Reopened goals and edited dates can change earlier groupings; completion history is not stored.</p>
        {previousRangeLabel && completedComparison && <div className="mt-3"><PeriodComparison label="Completed goals comparison" values={completedComparison} previousRangeLabel={previousRangeLabel} unit=" goals" /></div>}

        {rangeTotal === 0 ? <div className="mt-4 rounded-lg border border-dashed border-white/[0.09] px-4 py-7 text-center text-sm text-slate-500">No Daily Goals are recorded in this date range.</div> : <>
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.015] p-3">
              <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words text-xs font-semibold text-slate-300">Goals by category through today</h3><div className="flex flex-wrap gap-3"><LegendKey label="Completed" color={chartColors.green} /><LegendKey label="Pending" color={chartColors.slate} /></div></div>
              {analytics.total > 0 ? <div role="img" aria-label="Horizontal stacked bar chart of completed and pending goals by category" className="w-full" style={{ height: Math.max(200, categoryData.length * 36 + 26) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 10, left: 0, bottom: 0 }} barCategoryGap={8}>
                    <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
                    <YAxis type="category" dataKey="name" width={76} axisLine={false} tickLine={false} tick={axisTick} />
                    <AnalyticsTooltip formatter={(value, name, item) => [`${value} · ${item.payload.total} total`, name]} />
                    <Bar dataKey="completed" name="Completed" stackId="goals" fill={chartColors.green} />
                    <Bar dataKey="pending" name="Pending" stackId="goals" fill={chartColors.slate} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div> : <p className="py-8 text-center text-xs text-slate-500">No goals due through today. Future goals are listed above.</p>}
              {analytics.total > 0 && <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/[0.05] pt-2 sm:grid-cols-3">{categoryData.map((item) => <p key={item.name} className="truncate text-[10px] text-slate-500" title={`${item.name}: ${item.completed} completed of ${item.total}`}>{item.name}: {item.completed}/{item.total}</p>)}</div>}
            </div>

            <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.015] p-3">
              <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words text-xs font-semibold text-slate-300">Priority distribution through today</h3><div className="flex flex-wrap gap-3"><LegendKey label="Completed" color={chartColors.blue} /><LegendKey label="Pending" color={chartColors.amber} /></div></div>
              {analytics.total > 0 ? <div role="img" aria-label="Horizontal stacked bar chart of completed and pending goals by priority" className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} layout="vertical" margin={{ top: 4, right: 10, left: 0, bottom: 0 }} barCategoryGap={20}>
                    <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
                    <YAxis type="category" dataKey="name" width={54} axisLine={false} tickLine={false} tick={axisTick} />
                    <AnalyticsTooltip formatter={(value, name, item) => [`${value} · ${item.payload.total} total`, name]} />
                    <Bar dataKey="completed" name="Completed" stackId="priority" fill={chartColors.blue} />
                    <Bar dataKey="pending" name="Pending" stackId="priority" fill={chartColors.amber} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div> : <p className="py-8 text-center text-xs text-slate-500">No current-period priority data yet.</p>}
              {analytics.total > 0 && <div className="mt-2 grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-2">{priorityData.map((item) => <p key={item.name} className="text-center text-[10px] text-slate-500">{item.name}: {item.completed}/{item.total}</p>)}</div>}
            </div>
          </div>

          {analytics.total > 0 && <div className="mt-5 space-y-4">
            <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.015] p-3">
              <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-xs font-semibold text-slate-300">Daily completion trend</h3><p className="mt-1 break-words text-[10px] text-slate-500">Current statuses by assigned date; future goals shown separately.</p></div><div className="flex flex-wrap gap-3"><LegendKey label="Completed" color={chartColors.green} /><LegendKey label="Pending" color={chartColors.slate} /><LegendKey label="Future goals" color={chartColors.amber} /></div></div>
              <div role="img" aria-label="Daily current-status trend with future goals shown separately" className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.dailyTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={22} tick={axisTick} tickFormatter={(date: string) => date.slice(5)} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} tick={axisTick} />
                    <AnalyticsTooltip labelFormatter={(date) => `Assigned date: ${date}`} formatter={(value, name) => [`${value} goals`, name]} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke={chartColors.green} strokeWidth={2} {...lineMarkers(chartColors.green)} />
                    <Line type="monotone" dataKey="pending" name="Pending" stroke={chartColors.slate} strokeWidth={2} {...lineMarkers(chartColors.slate)} />
                    <Line type="monotone" dataKey="future" name="Future goals" stroke={chartColors.amber} strokeWidth={2} strokeDasharray="4 3" {...lineMarkers(chartColors.amber)} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
              <CompletionTrend title="Weekly completion trend · Monday–Sunday" data={analytics.weeklyTrend} periodLabel="Weekly" />
              <CompletionTrend title="Monthly completion trend · calendar months" data={analytics.monthlyTrend} periodLabel="Monthly" />
            </div>
          </div>}
        </>}
      </div> : null}
    </AnalyticsSection>
  )
}
