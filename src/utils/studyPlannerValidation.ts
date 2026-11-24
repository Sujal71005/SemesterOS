import type { CreateSessionLogInput, CreateStudySessionInput, ScheduleType, SessionCategory, SessionLogStatus, StudySession, UpdateStudySessionInput } from '../types/studyPlanner'

const categories: SessionCategory[] = ['lecture', 'practical', 'self_study', 'revision', 'other']
const schedules: ScheduleType[] = ['recurring', 'one_time']
const statuses: SessionLogStatus[] = ['planned', 'completed', 'skipped']
export function validateSessionTitle(title: string): string { const value=title.trim(); if (!value || value.length>180) throw new Error('Session title must contain 1–180 characters.'); return value }
export function validateSessionDescription(description: string | undefined): string { const value=description?.trim() ?? ''; if(value.length>5000) throw new Error('Session description must be at most 5000 characters.'); return value }
export function validateSessionCategory(value: unknown): asserts value is SessionCategory { if(!categories.includes(value as SessionCategory)) throw new Error('Choose a valid session category.') }
export function validateScheduleType(value: unknown): asserts value is ScheduleType { if(!schedules.includes(value as ScheduleType)) throw new Error('Choose a valid schedule type.') }
export function validateWeekday(value: unknown): asserts value is number { if(!Number.isInteger(value) || (value as number)<0 || (value as number)>6) throw new Error('Weekday must be an integer from Sunday 0 through Saturday 6.') }
export function validateTimeRange(start: string, end: string): void {
  const valid=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(s)
  if(!valid(start)||!valid(end)||start>=end) throw new Error('Enter valid local times with end time later than start time; overnight sessions are not supported.')
}
export function validateSessionFields(input: CreateStudySessionInput | UpdateStudySessionInput, existing?: StudySession): void {
  const row={...existing,...input}
  if(input.title!==undefined) validateSessionTitle(input.title)
  if(input.description!==undefined) validateSessionDescription(input.description)
  if(row.session_category!==undefined) validateSessionCategory(row.session_category)
  if(row.schedule_type!==undefined) validateScheduleType(row.schedule_type)
  if(row.start_time!==undefined&&row.end_time!==undefined) validateTimeRange(row.start_time,row.end_time)
  if(row.schedule_type==='recurring'){ if(row.day_of_week===null||row.day_of_week===undefined||row.session_date!=null) throw new Error('Recurring sessions require a weekday and no session date.'); validateWeekday(row.day_of_week) }
  else if(row.schedule_type==='one_time'&&(row.session_date==null||row.day_of_week!=null)) throw new Error('One-time sessions require a date and no weekday.')
}
export function validateOccurrenceDate(session: Pick<StudySession,'schedule_type'|'day_of_week'|'session_date'>, date: string): void {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(`${date}T00:00:00`).toString()==='Invalid Date') throw new Error('Enter a valid local occurrence date.')
  const local=new Date(`${date}T12:00:00`)
  if(local.toLocaleDateString('en-CA')!==date) throw new Error('Enter a valid local occurrence date.')
  if(session.schedule_type==='one_time'&&session.session_date!==date) throw new Error('Occurrence date must match the one-time session date.')
  if(session.schedule_type==='recurring'&&local.getDay()!==session.day_of_week) throw new Error('Occurrence date must match the recurring weekday.')
}
export function validateSessionLog(input: CreateSessionLogInput): CreateSessionLogInput {
  if(!statuses.includes(input.status)) throw new Error('Choose a valid session log status.')
  const completed=input.status==='completed'
  if(completed!==Boolean(input.completed_at)) throw new Error('completed_at must be set exactly when status is completed.')
  if(input.completed_at&&!Number.isFinite(Date.parse(input.completed_at))) throw new Error('Enter a valid completion timestamp.')
  return {...input,completed_at:completed?input.completed_at!:null}
}
