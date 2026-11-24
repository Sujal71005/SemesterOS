import type { DailyGoalStatus } from '../types/dailyGoals'
import { getWeekEnd, getWeekStart, isDateInWeek, parseDailyGoalDate } from './dailyGoalDates'

export type DailyGoalProgressInput = { goal_date: string; status: DailyGoalStatus }
export type GoalProgress = { total: number; completed: number; pending: number; percentage: number }
export type WeeklyGoalProgress<T extends DailyGoalProgressInput> = GoalProgress & {
  week_start: string
  week_end: string
  future_goals: T[]
}

function progress(goals: DailyGoalProgressInput[]): GoalProgress {
  const completed = goals.filter((goal) => goal.status === 'completed').length
  const total = goals.length
  return { total, completed, pending: total - completed, percentage: total === 0 ? 0 : Math.round(completed / total * 100) }
}

export function calculateDailyGoalProgress(goals: DailyGoalProgressInput[]): GoalProgress {
  return progress(goals)
}

/** Counts goals in the selected week through today; later dates are returned separately. */
export function calculateWeeklyGoalProgress<T extends DailyGoalProgressInput>(
  goals: T[],
  weekDate: string,
  todayDate: string,
): WeeklyGoalProgress<T> {
  parseDailyGoalDate(todayDate)
  const week_start = getWeekStart(weekDate)
  const week_end = getWeekEnd(weekDate)
  const inWeek = goals.filter((goal) => isDateInWeek(goal.goal_date, weekDate))
  const currentGoals = inWeek.filter((goal) => goal.goal_date <= todayDate)
  const future_goals = inWeek.filter((goal) => goal.goal_date > todayDate)
  return { ...progress(currentGoals), week_start, week_end, future_goals }
}
