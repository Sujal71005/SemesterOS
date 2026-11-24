import { useCallback, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { Subject } from '../../types/academics'
import type { CreateStudySessionInput, StudySessionWithSubject, UpdateStudySessionInput } from '../../types/studyPlanner'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { parseLocalDate } from '../../utils/studyPlannerDates'
import { validateSessionCategory, validateSessionDescription, validateSessionFields, validateSessionTitle } from '../../utils/studyPlannerValidation'
import OverlapWarning from './OverlapWarning'

type Props = { subjects: Subject[]; sessions: StudySessionWithSubject[]; selectedDate: string; session?: StudySessionWithSubject; saving: boolean; onClose: () => void; onSubmit: (input: CreateStudySessionInput | UpdateStudySessionInput) => Promise<void> }
type Field = 'title' | 'description' | 'schedule' | 'time' | 'subject'
const inputClass = 'mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/50'
const weekdays = [{ label: 'Monday', value: 1 }, { label: 'Tuesday', value: 2 }, { label: 'Wednesday', value: 3 }, { label: 'Thursday', value: 4 }, { label: 'Friday', value: 5 }, { label: 'Saturday', value: 6 }, { label: 'Sunday', value: 0 }]

export default function StudySessionFormModal({ subjects, sessions, selectedDate, session, saving, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState(session?.title ?? '')
  const [description, setDescription] = useState(session?.description ?? '')
  const [category, setCategory] = useState(session?.session_category ?? 'lecture')
  const [scheduleType, setScheduleType] = useState<'recurring' | 'one_time'>(session?.schedule_type ?? 'recurring')
  const [subjectId, setSubjectId] = useState(session?.subject_id ?? '')
  const [dayOfWeek, setDayOfWeek] = useState(session?.day_of_week ?? 1)
  const [sessionDate, setSessionDate] = useState(session?.session_date ?? selectedDate)
  const [startTime, setStartTime] = useState(session?.start_time.slice(0, 5) ?? '09:00')
  const [endTime, setEndTime] = useState(session?.end_time.slice(0, 5) ?? '10:00')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const closeIfSafe = useCallback(() => { if (!saving) onClose() }, [onClose, saving])
  const dialogRef = useDialogFocus<HTMLElement>(closeIfSafe)

  const input = useMemo<CreateStudySessionInput | null>(() => {
    try {
      const common = { title: validateSessionTitle(title), description: validateSessionDescription(description), session_category: category, subject_id: subjectId || null, start_time: startTime, end_time: endTime }
      if (scheduleType === 'recurring') {
        const value: CreateStudySessionInput = { ...common, schedule_type: 'recurring', day_of_week: dayOfWeek, session_date: null }
        validateSessionFields(value); return value
      }
      parseLocalDate(sessionDate)
      const value: CreateStudySessionInput = { ...common, schedule_type: 'one_time', day_of_week: null, session_date: sessionDate }
      validateSessionFields(value); return value
    } catch { return null }
  }, [category, dayOfWeek, description, endTime, scheduleType, sessionDate, startTime, subjectId, title])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const nextErrors: Partial<Record<Field, string>> = {}
    try { validateSessionTitle(title) } catch (error) { nextErrors.title = error instanceof Error ? error.message : 'Enter a valid title.' }
    try { validateSessionDescription(description) } catch (error) { nextErrors.description = error instanceof Error ? error.message : 'Enter a valid description.' }
    if (subjectId && !subjects.some((item) => item.id === subjectId)) nextErrors.subject = 'Choose a valid subject or laboratory.'
    if (!input) {
      try {
        const common = { title, description, session_category: category, subject_id: subjectId || null, start_time: startTime, end_time: endTime }
        validateSessionCategory(category)
        if (scheduleType === 'recurring') validateSessionFields({ ...common, schedule_type: scheduleType, day_of_week: dayOfWeek, session_date: null })
        else { parseLocalDate(sessionDate); validateSessionFields({ ...common, schedule_type: scheduleType, day_of_week: null, session_date: sessionDate }) }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Check the schedule and times.'
        if (/time|overnight/i.test(message)) nextErrors.time = message
        else nextErrors.schedule = message
      }
    }
    setErrors(nextErrors); setSubmitError(null)
    if (Object.keys(nextErrors).length || !input) return
    try { await onSubmit(input) }
    catch (error) { setSubmitError(error instanceof Error ? error.message : 'Could not save the session.') }
  }
  const errorId = (field: Field) => errors[field] ? `study-session-${field}-error` : undefined
  const errorText = (field: Field) => errors[field] && <span id={`study-session-${field}-error`} className="mt-1 block text-xs text-rose-300">{errors[field]}</span>

  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="study-session-form-title" className="my-auto max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-[#101827] p-5 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3"><div><h2 id="study-session-form-title" className="text-lg font-semibold text-slate-100">{session ? 'Edit Session' : 'Add Session'}</h2><p className="mt-1 text-sm text-slate-400">Set a local time for a weekly class or personal study session.</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"><X size={18} /></button></div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <label htmlFor="study-session-title" className="block text-sm text-slate-300">Session title<span className="ml-1 text-rose-300">*</span><input id="study-session-title" autoFocus maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={Boolean(errors.title)} aria-describedby={errorId('title')} className={`${inputClass} ${errors.title ? 'border-rose-400/50' : ''}`} />{errorText('title')}</label>
        <label htmlFor="study-session-description" className="block text-sm text-slate-300">Description <span className="text-xs text-slate-500">(optional)</span><textarea id="study-session-description" rows={3} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby={errorId('description')} className={`${inputClass} resize-y ${errors.description ? 'border-rose-400/50' : ''}`} />{errorText('description')}</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label htmlFor="study-session-category" className="block text-sm text-slate-300">Category<select id="study-session-category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className={inputClass}><option value="lecture">Lecture</option><option value="practical">Practical</option><option value="self_study">Self-study</option><option value="revision">Revision</option><option value="other">Other</option></select></label>
          <label htmlFor="study-session-subject" className="block text-sm text-slate-300">Subject or laboratory <span className="text-xs text-slate-500">(optional)</span><select id="study-session-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} aria-invalid={Boolean(errors.subject)} aria-describedby={errorId('subject')} className={`${inputClass} ${errors.subject ? 'border-rose-400/50' : ''}`}><option value="">Personal session / no subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.kind === 'lab' ? 'Laboratory' : 'Subject'}</option>)}</select>{errorText('subject')}</label>
        </div>
        <fieldset className="rounded-lg border border-white/[0.07] p-3"><legend className="px-1 text-sm text-slate-300">Schedule</legend>
          <div className="mb-3 flex flex-wrap gap-4"><label className="inline-flex items-center gap-2 text-sm text-slate-300"><input type="radio" name="study-session-schedule" checked={scheduleType === 'recurring'} onChange={() => setScheduleType('recurring')} />Weekly recurring</label><label className="inline-flex items-center gap-2 text-sm text-slate-300"><input type="radio" name="study-session-schedule" checked={scheduleType === 'one_time'} onChange={() => setScheduleType('one_time')} />One-time</label></div>
          {scheduleType === 'recurring' ? <label htmlFor="study-session-weekday" className="block text-sm text-slate-300">Weekday<select id="study-session-weekday" value={dayOfWeek} onChange={(event) => setDayOfWeek(Number(event.target.value))} className={inputClass}>{weekdays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label> : <label htmlFor="study-session-date" className="block text-sm text-slate-300">Session date<input id="study-session-date" type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className={inputClass} /></label>}
          {errors.schedule && <p role="alert" className="mt-2 text-xs text-rose-300">{errors.schedule}</p>}
        </fieldset>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label htmlFor="study-session-start" className="block text-sm text-slate-300">Start time<input id="study-session-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} aria-invalid={Boolean(errors.time)} aria-describedby={errorId('time')} className={`${inputClass} ${errors.time ? 'border-rose-400/50' : ''}`} /></label><label htmlFor="study-session-end" className="block text-sm text-slate-300">End time<input id="study-session-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} aria-invalid={Boolean(errors.time)} aria-describedby={errorId('time')} className={`${inputClass} ${errors.time ? 'border-rose-400/50' : ''}`} /></label>{errors.time && <p id="study-session-time-error" role="alert" className="text-xs text-rose-300 sm:col-span-2">{errors.time}</p>}<p className="text-xs text-slate-500 sm:col-span-2">Times use your local wall clock. Overnight sessions are not supported.</p></div>
        {input && <OverlapWarning proposed={input} existingSessions={sessions} selectedDate={selectedDate} excludeSessionId={session?.id} />}
        {submitError && <p role="alert" className="break-words text-sm text-rose-300">{submitError}</p>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] disabled:opacity-50">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : session ? 'Save Changes' : 'Create Session'}</button></div>
      </form>
    </section>
  </div>
}
