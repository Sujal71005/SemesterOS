import type { CreateDailyGoalInput, DailyGoal, DailyGoalStatus, UpdateDailyGoalInput } from '../types/dailyGoals'
import {
  validateDailyGoalCategory,
  validateDailyGoalCompletion,
  validateDailyGoalDate,
  validateDailyGoalDescription,
  validateDailyGoalPriority,
  validateDailyGoalTitle,
  validateDailyGoalStatus,
} from './dailyGoalValidation'

export type DailyGoalInsert = Omit<DailyGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type DailyGoalUpdate = Partial<DailyGoalInsert>

export function prepareDailyGoalCreate(input: CreateDailyGoalInput, now = new Date().toISOString()): DailyGoalInsert {
  const status: DailyGoalStatus = input.status ?? 'pending'
  validateDailyGoalCategory(input.category)
  validateDailyGoalPriority(input.priority ?? 'medium')
  const hasCompletionValue = Object.hasOwn(input, 'completed_at')
  const completed_at = status === 'completed' && !hasCompletionValue ? now : input.completed_at
  return {
    title: validateDailyGoalTitle(input.title),
    description: validateDailyGoalDescription(input.description),
    goal_date: validateDailyGoalDate(input.goal_date),
    category: input.category,
    priority: input.priority ?? 'medium',
    status,
    completed_at: validateDailyGoalCompletion(status, completed_at),
  }
}

export function prepareDailyGoalUpdate(
  changes: UpdateDailyGoalInput,
  existing: DailyGoal,
  now = new Date().toISOString(),
): DailyGoalUpdate {
  const update: DailyGoalUpdate = {}
  if (Object.hasOwn(changes, 'title')) update.title = validateDailyGoalTitle(changes.title!)
  if (Object.hasOwn(changes, 'description')) update.description = validateDailyGoalDescription(changes.description)
  if (Object.hasOwn(changes, 'goal_date')) update.goal_date = validateDailyGoalDate(changes.goal_date!)
  if (Object.hasOwn(changes, 'category')) {
    validateDailyGoalCategory(changes.category)
    update.category = changes.category
  }
  if (Object.hasOwn(changes, 'priority')) {
    validateDailyGoalPriority(changes.priority)
    update.priority = changes.priority
  }

  const hasStatus = Object.hasOwn(changes, 'status')
  const hasCompletedAt = Object.hasOwn(changes, 'completed_at')
  if (hasStatus || hasCompletedAt) {
    const status = hasStatus ? changes.status! : existing.status
    validateDailyGoalStatus(status)
    let completed_at = hasCompletedAt ? changes.completed_at : existing.completed_at

    // Status-only transitions maintain the timestamp invariant automatically.
    if (hasStatus && !hasCompletedAt && status !== existing.status) {
      completed_at = status === 'completed' ? now : null
    }
    update.status = status
    update.completed_at = validateDailyGoalCompletion(status, completed_at)
  }

  if (Object.keys(update).length === 0) throw new Error('Provide at least one Daily Goal field to update.')
  return update
}
