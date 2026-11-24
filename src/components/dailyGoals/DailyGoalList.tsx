import type { DailyGoal, DailyGoalPriority } from '../../types/dailyGoals'
import DailyGoalCard from './DailyGoalCard'

const priorityGroups: { priority: DailyGoalPriority; label: string }[] = [
  { priority: 'high', label: 'High priority' },
  { priority: 'medium', label: 'Medium priority' },
  { priority: 'low', label: 'Low priority' },
]

type Props = {
  goals: DailyGoal[]
  busyGoalIds: Set<string>
  actionErrors: Record<string, string>
  onEdit: (goal: DailyGoal) => void
  onComplete: (goal: DailyGoal) => void
  onReopen: (goal: DailyGoal) => void
  onDelete: (goal: DailyGoal) => void
}

export default function DailyGoalList({ goals, busyGoalIds, actionErrors, onEdit, onComplete, onReopen, onDelete }: Props) {
  return (
    <div className="min-w-0 space-y-5">
      {priorityGroups.map(({ priority, label }) => {
        const group = goals.filter((goal) => goal.priority === priority)
        if (!group.length) return null
        return (
          <section key={priority} className="min-w-0" aria-labelledby={`daily-goal-group-${priority}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 id={`daily-goal-group-${priority}`} className="text-xs font-semibold text-slate-300">{label}</h3>
              <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] tabular-nums text-slate-500">{group.length}</span>
            </div>
            <ul className="space-y-2">
              {group.map((goal) => <li key={goal.id}><DailyGoalCard
                goal={goal}
                busy={busyGoalIds.has(goal.id)}
                actionError={actionErrors[goal.id] ?? null}
                onEdit={onEdit}
                onComplete={onComplete}
                onReopen={onReopen}
                onDelete={onDelete}
              /></li>)}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
