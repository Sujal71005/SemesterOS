import type { DailyGoalCategory, DailyGoalPriority, DailyGoalStatus } from '../types/dailyGoals'

const categories: DailyGoalCategory[] = ['academics', 'dsa', 'coding', 'placement', 'skills', 'personal', 'other']
const priorities: DailyGoalPriority[] = ['low', 'medium', 'high']
const statuses: DailyGoalStatus[] = ['pending', 'completed']

export function validateDailyGoalTitle(title: string): string {
  const value = title.trim()
  if (!value || value.length > 180) throw new Error('Goal title must contain 1–180 characters.')
  return value
}

export function validateDailyGoalDescription(description: string | undefined): string {
  const value = description?.trim() ?? ''
  if (value.length > 1000) throw new Error('Goal description must be at most 1000 characters.')
  return value
}

export function validateDailyGoalCategory(value: unknown): asserts value is DailyGoalCategory {
  if (!categories.includes(value as DailyGoalCategory)) throw new Error('Choose a valid goal category.')
}

export function validateDailyGoalPriority(value: unknown): asserts value is DailyGoalPriority {
  if (!priorities.includes(value as DailyGoalPriority)) throw new Error('Choose a valid goal priority.')
}

export function validateDailyGoalStatus(value: unknown): asserts value is DailyGoalStatus {
  if (!statuses.includes(value as DailyGoalStatus)) throw new Error('Choose a valid goal status.')
}

export function validateDailyGoalDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('Enter a valid goal date in YYYY-MM-DD format.')

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year === 0 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new Error('Enter a valid calendar goal date.')
  }
  return value
}

/** Validates the status/timestamp pair and returns the normalized timestamp. */
export function validateDailyGoalCompletion(status: unknown, completedAt?: string | null): string | null {
  validateDailyGoalStatus(status)
  if (status === 'pending') {
    if (completedAt != null) throw new Error('Pending goals must not have a completion timestamp.')
    return null
  }

  if (completedAt == null || !completedAt.trim()) {
    throw new Error('Completed goals require a completion timestamp.')
  }
  const value = completedAt.trim()
  const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i
  if (!isoTimestamp.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('Enter a valid completion timestamp.')
  }
  validateDailyGoalDate(value.slice(0, 10))
  return value
}
