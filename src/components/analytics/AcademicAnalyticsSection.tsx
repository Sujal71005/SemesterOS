import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { AcademicAnalytics } from '../../types/analytics'
import { AnalyticsSection } from './AnalyticsSection'
import ProgressBar from '../academics/ProgressBar'
import { chartColors } from './chartTheme'
import AnalyticsFilterSelect from './AnalyticsFilterSelect'
import type { FilterOption } from './AnalyticsFilterSelect'
import AnalyticsTooltip from './AnalyticsTooltip'

type Props = { analytics?: AcademicAnalytics; loading: boolean; error?: string; subjectFilter: string; subjectOptions: FilterOption[]; onSubjectFilterChange: (value: string) => void }
type SubjectTickProps = { x?: number; y?: number; payload?: { value?: unknown } }

function SubjectAxisTick({ x = 0, y = 0, payload }: SubjectTickProps) {
  const fullLabel = String(payload?.value ?? '')
  const visibleLabel = fullLabel.length > 18 ? `${fullLabel.slice(0, 17)}…` : fullLabel
  return <g transform={`translate(${x},${y})`}>
    <title>{fullLabel}</title>
    <text x={-4} y={4} textAnchor="end" fill={chartColors.axis} fontSize={10}>{visibleLabel}</text>
  </g>
}

export default function AcademicAnalyticsSection({ analytics, loading, error, subjectFilter, subjectOptions, onSubjectFilterChange }: Props) {
  const chartRows = analytics?.subjects.filter((subject) => subject.total > 0).map((subject) => ({
    name: subject.name,
    completed: subject.completed,
    remaining: subject.pending,
    total: subject.total,
    percentage: subject.percentage,
  })) ?? []

  return (
    <AnalyticsSection title="Academic analytics" loading={loading} error={error}>
      {analytics ? <div>
        <div className="mb-4 max-w-xs"><AnalyticsFilterSelect label="Subject / lab" value={subjectFilter} options={[{ value: '', label: 'All subjects and labs' }, ...subjectOptions]} onChange={onSubjectFilterChange} /></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] p-3">
            <p className="text-xs text-slate-400">Overall syllabus completion</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{analytics.percentage}%</p>
            <ProgressBar percentage={analytics.percentage} label="All syllabus topics" />
            <p className="mt-2 text-[11px] text-slate-500">Topic-weighted · {analytics.total} topics total</p>
          </div>
          <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] p-3">
            <p className="text-xs text-slate-400">Topic counts</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{analytics.completed} <span className="text-sm font-normal text-slate-500">completed</span></p>
            <p className="mt-1 text-xs text-slate-400">{analytics.remaining} remaining</p>
          </div>
        </div>

        {analytics.total === 0 ? <div className="mt-4 rounded-lg border border-dashed border-white/[0.09] px-4 py-6 text-center text-sm text-slate-500">No syllabus topics are available to chart yet.</div> : <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(['theory', 'practical'] as const).map((section) => {
              const data = analytics[section]
              return <div key={section} className="rounded-lg border border-white/[0.055] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-medium capitalize text-slate-300">{section}</h3><span className="text-xs tabular-nums text-slate-400">{data.completed}/{data.total}</span></div>
                {data.total > 0 ? <ProgressBar percentage={data.percentage} label={`${section} completion`} /> : <p className="mt-2 text-[11px] text-slate-500">No {section} topics.</p>}
              </div>
            })}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words text-xs font-semibold text-slate-300">Subject-wise topic progress</h3><div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 shrink-0 rounded-sm bg-emerald-400" />Completed</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 shrink-0 rounded-sm bg-slate-600" />Remaining</span></div></div>
            {chartRows.length ? <div role="img" aria-label="Horizontal bar chart comparing completed and remaining topics by subject" className="w-full" style={{ height: Math.max(160, Math.min(360, chartRows.length * 42 + 46)) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap={10}>
                  <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: chartColors.axis, fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={112} axisLine={false} tickLine={false} tick={<SubjectAxisTick />} />
                  <AnalyticsTooltip formatter={(value, name, item) => [`${value} of ${item.payload.total} topics`, `${name} topics`]} labelFormatter={(label, items) => `${items[0]?.payload.name ?? label} · ${items[0]?.payload.percentage ?? 0}%`} />
                  <Bar dataKey="completed" name="Completed" stackId="topics" fill={chartColors.green} radius={[3, 0, 0, 3]} />
                  <Bar dataKey="remaining" name="Remaining" stackId="topics" fill={chartColors.slate} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div> : <p className="rounded-lg border border-dashed border-white/[0.09] px-3 py-4 text-center text-xs text-slate-500">No subjects have syllabus topics yet.</p>}
          </div>
        </>}

        {analytics.subjectsWithoutSyllabus.length > 0 && <div className="mt-5 border-t border-white/[0.055] pt-4">
          <h3 className="text-xs font-semibold text-slate-300">Subjects without syllabus topics <span className="ml-1 font-normal text-slate-500">({analytics.subjectsWithoutSyllabus.length})</span></h3>
          <ul className="mt-2 flex flex-wrap gap-2">{analytics.subjectsWithoutSyllabus.map((subject) => <li key={subject.id} className="max-w-full truncate rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[11px] text-slate-400">{subject.name}</li>)}</ul>
        </div>}
      </div> : null}
    </AnalyticsSection>
  )
}
