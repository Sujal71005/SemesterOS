export type DailyGoalCategory = 'academics' | 'dsa' | 'coding' | 'placement' | 'skills' | 'personal' | 'other'
export type DailyGoalPriority = 'low' | 'medium' | 'high'
export type DailyGoalStatus = 'pending' | 'completed'

/** Row shape for public.daily_goals. */
export type DailyGoal = {
  id: string
  user_id: string
  title: string
  description: string
  goal_date: string
  category: DailyGoalCategory
  priority: DailyGoalPriority
  status: DailyGoalStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type CreateDailyGoalInput = {
  title: string
  description?: string
  goal_date: string
  category: DailyGoalCategory
  priority?: DailyGoalPriority
  status?: DailyGoalStatus
  completed_at?: string | null
}

export type UpdateDailyGoalInput = Partial<CreateDailyGoalInput>
