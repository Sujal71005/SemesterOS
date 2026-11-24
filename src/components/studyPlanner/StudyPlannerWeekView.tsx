import { useMemo } from 'react'
import { AlertTriangle, BookOpen, FlaskConical, Pencil, Trash2 } from 'lucide-react'
import type { StudySessionOccurrence, StudySessionWithSubject } from '../../types/studyPlanner'
import type { SessionLogStatus } from '../../types/studyPlanner'
import { detectSessionOverlaps } from '../../utils/studyPlannerFiltering'
import { formatLocalDate, parseLocalDate } from '../../utils/studyPlannerDates'
import SessionCompletionControl from './SessionCompletionControl'

type Props = { dates: string[]; occurrences: StudySessionOccurrence[]; savingOccurrenceKey: string | null; occurrenceErrors: Record<string, string>; onStatusChange: (occurrence: StudySessionOccurrence, status: SessionLogStatus) => void; onEdit: (session: StudySessionWithSubject) => void; onDelete: (session: StudySessionWithSubject) => void }
type PositionedOccurrence = StudySessionOccurrence & { lane: number; laneCount: number }

const HOUR_HEIGHT = 60
const MIN_DAY_COLUMN_WIDTH = 184
export const sessionCategoryStyles = {
  lecture: { label: 'Lecture', classes: 'border-blue-400/30 bg-blue-500/15 text-blue-100' },
  practical: { label: 'Practical', classes: 'border-violet-400/30 bg-violet-500/15 text-violet-100' },
  self_study: { label: 'Self-study', classes: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100' },
  revision: { label: 'Revision', classes: 'border-amber-400/30 bg-amber-500/15 text-amber-100' },
  other: { label: 'Other', classes: 'border-slate-400/30 bg-slate-500/15 text-slate-100' },
} as const
const pad = (value: number) => String(value).padStart(2, '0')

function timeMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function displayTime(value: string): string {
  const [hour, minute] = value.split(':').map(Number)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, hour, minute))
}

function formatDay(date: string): { weekday: string; day: string } {
  const localDate = parseLocalDate(date)
  return {
    weekday: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(localDate),
    day: new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(localDate),
  }
}

function positionOccurrences(occurrences: StudySessionOccurrence[]): Map<string, PositionedOccurrence[]> {
  const grouped = new Map<string, StudySessionOccurrence[]>()
  for (const occurrence of occurrences) {
    const rows = grouped.get(occurrence.occurrence_date) ?? []
    rows.push(occurrence)
    grouped.set(occurrence.occurrence_date, rows)
  }

  const result = new Map<string, PositionedOccurrence[]>()
  for (const [date, rows] of grouped) {
    rows.sort((a, b) => timeMinutes(a.start_time) - timeMinutes(b.start_time) || timeMinutes(a.end_time) - timeMinutes(b.end_time))
    const laneEnds: number[] = []
    const positioned = rows.map((row) => {
      const start = timeMinutes(row.start_time)
      let lane = laneEnds.findIndex((end) => end <= start)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = timeMinutes(row.end_time)
      return { ...row, lane, laneCount: 0 }
    })
    for (const row of positioned) row.laneCount = Math.max(1, laneEnds.length)
    result.set(date, positioned)
  }
  return result
}

export default function StudyPlannerWeekView({ dates, occurrences, savingOccurrenceKey, occurrenceErrors, onStatusChange, onEdit, onDelete }: Props) {
  const today = formatLocalDate(new Date())
  const positions = useMemo(() => positionOccurrences(occurrences), [occurrences])
  const dayColumnWidths = useMemo(() => dates.map((date) => {
    const laneCount = Math.max(1, ...(positions.get(date) ?? []).map((row) => row.laneCount))
    return Math.max(MIN_DAY_COLUMN_WIDTH, laneCount * MIN_DAY_COLUMN_WIDTH)
  }), [dates, positions])
  const gridColumns = `56px ${dayColumnWidths.map((width) => `${width}px`).join(' ')}`
  const gridMinWidth = 56 + dayColumnWidths.reduce((sum, width) => sum + width, 0)
  const overlapKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const [left, right] of detectSessionOverlaps(occurrences)) {
      keys.add(`${left.session.id}:${left.occurrence_date}`)
      keys.add(`${right.session.id}:${right.occurrence_date}`)
    }
    return keys
  }, [occurrences])
  const visibleRange = useMemo(() => {
    if (!occurrences.length) return { start: 7, end: 20 }
    const earliest = Math.min(...occurrences.map((item) => timeMinutes(item.start_time)))
    const latest = Math.max(...occurrences.map((item) => timeMinutes(item.end_time)))
    return { start: Math.max(0, Math.floor(earliest / 60) - 1), end: Math.min(24, Math.ceil(latest / 60) + 1) }
  }, [occurrences])
  const hours = Array.from({ length: visibleRange.end - visibleRange.start }, (_, index) => index + visibleRange.start)
  const gridHeight = (visibleRange.end - visibleRange.start) * HOUR_HEIGHT
  const hasSessions = occurrences.length > 0

  if (!dates.length) return null
  if (!hasSessions) return <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.015] px-5 py-12 text-center">
    <p className="text-sm font-medium text-slate-300">No sessions this week</p>
    <p className="mt-1 text-xs text-slate-500">Your recurring classes and dated study sessions will appear here.</p>
  </div>

  return <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-white/[0.07]" aria-label="Weekly timetable, Monday through Sunday" tabIndex={0}>
    <div style={{ minWidth: `${gridMinWidth}px` }}>
      <div className="grid border-b border-white/[0.08] bg-white/[0.025]" style={{ gridTemplateColumns: gridColumns }}>
        <div className="border-r border-white/[0.06]" aria-hidden="true" />
        {dates.map((date) => {
          const info = formatDay(date)
          const isToday = date === today
          return <div key={date} className={`border-r border-white/[0.06] px-2 py-3 text-center last:border-r-0 ${isToday ? 'bg-blue-400/[0.08]' : ''}`}>
            <p className={`text-xs font-semibold ${isToday ? 'text-blue-200' : 'text-slate-300'}`}>{info.weekday}</p>
            <p className={`mt-0.5 text-[10px] ${isToday ? 'text-blue-300' : 'text-slate-500'}`}>{info.day}{isToday && <span className="sr-only">, today</span>}</p>
          </div>
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
        <div className="relative border-r border-white/[0.06] bg-white/[0.01]" style={{ height: `${gridHeight}px` }}>
          {hours.map((hour) => <div key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-slate-500" style={{ top: `${(hour - visibleRange.start) * HOUR_HEIGHT}px` }}>{pad(hour)}:00</div>)}
        </div>
        {dates.map((date) => {
          const isToday = date === today
          const rows = positions.get(date) ?? []
          return <div key={date} className={`relative border-r border-white/[0.06] last:border-r-0 ${isToday ? 'bg-blue-400/[0.035]' : ''}`} style={{ height: `${gridHeight}px`, backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 59px, rgba(255,255,255,.055) 59px, rgba(255,255,255,.055) 60px)' }}>
            {rows.map((row) => {
              const start = timeMinutes(row.start_time)
              const end = timeMinutes(row.end_time)
              const top = (start - visibleRange.start * 60) * HOUR_HEIGHT / 60
              const height = (end - start) * HOUR_HEIGHT / 60
              const style = sessionCategoryStyles[row.session.session_category]
              const overlap = overlapKeys.has(`${row.session.id}:${row.occurrence_date}`)
              const laneWidth = MIN_DAY_COLUMN_WIDTH
              const left = `${row.lane * laneWidth + 2}px`
              const width = `${laneWidth - 4}px`
              const showScheduleDetails = height >= 54
              const showSubject = height >= 84
              const subject = 'subject' in row.session ? row.session.subject : null
              if (!('subject' in row.session)) return null
              const SubjectIcon = subject?.kind === 'lab' ? FlaskConical : BookOpen
              const occurrenceKey = `${row.session.id}:${row.occurrence_date}`
              return <article key={`${row.session.id}:${row.occurrence_date}`} aria-label={`${row.session.title}, ${style.label}, ${displayTime(row.start_time)} to ${displayTime(row.end_time)}`} className={`absolute z-10 flex min-w-0 flex-col overflow-visible rounded-md border p-0.5 shadow-sm hover:z-30 focus-within:z-30 ${style.classes} ${overlap ? 'ring-1 ring-rose-300/40' : ''}`} style={{ top: `${top}px`, minHeight: '34px', height: `${Math.max(34, height)}px`, left, width }}>
                <div className="flex h-7 min-w-0 shrink-0 items-center gap-1">
                  <p title={row.session.title} className="min-w-0 flex-1 truncate whitespace-nowrap text-[10px] font-semibold leading-tight sm:text-[11px]">{row.session.title}</p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {overlap && <span title="Overlaps another session" aria-label="Overlapping session"><AlertTriangle size={13} /></span>}
                    <button type="button" onClick={() => onEdit(row.session as StudySessionWithSubject)} aria-label={`Edit ${row.session.title}`} title={`Edit ${row.session.title}`} className="grid h-7 w-7 place-items-center rounded-md hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"><Pencil size={13} /></button>
                    <button type="button" onClick={() => onDelete(row.session as StudySessionWithSubject)} aria-label={`Delete ${row.session.title}`} title={`Delete ${row.session.title}`} className="grid h-7 w-7 place-items-center rounded-md text-rose-200 hover:bg-rose-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70"><Trash2 size={13} /></button>
                    <SessionCompletionControl occurrence={row} saving={savingOccurrenceKey === occurrenceKey} error={occurrenceErrors[occurrenceKey] ?? null} compact onChange={(nextStatus) => onStatusChange(row, nextStatus)} />
                  </div>
                </div>
                {showScheduleDetails && <p title={`${style.label} · ${displayTime(row.start_time)}–${displayTime(row.end_time)}`} className="mt-0.5 min-w-0 truncate whitespace-nowrap text-[9px] leading-tight opacity-90">{style.label} · {displayTime(row.start_time)}–{displayTime(row.end_time)}</p>}
                {showSubject && <p title={subject?.name ?? 'Personal session'} className="mt-0.5 flex min-w-0 items-center gap-1 truncate whitespace-nowrap text-[9px] leading-tight opacity-90"><SubjectIcon size={10} className="shrink-0" /><span className="min-w-0 truncate">{subject?.name ?? 'Personal session'}</span></p>}
              </article>
            })}
          </div>
        })}
      </div>
    </div>
    <p className="sr-only">JavaScript weekday values use Sunday as 0; displayed columns run Monday through Sunday. Session times are local wall-clock times.</p>
  </div>
}
