import { supabase } from '../lib/supabase'
import type { CreateDailyGoalInput, DailyGoal, UpdateDailyGoalInput } from '../types/dailyGoals'
import { validateDailyGoalDate } from '../utils/dailyGoalValidation'
import { prepareDailyGoalCreate, prepareDailyGoalUpdate } from '../utils/dailyGoalServiceInput'

const fields = 'id,user_id,title,description,goal_date,category,priority,status,completed_at,created_at,updated_at'

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function throwDatabaseError(action: string, error: { message: string }): never {
  throw new Error(`Could not ${action}: ${error.message}`)
}

export async function listDailyGoalsByDate(date: string): Promise<DailyGoal[]> {
  const validDate = validateDailyGoalDate(date)
  const { data, error } = await client().from('daily_goals').select(fields)
    .eq('goal_date', validDate).order('priority').order('created_at')
  if (error) throwDatabaseError('load Daily Goals', error)
  return (data ?? []) as DailyGoal[]
}

export async function listDailyGoalsByDateRange(startDate: string, endDate: string): Promise<DailyGoal[]> {
  const start = validateDailyGoalDate(startDate)
  const end = validateDailyGoalDate(endDate)
  if (start > end) throw new Error('Start date must not be after end date.')
  const { data, error } = await client().from('daily_goals').select(fields)
    .gte('goal_date', start).lte('goal_date', end).order('goal_date').order('priority').order('created_at')
  if (error) throwDatabaseError('load Daily Goals', error)
  return (data ?? []) as DailyGoal[]
}

export async function getDailyGoal(id: string): Promise<DailyGoal> {
  const { data, error } = await client().from('daily_goals').select(fields).eq('id', id).maybeSingle()
  if (error) throwDatabaseError('load Daily Goal', error)
  if (!data) throw new Error('Daily Goal was not found or you do not have permission to view it.')
  return data as DailyGoal
}

export async function createDailyGoal(input: CreateDailyGoalInput): Promise<DailyGoal> {
  const payload = prepareDailyGoalCreate(input)
  const { data, error } = await client().from('daily_goals').insert(payload).select(fields).single()
  if (error) throwDatabaseError('create Daily Goal', error)
  return data as DailyGoal
}

export async function updateDailyGoal(id: string, input: UpdateDailyGoalInput): Promise<DailyGoal> {
  const existing = await getDailyGoal(id)
  const changes = prepareDailyGoalUpdate(input, existing)
  const { data, error } = await client().from('daily_goals').update(changes).eq('id', id).select(fields).maybeSingle()
  if (error) throwDatabaseError('update Daily Goal', error)
  if (!data) throw new Error('Daily Goal was not found or you do not have permission to update it.')
  return data as DailyGoal
}

export async function completeDailyGoal(id: string): Promise<DailyGoal> {
  const { data, error } = await client().from('daily_goals').update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id).select(fields).maybeSingle()
  if (error) throwDatabaseError('complete Daily Goal', error)
  if (!data) throw new Error('Daily Goal was not found or you do not have permission to complete it.')
  return data as DailyGoal
}

export async function reopenDailyGoal(id: string): Promise<DailyGoal> {
  const { data, error } = await client().from('daily_goals').update({ status: 'pending', completed_at: null })
    .eq('id', id).select(fields).maybeSingle()
  if (error) throwDatabaseError('reopen Daily Goal', error)
  if (!data) throw new Error('Daily Goal was not found or you do not have permission to reopen it.')
  return data as DailyGoal
}

export async function deleteDailyGoal(id: string): Promise<void> {
  const { data, error } = await client().from('daily_goals').delete().eq('id', id).select('id')
  if (error) throwDatabaseError('delete Daily Goal', error)
  if (!data?.length) throw new Error('Daily Goal was not found or you do not have permission to delete it.')
}
