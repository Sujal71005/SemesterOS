import { CalendarDays, Check, LoaderCircle, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { DailyGoal } from '../../types/dailyGoals'
import { formatDailyGoalDate, parseDailyGoalDate } from '../../utils/dailyGoalDates'

const categoryLabels: Record<DailyGoal['category'], string> = {
  academics: 'Academics', dsa: 'DSA', coding: 'Coding', placement: 'Placement',
  skills: 'Skills', personal: 'Personal', other: 'Other',
}
const priorityLabels: Record<DailyGoal['priority'], string> = { low: 'Low', medium: 'Medium', high: 'High' }
const priorityStyles: Record<DailyGoal['priority'], string> = {
  high: 'border-rose-400/20 bg-rose-400/[0.07] text-rose-200',
  medium: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-200',
  low: 'border-white/[0.09] bg-white/[0.025] text-slate-400',
}

type Props = {
  goal: DailyGoal
  busy: boolean
  actionError: string | null
  onEdit: (goal: DailyGoal) => void
  onComplete: (goal: DailyGoal) => void
  onReopen: (goal: DailyGoal) => void
  onDelete: (goal: DailyGoal) => void
}

export default function DailyGoalCard({ goal, busy, actionError, onEdit, onComplete, onReopen, onDelete }: Props) {
  const date = parseDailyGoalDate(goal.goal_date)
  const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
  return (
    <article className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <h3 className={`min-w-0 flex-1 break-words text-sm font-semibold leading-snug ${goal.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
              {goal.title}
            </h3>
            <button type="button" disabled={busy} onClick={() => onEdit(goal)} aria-label={`Edit ${goal.title}`} title={`Edit ${goal.title}`} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:border-blue-400/30 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:cursor-wait disabled:opacity-50">
              <Pencil size={13} aria-hidden="true" />Edit
            </button>
          </div>
          {goal.description && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-400">{goal.description}</p>}
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-md border border-blue-400/20 bg-blue-400/[0.07] px-2 py-1 text-blue-200">{categoryLabels[goal.category]}</span>
            <span className={`rounded-md border px-2 py-1 ${priorityStyles[goal.priority]}`}>{priorityLabels[goal.priority]} priority</span>
            <span className={`inline-flex items-center gap-1 ${goal.status === 'completed' ? 'text-emerald-300' : 'text-slate-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${goal.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-500'}`} aria-hidden="true" />
              {goal.status === 'completed' ? 'Completed' : 'Pending'}
            </span>
            <time dateTime={goal.goal_date} aria-label={`Goal date: ${formatDailyGoalDate(goal.goal_date)}`} className="inline-flex items-center gap-1 text-slate-500">
              <CalendarDays size={12} aria-hidden="true" />{shortDate}
            </time>
          </div>
          {actionError && <p role="alert" className="mt-3 break-words text-xs text-rose-300">{actionError}</p>}
          <div className="mt-3 grid min-w-0 grid-cols-2 items-center gap-2 border-t border-white/[0.06] pt-3 sm:flex sm:flex-wrap">
            {goal.status === 'pending' ? (
              <button type="button" disabled={busy} onClick={() => onComplete(goal)} aria-label={`Complete ${goal.title}`} className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-400/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-wait disabled:opacity-50 sm:w-auto sm:px-3">
                {busy ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}{busy ? 'Saving…' : 'Complete'}
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => onReopen(goal)} aria-label={`Reopen ${goal.title}`} className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/[0.05] px-2 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:cursor-wait disabled:opacity-50 sm:w-auto sm:px-3">
                {busy ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={13} aria-hidden="true" />}{busy ? 'Saving…' : 'Reopen'}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => onDelete(goal)} aria-label={`Delete ${goal.title}`} className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-rose-400/20 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-400/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60 disabled:cursor-wait disabled:opacity-50 sm:w-auto sm:px-3">
              <Trash2 size={13} aria-hidden="true" />Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
