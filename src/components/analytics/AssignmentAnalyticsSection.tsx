import { useMemo } from 'react'
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { AssignmentAnalytics } from '../../types/analytics'
import type { AssignmentStatus } from '../../types/assignments'
import { AnalyticsSection } from './AnalyticsSection'
import { chartColors, lineMarkers } from './chartTheme'
import AnalyticsFilterSelect from './AnalyticsFilterSelect'
import type { FilterOption } from './AnalyticsFilterSelect'
import PeriodComparison from './PeriodComparison'
import type { PeriodComparison as PeriodComparisonValues } from '../../utils/periodComparison'
import AnalyticsTooltip from './AnalyticsTooltip'

type Props = { analytics?: AssignmentAnalytics; loading: boolean; error?: string; rangeLabel: string; subjectFilter: string; subjectOptions: FilterOption[]; onSubjectFilterChange: (value: string) => void; createdComparison?: PeriodComparisonValues; dueComparison?: PeriodComparisonValues; previousRangeLabel?: string }
const statuses: Array<{ key: AssignmentStatus; label: string; color: string }> = [
  { key: 'todo', label: 'To do', color: chartColors.amber },
  { key: 'in_progress', label: 'In progress', color: chartColors.violet },
  { key: 'submitted', label: 'Submitted', color: chartColors.blue },
  { key: 'done', label: 'Done', color: chartColors.green },
]

function CountCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.02] p-3"><p className="break-words text-[11px] text-slate-500">{label}</p><p className={`mt-1 break-words text-xl font-semibold tabular-nums ${tone}`}>{value}</p></div>
}

export default function AssignmentAnalyticsSection({ analytics, loading, error, rangeLabel, subjectFilter, subjectOptions, onSubjectFilterChange, createdComparison, dueComparison, previousRangeLabel }: Props) {
  const statusData = useMemo(() => analytics ? statuses.map(({ key, label }) => ({ name: label, value: analytics.statuses[key] })) : [], [analytics])
  const trendData = useMemo(() => analytics?.createdDateTrend.map((created, index) => ({ date: created.date, created: created.count, due: analytics.dueDateTrend[index]?.count ?? 0 })) ?? [], [analytics])

  return (
    <AnalyticsSection title="Assignment analytics" loading={loading} error={error}>
      {analytics ? <div>
        <p className="mb-3 text-[11px] text-slate-500">Status metrics are all-time current state. Created and due trends cover {rangeLabel}.</p>
        <div className="mb-4 max-w-xs"><AnalyticsFilterSelect label="Subject / lab" value={subjectFilter} options={[{ value: '', label: 'All subjects and labs' }, ...subjectOptions]} onChange={onSubjectFilterChange} /></div>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(5,minmax(0,1fr))]">
          <CountCard label="Total assignments" value={analytics.total} tone="text-white" />
          <CountCard label="To do" value={analytics.statuses.todo} tone="text-amber-200" />
          <CountCard label="In progress" value={analytics.statuses.in_progress} tone="text-violet-200" />
          <CountCard label="Submitted" value={analytics.submitted} tone="text-blue-200" />
          <CountCard label="Done" value={analytics.done} tone="text-emerald-200" />
          <CountCard label="Pending" value={analytics.pending} tone="text-slate-200" />
          <CountCard label="Overdue" value={analytics.overdue} tone="text-rose-300" />
          <CountCard label="Done-only completion" value={`${analytics.completionPercentage}%`} tone="text-emerald-200" />
        </div>
        <p className="mt-2 text-right text-[10px] text-slate-500">Completion percentage = done ÷ all assignments · {analytics.completionPercentage}%</p>

        {analytics.total === 0 ? <p className="mt-4 rounded-lg border border-dashed border-white/[0.09] px-4 py-6 text-center text-sm text-slate-500">No assignments are available. Status and trend charts will appear when assignment data exists.</p> : <div className="mt-5 grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 min-w-0 break-words text-xs font-semibold text-slate-300">All-time status distribution</h3>
            <div role="img" aria-label="Donut chart showing all-time assignment counts by current status" className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                    {statusData.map((item, index) => <Cell key={item.name} fill={statuses[index].color} />)}
                  </Pie>
                  <AnalyticsTooltip formatter={(value, name) => [`${value} assignments (${analytics.total ? Math.round(Number(value) / analytics.total * 100) : 0}%)`, name]} />
                  <Legend verticalAlign="bottom" height={34} wrapperStyle={{ fontSize: 10, color: chartColors.axis }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="mb-2 min-w-0 break-words text-xs font-semibold text-slate-300">Created and due dates · {rangeLabel}</h3>
            <div role="img" aria-label="Line chart of assignments created and due by local calendar date in the selected range" className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={22} tick={{ fill: chartColors.axis, fontSize: 9 }} tickFormatter={(date: string) => date.slice(5)} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} tick={{ fill: chartColors.axis, fontSize: 9 }} />
                  <AnalyticsTooltip labelFormatter={(date) => `Local date: ${date}`} formatter={(value, name) => [`${value} assignments`, name]} />
                  <Legend verticalAlign="bottom" height={34} wrapperStyle={{ fontSize: 10, color: chartColors.axis }} />
                  <Line type="monotone" dataKey="created" name="Created" stroke={chartColors.blue} strokeWidth={2} {...lineMarkers(chartColors.blue)} />
                  <Line type="monotone" dataKey="due" name="Due" stroke={chartColors.amber} strokeWidth={2} {...lineMarkers(chartColors.amber)} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>}
        {previousRangeLabel && (createdComparison || dueComparison) && <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
          {createdComparison && <PeriodComparison label="Assignments created comparison" values={createdComparison} previousRangeLabel={previousRangeLabel} unit=" assignments" />}
          {dueComparison && <PeriodComparison label="Assignments due comparison" values={dueComparison} previousRangeLabel={previousRangeLabel} unit=" assignments" />}
        </div>}
      </div> : null}
    </AnalyticsSection>
  )
}
