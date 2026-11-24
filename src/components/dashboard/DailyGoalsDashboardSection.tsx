import { ArrowRight, Check, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionCard from '../common/SectionCard'
import type { DailyGoal } from '../../types/dailyGoals'
import { calculateDailyGoalProgress } from '../../utils/dailyGoalProgress'

const categoryLabels: Record<DailyGoal['category'], string> = {
  academics: 'Academics', dsa: 'DSA', coding: 'Coding', placement: 'Placement',
  skills: 'Skills', personal: 'Personal', other: 'Other',
}

const priorityStyles: Record<DailyGoal['priority'], string> = {
  high: 'border-rose-400/20 bg-rose-400/[0.07] text-rose-200',
  medium: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-200',
  low: 'border-white/[0.09] bg-white/[0.025] text-slate-400',
}

type Props = {
  goals: DailyGoal[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export default function DailyGoalsDashboardSection({ goals, loading, error, onRetry }: Props) {
  const progress = calculateDailyGoalProgress(goals)

  return (
    <SectionCard title="Today's goals" className="h-full min-w-0" action={
      <Link to="/daily-goals" className="inline-flex shrink-0 items-center gap-1 text-xs text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">
        Manage goals <ArrowRight size={13} aria-hidden="true" />
      </Link>
    }>
      {loading ? (
        <div role="status" className="space-y-2">
          <p className="text-sm text-slate-500">Loading today's goals…</p>
          <div className="h-12 animate-pulse rounded-lg bg-white/[0.025]" />
          <span className="sr-only">Loading today's goal progress.</span>
        </div>
      ) : error ? (
        <div>
          <p role="alert" className="break-words text-sm text-rose-300">Today's goals could not be loaded. {error}</p>
          <button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">
            <RefreshCw size={13} aria-hidden="true" />Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: progress.total, tone: 'text-slate-100' },
              { label: 'Completed', value: progress.completed, tone: 'text-emerald-200' },
              { label: 'Pending', value: progress.pending, tone: 'text-amber-200' },
            ].map(({ label, value, tone }) => (
              <div key={label} className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                <p className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
              <span id="dashboard-daily-goals-progress-label" className="text-slate-400">Today's completion</span>
              <span className="font-medium tabular-nums text-slate-200">{progress.percentage}%</span>
            </div>
            <div role="progressbar" aria-labelledby="dashboard-daily-goals-progress-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage} aria-valuetext={`${progress.percentage}% complete`} className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-blue-400 transition-[width]" style={{ width: `${progress.percentage}%` }} />
            </div>
          </div>

          {goals.length ? (
            <ul className="mt-3 divide-y divide-white/[0.05]" aria-label="Today's Daily Goals">
              {goals.slice(0, 4).map((goal) => (
                <li key={goal.id} className="flex min-w-0 items-start gap-2.5 py-2.5 first:pt-1">
                  <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${goal.status === 'completed' ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200' : 'border-white/15 text-transparent'}`} aria-hidden="true">
                    {goal.status === 'completed' && <Check size={11} aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`break-words text-xs font-medium ${goal.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{goal.title}</p>
                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="rounded border border-blue-400/20 bg-blue-400/[0.06] px-1.5 py-0.5 text-blue-200">{categoryLabels[goal.category]}</span>
                      <span className={`rounded border px-1.5 py-0.5 ${priorityStyles[goal.priority]}`}>{goal.priority[0].toUpperCase() + goal.priority.slice(1)}</span>
                      <span className={goal.status === 'completed' ? 'text-emerald-300' : 'text-slate-500'}>{goal.status === 'completed' ? 'Completed' : 'Pending'}</span>
                    </div>
                  </div>
                </li>
              ))}
              {goals.length > 4 && <li className="pt-2 text-xs text-slate-500">{goals.length - 4} more {goals.length - 4 === 1 ? 'goal' : 'goals'} today</li>}
            </ul>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-white/[0.08] px-3 py-5 text-center">
              <p className="text-sm font-medium text-slate-300">No goals planned for today</p>
              <p className="mt-1 text-xs text-slate-500">Add a goal whenever you are ready.</p>
            </div>
          )}
        </>
      )}

    </SectionCard>
  )
}
