import { useMemo } from 'react'
import { AlertTriangle, BookOpen, CheckCircle2, Clock3, FlaskConical, Pencil, SkipForward, Trash2 } from 'lucide-react'
import type { StudySessionOccurrence, StudySessionWithSubject } from '../../types/studyPlanner'
import { sortOccurrences } from '../../utils/studyPlannerDates'
import { detectSessionOverlaps } from '../../utils/studyPlannerFiltering'
import { parseLocalDate } from '../../utils/studyPlannerDates'
import { sessionCategoryStyles } from './StudyPlannerWeekView'
import SessionCompletionControl from './SessionCompletionControl'
import type { SessionLogStatus } from '../../types/studyPlanner'

type Props = { selectedDate: string; occurrences: StudySessionOccurrence[]; savingOccurrenceKey: string | null; occurrenceErrors: Record<string, string>; onStatusChange: (occurrence: StudySessionOccurrence, status: SessionLogStatus) => void; onEdit: (session: StudySessionWithSubject) => void; onDelete: (session: StudySessionWithSubject) => void }

function clockMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function displayTime(value: string): string {
  const [hour, minute] = value.split(':').map(Number)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, hour, minute))
}

function durationLabel(start: string, end: string): string {
  const total = clockMinutes(end) - clockMinutes(start)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

export default function StudyPlannerDayView({ selectedDate, occurrences, savingOccurrenceKey, occurrenceErrors, onStatusChange, onEdit, onDelete }: Props) {
  const date = parseLocalDate(selectedDate)
  const heading = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
  const dayOccurrences = useMemo(() => sortOccurrences(occurrences.filter((item) => item.occurrence_date === selectedDate)), [occurrences, selectedDate])
  const overlaps = useMemo(() => detectSessionOverlaps(dayOccurrences), [dayOccurrences])
  const overlapKeys = new Set(overlaps.flatMap(([a, b]) => [`${a.session.id}:${a.occurrence_date}`, `${b.session.id}:${b.occurrence_date}`]))

  if (!dayOccurrences.length) return <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.015] px-5 py-12 text-center">
    <Clock3 size={24} className="mx-auto text-slate-600" />
    <p className="mt-3 text-sm font-medium text-slate-300">No sessions scheduled</p>
    <p className="mt-1 text-xs text-slate-500">There are no college or personal study sessions for {heading}.</p>
  </div>

  return <section aria-label={`Schedule for ${heading}`}>
    {overlaps.length > 0 && <p role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200"><AlertTriangle size={14} />{overlaps.length} overlapping {overlaps.length === 1 ? 'pair' : 'pairs'} detected. Review the session times below.</p>}
    <ol className="space-y-2">
      {dayOccurrences.map((occurrence) => {
        const session = occurrence.session
        if (!('subject' in session)) return null
        const category = sessionCategoryStyles[session.session_category]
        const hasSubject = 'subject' in session
        const subject = hasSubject ? session.subject : null
        const SubjectIcon = subject?.kind === 'lab' ? FlaskConical : BookOpen
        const status = occurrence.log?.status === 'completed' ? 'Completed' : occurrence.log?.status === 'skipped' ? 'Skipped' : 'Pending'
        const statusStyle = status === 'Completed' ? 'text-emerald-300' : status === 'Skipped' ? 'text-slate-400' : 'text-amber-200'
        const StatusIcon = status === 'Completed' ? CheckCircle2 : status === 'Skipped' ? SkipForward : Clock3
        const overlap = overlapKeys.has(`${session.id}:${occurrence.occurrence_date}`)
        const occurrenceKey = `${session.id}:${occurrence.occurrence_date}`

        return <li key={`${session.id}:${occurrence.occurrence_date}`}>
          <article className={`min-w-0 rounded-xl border bg-white/[0.025] p-4 sm:p-5 ${overlap ? 'border-amber-400/30' : 'border-white/[0.07]'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex shrink-0 items-center gap-2 sm:w-44 sm:flex-col sm:items-start sm:gap-1">
                <time className="text-sm font-semibold tabular-nums text-slate-100">{displayTime(occurrence.start_time)}</time>
                <span className="text-xs text-slate-500 sm:hidden">to</span>
                <time className="text-xs tabular-nums text-slate-400 sm:text-sm">{displayTime(occurrence.end_time)}</time>
                <span className="hidden text-[11px] text-slate-500 sm:inline">{durationLabel(occurrence.start_time, occurrence.end_time)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2.5">
                  <h4 className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-slate-100">{session.title}</h4>
                  <div className="flex max-w-full flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 text-xs ${statusStyle}`}><StatusIcon size={14} />{status}</span><button type="button" title={`Edit ${session.title}`} onClick={() => onEdit(session as StudySessionWithSubject)} aria-label={`Edit ${session.title}`} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"><Pencil size={14} />Edit</button><button type="button" title={`Delete ${session.title}`} onClick={() => onDelete(session as StudySessionWithSubject)} aria-label={`Delete ${session.title}`} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-rose-400/20 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-400/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"><Trash2 size={14} />Delete</button></div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className={`rounded-md border px-2 py-1 ${category.classes}`}>{category.label}</span>
                  <span className="inline-flex min-w-0 items-start gap-1.5 break-words text-slate-300"><SubjectIcon size={14} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{subject?.name ?? 'Personal session'}</span></span>
                  <span className="text-slate-500 sm:hidden">{durationLabel(occurrence.start_time, occurrence.end_time)}</span>
                  {overlap && <span className="inline-flex items-center gap-1 text-amber-200"><AlertTriangle size={12} />Overlaps another session</span>}
                </div>
                {session.description && <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-400">{session.description}</p>}
                <div className="mt-3 border-t border-white/[0.06] pt-3"><SessionCompletionControl occurrence={occurrence} saving={savingOccurrenceKey === occurrenceKey} error={occurrenceErrors[occurrenceKey] ?? null} onChange={(nextStatus) => onStatusChange(occurrence, nextStatus)} /></div>
              </div>
            </div>
          </article>
        </li>
      })}
    </ol>
  </section>
}
