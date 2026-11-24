import { CheckCircle2, Circle, ListTodo, Target } from 'lucide-react'
import SectionCard from '../common/SectionCard'
import type { DailyGoal } from '../../types/dailyGoals'
import { calculateDailyGoalProgress } from '../../utils/dailyGoalProgress'

type Props = { goals: DailyGoal[] }

export default function DailyGoalStats({ goals }: Props) {
  const progress = calculateDailyGoalProgress(goals)
  const stats = [
    { label: 'Total goals', value: progress.total, icon: ListTodo, tone: 'blue' },
    { label: 'Completed', value: progress.completed, icon: CheckCircle2, tone: 'green' },
    { label: 'Pending', value: progress.pending, icon: Circle, tone: 'amber' },
    { label: 'Completion', value: `${progress.percentage}%`, icon: Target, tone: 'violet' },
  ] as const

  return (
    <SectionCard title="Daily progress" className="mb-4 min-w-0">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex min-h-24 min-w-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 sm:gap-3 sm:p-4">
            <span className={`icon-tile tone-${tone} shrink-0`} aria-hidden="true"><Icon size={16} /></span>
            <div className="min-w-0">
              <p className="break-words text-[11px] leading-tight text-slate-400 sm:text-xs">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100 sm:text-xl">{value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span id="daily-goal-progress-label" className="text-slate-400">{progress.completed} of {progress.total} goals completed</span>
          <span className="text-slate-300">{progress.percentage}%</span>
        </div>
        <div role="progressbar" aria-labelledby="daily-goal-progress-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage} aria-valuetext={`${progress.percentage}% complete`} className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-blue-400 transition-[width]" style={{ width: `${progress.percentage}%` }} />
        </div>
      </div>
      {progress.total === 0 && <p className="mt-2 text-xs text-slate-500">Add goals for this day to track your progress.</p>}
    </SectionCard>
  )
}
