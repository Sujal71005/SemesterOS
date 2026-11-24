import type { StudySession, StudySessionOccurrence, StudySessionWithSubject } from '../types/studyPlanner'
import { validateOccurrenceDate } from './studyPlannerValidation'

const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
export function parseLocalDate(value:string):Date { const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if(!m) throw new Error('Enter a valid local date.'); const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12); if(dateKey(d)!==value) throw new Error('Enter a valid local date.'); return d }
export function formatLocalDate(date:Date):string { if(!Number.isFinite(date.getTime())) throw new Error('Enter a valid local date.'); return dateKey(date) }
export function calculateSessionOccurrences(sessions:Array<StudySession|StudySessionWithSubject>, startDate:string, endDate:string):StudySessionOccurrence[] {
  const start=parseLocalDate(startDate), end=parseLocalDate(endDate); if(start>end) throw new Error('Start date must not be after end date.')
  const out:StudySessionOccurrence[]=[]
  for(const session of sessions){
    if(session.schedule_type==='one_time'){ const d=session.session_date; if(d&&d>=startDate&&d<=endDate){validateOccurrenceDate(session,d);out.push({session,occurrence_date:d,start_time:session.start_time,end_time:session.end_time})} }
    else { const cursor=new Date(start); while(cursor<=end){if(cursor.getDay()===session.day_of_week){const d=dateKey(cursor);validateOccurrenceDate(session,d);out.push({session,occurrence_date:d,start_time:session.start_time,end_time:session.end_time})} cursor.setDate(cursor.getDate()+1)} }
  }
  return out.sort((a,b)=>a.occurrence_date.localeCompare(b.occurrence_date)||a.start_time.localeCompare(b.start_time))
}
export function sortOccurrences<T extends {occurrence_date:string;start_time:string}>(items:T[]):T[]{return [...items].sort((a,b)=>a.occurrence_date.localeCompare(b.occurrence_date)||a.start_time.localeCompare(b.start_time))}
