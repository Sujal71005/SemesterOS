import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import SectionCard from '../components/common/SectionCard'
import { createSessionLog, createStudySession, deleteStudySession, listSessionLogs, listStudySessions, updateSessionLog, updateStudySession } from '../services/studyPlanner'
import type { CreateStudySessionInput, SessionLogStatus, StudySessionLog, StudySessionOccurrence, StudySessionWithSubject, UpdateStudySessionInput } from '../types/studyPlanner'
import { listSubjects } from '../services/academics'
import type { Subject } from '../types/academics'
import { calculateSessionOccurrences, formatLocalDate, parseLocalDate } from '../utils/studyPlannerDates'
import { createLatestRequestGate } from '../utils/latestRequest'
import StudyPlannerWeekView from '../components/studyPlanner/StudyPlannerWeekView'
import StudyPlannerDayView from '../components/studyPlanner/StudyPlannerDayView'
import StudySessionFormModal from '../components/studyPlanner/StudySessionFormModal'
import DeleteStudySessionDialog from '../components/studyPlanner/DeleteStudySessionDialog'

type ViewMode = 'week' | 'day'
type LoadState = 'loading' | 'ready' | 'error'

function shiftDate(value: string, amount: number): string {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

function weekDates(selectedDate: string): string[] {
  const selected = parseLocalDate(selectedDate)
  const mondayOffset = (selected.getDay() + 6) % 7
  selected.setDate(selected.getDate() - mondayOffset)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(selected)
    date.setDate(selected.getDate() + index)
    return formatLocalDate(date)
  })
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, options).format(parseLocalDate(value))
}

export default function TimetablePage() {
  const [view, setView] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()))
  const [sessions, setSessions] = useState<StudySessionWithSubject[]>([])
  const [logs, setLogs] = useState<StudySessionLog[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [modalSession, setModalSession] = useState<StudySessionWithSubject | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [savingOccurrenceKey, setSavingOccurrenceKey] = useState<string | null>(null)
  const [occurrenceErrors, setOccurrenceErrors] = useState<Record<string, string>>({})
  const inFlightOccurrences = useRef(new Set<string>())
  const [deleteTarget, setDeleteTarget] = useState<StudySessionWithSubject | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const requestGate = useRef(createLatestRequestGate())

  const datesInWeek = useMemo(() => weekDates(selectedDate), [selectedDate])
  const period = useMemo(() => view === 'week'
    ? { start: datesInWeek[0], end: datesInWeek[6] }
    : { start: selectedDate, end: selectedDate }, [datesInWeek, selectedDate, view])

  useEffect(() => {
    const request = requestGate.current.begin()
    setLoadState('loading')
    setError(null)
    Promise.all([listStudySessions(), listSessionLogs(), listSubjects()]).then(([sessionRows, logRows, subjectRows]) => {
      if (!requestGate.current.isCurrent(request)) return
      setSessions(sessionRows)
      setLogs(logRows)
      setSubjects(subjectRows)
      setLoadState('ready')
    }).catch((cause: unknown) => {
      if (!requestGate.current.isCurrent(request)) return
      setError(cause instanceof Error ? cause.message : 'Could not load the Study Planner.')
      setLoadState('error')
    })
    return () => requestGate.current.invalidate()
  }, [period.start, period.end, retry])

  const occurrences = useMemo<StudySessionOccurrence[]>(() => {
    if (loadState !== 'ready') return []
    const logByOccurrence = new Map(logs.map((log) => [`${log.session_id}:${log.occurrence_date}`, log]))
    return calculateSessionOccurrences(sessions, period.start, period.end).map((occurrence) => ({
      ...occurrence,
      log: logByOccurrence.get(`${occurrence.session.id}:${occurrence.occurrence_date}`),
    }))
  }, [loadState, logs, period.end, period.start, sessions])

  const saveSession = async (input: CreateStudySessionInput | UpdateStudySessionInput) => {
    if (saving) return
    setSaving(true)
    try {
      if (modalSession) await updateStudySession(modalSession.id, input as UpdateStudySessionInput)
      else await createStudySession(input as CreateStudySessionInput)
      setModalSession(undefined)
      setNotice(modalSession ? 'Session updated.' : 'Session created.')
      setRetry((value) => value + 1)
    } finally { setSaving(false) }
  }

  const changeOccurrenceStatus = async (occurrence: StudySessionOccurrence, status: SessionLogStatus) => {
    const key = `${occurrence.session.id}:${occurrence.occurrence_date}`
    if (inFlightOccurrences.current.has(key)) return
    inFlightOccurrences.current.add(key)
    setSavingOccurrenceKey(key)
    setOccurrenceErrors((current) => { const next = { ...current }; delete next[key]; return next })
    try {
      const completed_at = status === 'completed' ? new Date().toISOString() : null
      const saved = occurrence.log
        ? await updateSessionLog(occurrence.log.id, { status, completed_at })
        : await createSessionLog({ session_id: occurrence.session.id, occurrence_date: occurrence.occurrence_date, status, completed_at })
      setLogs((current) => {
        const index = current.findIndex((log) => log.session_id === saved.session_id && log.occurrence_date === saved.occurrence_date)
        if (index < 0) return [...current, saved]
        return current.map((log, i) => i === index ? saved : log)
      })
    } catch (cause) {
      setOccurrenceErrors((current) => ({ ...current, [key]: cause instanceof Error ? cause.message : 'Could not update this occurrence.' }))
    } finally {
      inFlightOccurrences.current.delete(key)
      setSavingOccurrenceKey(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true); setDeleteError(null)
    try {
      await deleteStudySession(deleteTarget.id)
      setSessions((current) => current.filter((item) => item.id !== deleteTarget.id))
      setLogs((current) => current.filter((log) => log.session_id !== deleteTarget.id))
      setNotice('Session deleted.')
      setDeleteTarget(null)
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the session.')
    } finally { setDeleting(false) }
  }

  const periodHeading = view === 'day'
    ? formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : `${formatDate(period.start, { month: 'short', day: 'numeric' })} – ${formatDate(period.end, { month: 'short', day: 'numeric', year: 'numeric' })}`
  const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const movePeriod = (amount: number) => setSelectedDate((date) => shiftDate(date, amount * (view === 'week' ? 7 : 1)))

  return <div className="mx-auto w-full min-w-0 max-w-[1100px]">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <PageHeading eyebrow="SemesterOS / Workspace" title="Study Planner" description="Bring your college timetable and personal study sessions together in one place." />
      <button type="button" onClick={() => { setNotice(null); setModalSession(null) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"><Plus size={16} />Add Session</button>
    </div>

    {notice && <p role="status" className="mb-3 text-sm text-emerald-300">{notice}</p>}

    <SectionCard title="Timetable" className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 p-1" aria-label="Timetable view">
          <button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'week' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Week</button>
          <button type="button" aria-pressed={view === 'day'} onClick={() => setView('day')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === 'day' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Day</button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => movePeriod(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous day'} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setSelectedDate(formatLocalDate(new Date()))} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">Today</button>
          <button type="button" onClick={() => movePeriod(1)} aria-label={view === 'week' ? 'Next week' : 'Next day'} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 text-slate-100" aria-live="polite">
        <CalendarDays size={17} className="text-blue-300" />
        <h3 className="text-sm font-semibold">{periodHeading}</h3>
      </div>

      {view === 'week' && <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Week dates, Monday through Sunday">
        {datesInWeek.map((date, index) => {
          const today = date === formatLocalDate(new Date())
          const selected = date === selectedDate
          return <button key={date} type="button" aria-pressed={selected} onClick={() => { setSelectedDate(date); setView('day') }} className={`rounded-lg border px-2 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${selected ? 'border-blue-400/50 bg-blue-400/[0.12]' : 'border-white/[0.07] bg-white/[0.02]'} ${today ? 'text-blue-200' : 'text-slate-300'}`}>
            <span className="block text-[10px] text-slate-500">{weekDayLabels[index]}{today ? ' · Today' : ''}</span>
            <span className="mt-1 block text-sm font-medium">{formatDate(date, { day: 'numeric' })}</span>
          </button>
        })}
      </div>}

      {loadState === 'loading' && <div role="status" aria-live="polite" className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-slate-400">Loading your sessions…</div>}
      {loadState === 'error' && <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] p-5 text-center">
        <p role="alert" className="text-sm text-rose-300">{error}</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.05]"><RefreshCw size={14} />Try again</button>
      </div>}
      {loadState === 'ready' && view === 'week' && <StudyPlannerWeekView dates={datesInWeek} occurrences={occurrences} savingOccurrenceKey={savingOccurrenceKey} occurrenceErrors={occurrenceErrors} onStatusChange={changeOccurrenceStatus} onEdit={(session) => { setNotice(null); setModalSession(session) }} onDelete={(session) => { setNotice(null); setDeleteError(null); setDeleteTarget(session) }} />}
      {loadState === 'ready' && view === 'day' && <StudyPlannerDayView selectedDate={selectedDate} occurrences={occurrences} savingOccurrenceKey={savingOccurrenceKey} occurrenceErrors={occurrenceErrors} onStatusChange={changeOccurrenceStatus} onEdit={(session) => { setNotice(null); setModalSession(session) }} onDelete={(session) => { setNotice(null); setDeleteError(null); setDeleteTarget(session) }} />}
    </SectionCard>
    {modalSession !== undefined && <StudySessionFormModal subjects={subjects} sessions={sessions} selectedDate={selectedDate} session={modalSession ?? undefined} saving={saving} onClose={() => { if (!saving) setModalSession(undefined) }} onSubmit={saveSession} />}
    {deleteTarget && <DeleteStudySessionDialog session={deleteTarget} saving={deleting} error={deleteError} onCancel={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(null) } }} onConfirm={() => void confirmDelete()} />}
  </div>
}
