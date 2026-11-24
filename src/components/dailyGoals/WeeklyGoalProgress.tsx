import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyGoal } from '../../types/dailyGoals'
import { calculateDailyGoalProgress, calculateWeeklyGoalProgress } from '../../utils/dailyGoalProgress'
import { formatDailyGoalDate, getWeekDates, parseDailyGoalDate } from '../../utils/dailyGoalDates'
import SectionCard from '../common/SectionCard'

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
  weekDate: string
  todayDate: string
  onWeekChange: (offset: -1 | 1) => void
}

function datePart(date: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(parseDailyGoalDate(date))
}

export default function WeeklyGoalProgress({ goals, weekDate, todayDate, onWeekChange }: Props) {
  const progress = calculateWeeklyGoalProgress(goals, weekDate, todayDate)
  const dates = getWeekDates(weekDate)
  const days = dates.map((date) => {
    const dayGoals = goals.filter((goal) => goal.goal_date === date)
    return { date, dayGoals, progress: calculateDailyGoalProgress(dayGoals), isFuture: date > todayDate }
  })
  const range = `${datePart(progress.week_start)} – ${datePart(progress.week_end)}`

  return (
    <SectionCard title="Weekly goal progress" className="mb-4 min-w-0" action={
      <div className="flex items-center gap-1" aria-label="Weekly goal progress navigation">
        <button type="button" onClick={() => onWeekChange(-1)} aria-label="Previous week" className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">
          <ChevronLeft size={15} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onWeekChange(1)} aria-label="Next week" className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    }>
      <p className="-mt-2 mb-4 text-xs text-slate-500" aria-live="polite">Monday–Sunday · {range}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Goals through today', value: progress.total },
          { label: 'Completed', value: progress.completed },
          { label: 'Pending', value: progress.pending },
          { label: 'Completion', value: `${progress.percentage}%` },
        ].map(({ label, value }) => (
          <div key={label} className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3">
            <p className="break-words text-[11px] leading-tight text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <span id="weekly-goal-progress-label" className="min-w-0 flex-1 text-slate-400">{progress.completed} of {progress.total} goals completed through today</span>
          <span className="text-slate-300">{progress.percentage}%</span>
        </div>
        <div role="progressbar" aria-labelledby="weekly-goal-progress-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage} aria-valuetext={`${progress.percentage}% complete`} className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-blue-400 transition-[width]" style={{ width: `${progress.percentage}%` }} />
        </div>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-xs font-semibold text-slate-300">Daily completion</h3>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" aria-label="Daily goal completion, Monday through Sunday">
          {days.map(({ date, dayGoals, progress: daily, isFuture }) => {
            const day = parseDailyGoalDate(date)
            const label = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day)
            const dayNumber = new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(day)
            return (
              <li key={date} className={`min-w-0 rounded-lg border p-2.5 sm:p-3 ${isFuture ? 'border-white/[0.06] bg-white/[0.015]' : 'border-white/[0.07] bg-white/[0.025]'}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[11px] font-semibold ${isFuture ? 'text-slate-500' : 'text-slate-300'}`}>{label}</span>
                  <span className="text-[10px] tabular-nums text-slate-500">{dayNumber}</span>
                </div>
                {isFuture ? (
                  <p className="mt-2 text-[11px] leading-4 text-slate-500">Upcoming{dayGoals.length ? ` · ${dayGoals.length} ${dayGoals.length === 1 ? 'goal' : 'goals'}` : ''}</p>
                ) : daily.total === 0 ? (
                  <p className="mt-2 text-[11px] leading-4 text-slate-600">No goals</p>
                ) : (
                  <>
                    <p className="mt-2 break-words text-[11px] tabular-nums text-slate-300">{daily.completed} / {daily.total} completed</p>
                    <div role="progressbar" aria-label={`${formatDailyGoalDate(date)}: ${daily.completed} of ${daily.total} goals completed`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={daily.percentage} className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${daily.percentage}%` }} />
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <section className="mt-5 border-t border-white/[0.06] pt-4" aria-labelledby="future-week-goals-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="future-week-goals-title" className="text-xs font-semibold text-slate-300">Future goals</h3>
          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] tabular-nums text-slate-500">{progress.future_goals.length}</span>
        </div>
        {progress.future_goals.length ? (
          <ul className="space-y-2">
            {progress.future_goals.map((goal) => (
              <li key={goal.id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.015] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-xs font-medium text-slate-200">{goal.title}</p>
                  <time dateTime={goal.goal_date} className="mt-1 block text-[10px] text-slate-500">{formatDailyGoalDate(goal.goal_date)}</time>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px]">
                  <span className="rounded-md border border-blue-400/20 bg-blue-400/[0.07] px-2 py-1 text-blue-200">{categoryLabels[goal.category]}</span>
                  <span className={`rounded-md border px-2 py-1 ${priorityStyles[goal.priority]}`}>{goal.priority[0].toUpperCase() + goal.priority.slice(1)} priority</span>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-slate-500">No future goals in this week.</p>}
      </section>
    </SectionCard>
  )
}
