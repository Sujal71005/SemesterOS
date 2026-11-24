import type { SubjectKind } from './academics'

export type SessionCategory = 'lecture' | 'practical' | 'self_study' | 'revision' | 'other'
export type ScheduleType = 'recurring' | 'one_time'
export type SessionLogStatus = 'planned' | 'completed' | 'skipped'

/** Row shape for public.study_sessions. Times are local wall-clock values. */
type StudySessionBase = {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  description: string
  session_category: SessionCategory
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

/** Database row, with nullable schedule columns as stored by PostgreSQL. */
export type StudySession = StudySessionBase & (
  | { schedule_type: 'recurring'; day_of_week: number; session_date: null }
  | { schedule_type: 'one_time'; day_of_week: null; session_date: string }
)

export type StudySessionLog = {
  id: string
  user_id: string
  session_id: string
  occurrence_date: string
  status: SessionLogStatus
  completed_at: string | null
  created_at: string
}

type StudySessionInputBase = {
  subject_id: string | null
  title: string
  description?: string
  session_category: SessionCategory
  start_time: string
  end_time: string
}

/** Creation payload; schedule fields are mutually exclusive by schedule type. */
export type CreateStudySessionInput = StudySessionInputBase & (
  | { schedule_type: 'recurring'; day_of_week: number; session_date?: null }
  | { schedule_type: 'one_time'; day_of_week?: null; session_date: string }
)

/** Partial editable payload; callers can submit fields changed by the user. */
export type UpdateStudySessionInput = Partial<Omit<CreateStudySessionInput, 'schedule_type'>> & {
  schedule_type?: ScheduleType
  day_of_week?: number | null
  session_date?: string | null
}

export type CreateSessionLogInput = {
  session_id: string
  occurrence_date: string
  status: SessionLogStatus
  completed_at?: string | null
}

export type StudySessionWithSubject = StudySession & {
  subject: { id: string; name: string; kind: SubjectKind } | null
}

/** A calculated local-date occurrence; this is not itself a database row. */
export type StudySessionOccurrence = {
  session: StudySessionWithSubject | StudySession
  occurrence_date: string
  start_time: string
  end_time: string
  log?: StudySessionLog
}
