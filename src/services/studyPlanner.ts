import { supabase } from '../lib/supabase'
import type {
  CreateSessionLogInput,
  CreateStudySessionInput,
  StudySession,
  StudySessionLog,
  StudySessionWithSubject,
  UpdateStudySessionInput,
} from '../types/studyPlanner'
import { validateOccurrenceDate, validateSessionFields, validateSessionLog } from '../utils/studyPlannerValidation'

const sessionFields = 'id,user_id,subject_id,title,description,session_category,schedule_type,day_of_week,session_date,start_time,end_time,created_at,updated_at'
const sessionWithSubjectFields = `${sessionFields},subject:subjects(id,name,kind)`
const sessionLogFields = 'id,user_id,session_id,occurrence_date,status,completed_at,created_at'

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function throwDatabaseError(action: string, error: { message: string; code?: string }): never {
  throw new Error(`Could not ${action}: ${error.message}`)
}

function throwLogCreateError(error: { message: string; code?: string }): never {
  if (error.code === '23505' && error.message.includes('study_session_logs_occurrence_key')) {
    throw new Error('A log already exists for this session occurrence.')
  }
  throwDatabaseError('create session log', error)
}

export async function createStudySession(input: CreateStudySessionInput): Promise<StudySession> {
  validateSessionFields(input)
  const { data, error } = await client().from('study_sessions').insert({
    ...input,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
  }).select(sessionFields).single()
  if (error) throwDatabaseError('create study session', error)
  return data as StudySession
}

export async function listStudySessions(): Promise<StudySessionWithSubject[]> {
  const { data, error } = await client().from('study_sessions')
    .select(sessionWithSubjectFields).order('start_time')
  if (error) throwDatabaseError('load study sessions', error)
  return (data ?? []) as unknown as StudySessionWithSubject[]
}

export async function getStudySession(id: string): Promise<StudySessionWithSubject> {
  const { data, error } = await client().from('study_sessions')
    .select(sessionWithSubjectFields).eq('id', id).maybeSingle()
  if (error) throwDatabaseError('load study session', error)
  if (!data) throw new Error('Study session was not found.')
  return data as unknown as StudySessionWithSubject
}

export async function updateStudySession(id: string, changes: UpdateStudySessionInput): Promise<StudySession> {
  const existing = await getStudySession(id)
  validateSessionFields(changes, existing)

  const update: UpdateStudySessionInput = { ...changes }
  if (changes.title !== undefined) update.title = changes.title.trim()
  if (changes.description !== undefined) update.description = changes.description.trim()

  const { data, error } = await client().from('study_sessions').update(update)
    .eq('id', id).select(sessionFields).maybeSingle()
  if (error) throwDatabaseError('update study session', error)
  if (!data) throw new Error('Study session was not found.')
  return data as StudySession
}

export async function deleteStudySession(id: string): Promise<void> {
  const { data, error } = await client().from('study_sessions').delete().eq('id', id).select('id')
  if (error) throwDatabaseError('delete study session', error)
  if (!data?.length) throw new Error('Study session was not found.')
}

export async function createSessionLog(input: CreateSessionLogInput): Promise<StudySessionLog> {
  const normalized = validateSessionLog(input)
  const parent = await getStudySession(input.session_id)
  validateOccurrenceDate(parent, input.occurrence_date)

  const { data, error } = await client().from('study_session_logs').insert(normalized)
    .select(sessionLogFields).single()
  if (error) throwLogCreateError(error)
  return data as StudySessionLog
}

export async function updateSessionLog(
  id: string,
  changes: Pick<CreateSessionLogInput, 'status' | 'completed_at'>,
): Promise<StudySessionLog> {
  const { data: current, error: readError } = await client().from('study_session_logs')
    .select(sessionLogFields).eq('id', id).maybeSingle()
  if (readError) throwDatabaseError('load session log', readError)
  if (!current) throw new Error('Session log was not found.')

  const parent = await getStudySession(current.session_id)
  validateOccurrenceDate(parent, current.occurrence_date)

  const status = changes.status ?? current.status
  const completed_at = status === 'completed'
    ? changes.completed_at ?? (current.status === 'completed' ? current.completed_at : new Date().toISOString())
    : null
  const normalized = validateSessionLog({
    session_id: current.session_id,
    occurrence_date: current.occurrence_date,
    status,
    completed_at,
  })

  const { data, error } = await client().from('study_session_logs')
    .update({ status: normalized.status, completed_at: normalized.completed_at })
    .eq('id', id).select(sessionLogFields).maybeSingle()
  if (error) throwDatabaseError('update session log', error)
  if (!data) throw new Error('Session log was not found.')
  return data as StudySessionLog
}

export async function listSessionLogs(sessionId?: string): Promise<StudySessionLog[]> {
  let query = client().from('study_session_logs').select(sessionLogFields)
  if (sessionId) query = query.eq('session_id', sessionId)
  const { data, error } = await query.order('occurrence_date')
  if (error) throwDatabaseError('load session logs', error)
  return (data ?? []) as StudySessionLog[]
}
