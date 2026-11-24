import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { CreateStudySessionInput, StudySession, StudySessionOccurrence, StudySessionWithSubject } from '../../types/studyPlanner'
import { calculateSessionOccurrences, formatLocalDate, parseLocalDate } from '../../utils/studyPlannerDates'
import { detectSessionOverlaps } from '../../utils/studyPlannerFiltering'

type Props = { proposed: CreateStudySessionInput; existingSessions: StudySessionWithSubject[]; selectedDate: string; excludeSessionId?: string }
function shiftLocalDate(value: string, days: number): string { const date = parseLocalDate(value); date.setDate(date.getDate() + days); return formatLocalDate(date) }
function timeLabel(value: string): string { const [hour, minute] = value.split(':').map(Number); return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, hour, minute)) }

export default function OverlapWarning({ proposed, existingSessions, selectedDate, excludeSessionId }: Props) {
  const overlaps = useMemo(() => {
    const synthetic = {
      ...proposed,
      id: '__proposed_session__', user_id: '', description: proposed.description ?? '',
      created_at: '', updated_at: '',
    } as StudySession
    const sessions = [...existingSessions.filter((session) => session.id !== excludeSessionId), synthetic]
    const start = proposed.schedule_type === 'one_time' ? proposed.session_date : selectedDate
    const end = proposed.schedule_type === 'one_time' ? proposed.session_date : shiftLocalDate(selectedDate, 6)
    const occurrences: StudySessionOccurrence[] = calculateSessionOccurrences(sessions, start, end)
    return detectSessionOverlaps(occurrences).filter(([left, right]) => left.session.id === synthetic.id || right.session.id === synthetic.id)
  }, [existingSessions, excludeSessionId, proposed, selectedDate])

  if (!overlaps.length) return null
  return <aside role="status" className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-3 text-sm text-amber-100">
    <p className="flex items-center gap-2 font-medium"><AlertTriangle size={15} />This session overlaps another session</p>
    <ul className="mt-2 space-y-1 pl-5 text-xs text-amber-100/80">
      {overlaps.map(([left, right]) => {
        const other = left.session.id === '__proposed_session__' ? right : left
        return <li key={`${other.session.id}:${other.occurrence_date}`}>
          {other.session.title} · {other.occurrence_date} · {timeLabel(other.start_time)}–{timeLabel(other.end_time)}
        </li>
      })}
    </ul>
    <p className="mt-2 text-xs text-amber-100/70">You can still save both sessions; neither will be changed.</p>
  </aside>
}
