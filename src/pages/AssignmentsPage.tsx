import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, CalendarClock, CheckCircle2, Clock3, FlaskConical, ListTodo, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import SectionCard from '../components/common/SectionCard'
import type { AssignmentStatus, AssignmentWithSubject, CreateAssignmentInput, UpdateAssignmentInput } from '../types/assignments'
import { createAssignment, deleteAssignment, listAssignments, updateAssignment } from '../services/assignments'
import { listSubjects } from '../services/academics'
import type { Subject } from '../types/academics'
import { isOverdue } from '../utils/assignmentDates'
import AssignmentFormModal from '../components/assignments/AssignmentFormModal'
import AssignmentStatusSelect from '../components/assignments/AssignmentStatusSelect'
import { filterAssignments, groupDeadlineAssignments } from '../utils/assignmentFiltering'
import { formatAssignmentStatus } from '../utils/assignmentDates'
import { persistAssignmentStatus } from '../utils/assignmentStatusUpdate'
import DeleteAssignmentDialog from '../components/assignments/DeleteAssignmentDialog'

const summaryItems = [
  { key: 'total', label: 'Total assignments', icon: ListTodo, tone: 'blue' },
  { key: 'todo', label: 'To Do', icon: CalendarClock, tone: 'amber' },
  { key: 'in_progress', label: 'In Progress', icon: Clock3, tone: 'violet' },
  { key: 'submitted', label: 'Submitted', icon: CheckCircle2, tone: 'green' },
  { key: 'done', label: 'Completed', icon: CheckCircle2, tone: 'blue' },
] as const

function formatDeadline(value: string | null): string {
  if (!value) return 'No deadline'
  const date = new Date(value)
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentWithSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  const [modalAssignment, setModalAssignment] = useState<AssignmentWithSubject | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null)
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<AssignmentWithSubject | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | ''>('')
  const [now, setNow] = useState(() => new Date())

  const loadAssignments = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listAssignments()
      if (!signal?.aborted) setAssignments(result)
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : 'Could not load assignments.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadAssignments(controller.signal)
    return () => controller.abort()
  }, [loadAssignments])

  useEffect(() => {
    let active = true
    void listSubjects().then((rows) => { if (active) { setSubjects(rows); setSubjectsError(null) } })
      .catch((cause) => { if (active) setSubjectsError(cause instanceof Error ? cause.message : 'Could not load subjects.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const saveAssignment = async (input: CreateAssignmentInput | UpdateAssignmentInput) => {
    if (saving) return
    setSaving(true); setSaveError(null)
    try {
      if (modalAssignment) await updateAssignment(modalAssignment.id, input as UpdateAssignmentInput)
      else await createAssignment(input as CreateAssignmentInput)
      setModalAssignment(undefined)
      setNotice(modalAssignment ? 'Assignment updated.' : 'Assignment created.')
      await loadAssignments()
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not save assignment.')
    } finally { setSaving(false) }
  }

  const changeStatus = async (assignment: AssignmentWithSubject, status: AssignmentStatus) => {
    if (statusSavingId) return
    setStatusSavingId(assignment.id); setActionError(null); setNotice(null)
    try {
      const saved = await persistAssignmentStatus(assignment.status, status,
        async (next) => { await updateAssignment(assignment.id, { status: next }) },
        (next) => setAssignments((current) => current.map((item) => item.id === assignment.id ? { ...item, status: next } : item)),
      )
      if (saved) setNotice('Assignment status updated.')
      else setActionError('Could not update assignment status. The previous status was kept.')
    } finally { setStatusSavingId(null) }
  }

  const confirmDelete = async () => {
    if (!deleteAssignmentTarget || deleteSaving) return
    setDeleteSaving(true); setActionError(null)
    try {
      await deleteAssignment(deleteAssignmentTarget.id)
      setAssignments((current) => current.filter((item) => item.id !== deleteAssignmentTarget.id))
      setDeleteAssignmentTarget(null)
      setNotice('Assignment deleted.')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not delete assignment.')
    } finally { setDeleteSaving(false) }
  }

  const counts = useMemo(() => ({
    total: assignments.length,
    todo: assignments.filter((item) => item.status === 'todo').length,
    in_progress: assignments.filter((item) => item.status === 'in_progress').length,
    submitted: assignments.filter((item) => item.status === 'submitted').length,
    done: assignments.filter((item) => item.status === 'done').length,
  }), [assignments])

  const filteredAssignments = useMemo(() => filterAssignments(assignments, { search, subjectId: subjectFilter, status: statusFilter }), [assignments, search, subjectFilter, statusFilter])
  const deadlineGroups = useMemo(() => groupDeadlineAssignments(filteredAssignments, now), [filteredAssignments, now])
  const filtersActive = Boolean(search.trim() || subjectFilter || statusFilter)

  const renderDeadlineSummary = (rows: AssignmentWithSubject[], title: string, tone: string) => <section className="panel mb-4 p-4" aria-label={title}>
    <div className="mb-3 flex items-center justify-between"><h2 className={`text-sm font-semibold ${tone}`}>{title}</h2><span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">{rows.length}</span></div>
    {rows.length ? <ul className="space-y-2">{rows.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-2 text-xs"><span className="min-w-0 flex-1 truncate text-slate-200">{item.title}<span className="ml-2 text-slate-500">· {item.subject.name}</span></span><time className="shrink-0 text-slate-400">{formatDeadline(item.due_at)}</time></li>)}</ul> : <p className="text-xs text-slate-500">None</p>}
  </section>

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-start justify-between gap-3"><PageHeading eyebrow="SemesterOS / Workspace" title="Assignments" description="Manage your academic tasks and deadlines." /><button type="button" onClick={() => { setSaveError(subjectsError); setNotice(null); setModalAssignment(null) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400"><Plus size={16}/>Add Assignment</button></div>
      {notice && <p role="status" className="mb-3 text-sm text-emerald-300">{notice}</p>}
      {actionError && !deleteAssignmentTarget && <p role="alert" className="mb-3 text-sm text-rose-300">{actionError}</p>}

      <section aria-label="Assignment summary" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {summaryItems.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className="panel flex min-h-28 flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-400">{label}</span><span className={`icon-tile tone-${tone}`}><Icon size={16} /></span></div>
            <p className="text-2xl font-semibold tabular-nums text-white">{loading ? '—' : counts[key]}</p>
          </div>
        ))}
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 md:grid-cols-[minmax(220px,1fr)_minmax(170px,220px)_minmax(150px,190px)_auto] md:items-end">
        <label className="block text-xs font-medium text-slate-400">Search title<div className="relative mt-1.5"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assignments" className="w-full rounded-lg border border-white/10 bg-slate-900 py-2 pl-9 pr-9 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-blue-400/40"/>{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-white"><X size={14}/></button>}</div></label>
        <label className="block text-xs font-medium text-slate-400">Subject or laboratory<select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-400/40"><option value="">All Subjects</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · {subject.kind === 'lab' ? 'Laboratory' : 'Subject'}</option>)}</select></label>
        <label className="block text-xs font-medium text-slate-400">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AssignmentStatus | '')} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-400/40"><option value="">All Statuses</option>{(['todo', 'in_progress', 'submitted', 'done'] as AssignmentStatus[]).map((status) => <option key={status} value={status}>{formatAssignmentStatus(status)}</option>)}</select></label>
        <button type="button" disabled={!filtersActive} onClick={() => { setSearch(''); setSubjectFilter(''); setStatusFilter('') }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.05] disabled:cursor-default disabled:opacity-40">Clear Filters</button>
      </div>
      {!loading && !error && assignments.length > 0 && <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">{renderDeadlineSummary(deadlineGroups.overdue, 'Overdue', 'text-rose-300')}{renderDeadlineSummary(deadlineGroups.upcoming, 'Upcoming', 'text-blue-300')}</div>}

      <SectionCard title={`All Assignments · ${loading ? '…' : filteredAssignments.length}`}>
        {loading ? (
          <div role="status" aria-live="polite" className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.025]" />)}
            <span className="sr-only">Loading assignments…</span>
          </div>
        ) : error ? (
          <div role="alert" className="flex min-h-40 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-rose-200">Assignments could not be loaded</p>
            <p className="mt-2 max-w-lg text-sm text-slate-400">{error}</p>
            <button type="button" onClick={() => void loadAssignments()} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.06]"><RefreshCw size={14} />Retry</button>
          </div>
        ) : assignments.length === 0 ? (
          <div className="grid min-h-40 place-items-center text-center">
            <div><p className="text-sm font-medium text-slate-200">No assignments yet</p><p className="mt-2 text-sm text-slate-500">Your assignments will appear here when they are added.</p></div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="grid min-h-40 place-items-center text-center"><div><p className="text-sm font-medium text-slate-200">No matching assignments</p><p className="mt-2 text-sm text-slate-500">Try changing your search or filters.</p></div></div>
        ) : (
          <div className="space-y-2">
            {filteredAssignments.map((assignment) => {
              const overdue = isOverdue(assignment)
              const SubjectIcon = assignment.subject.kind === 'lab' ? FlaskConical : BookOpen
              return (
                <article key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 sm:flex-row sm:items-center">
                  <span className={`icon-tile ${assignment.subject.kind === 'lab' ? 'tone-violet' : 'tone-blue'} shrink-0`}><SubjectIcon size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-medium text-slate-100">{assignment.title}</h3>
                    <p className="mt-1 truncate text-xs text-slate-400">{assignment.subject.name}<span className="ml-2 text-slate-600">· {assignment.subject.kind === 'lab' ? 'Laboratory' : 'Subject'}</span></p>
                    <p className={`mt-2 inline-flex items-center gap-1.5 text-xs ${overdue ? 'text-rose-300' : 'text-slate-500'}`}><CalendarClock size={13} />{formatDeadline(assignment.due_at)}{overdue && <span className="ml-1 rounded-full border border-rose-400/20 bg-rose-400/[0.08] px-2 py-0.5 text-[10px] font-medium">Overdue</span>}</p>
                  </div>
                  <div className="flex flex-wrap shrink-0 items-center gap-2">
                    <AssignmentStatusSelect status={assignment.status} disabled={statusSavingId !== null} onChange={(status) => void changeStatus(assignment, status)} />
                    {statusSavingId === assignment.id && <span role="status" className="text-[10px] text-slate-400">Saving…</span>}
                    <button type="button" onClick={() => { setSaveError(null); setNotice(null); setModalAssignment(assignment) }} className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-blue-400/30 hover:text-blue-200">Edit</button>
                    <button type="button" aria-label={`Delete ${assignment.title}`} onClick={() => { setActionError(null); setDeleteAssignmentTarget(assignment) }} className="rounded-md border border-rose-400/15 p-1.5 text-rose-300 hover:border-rose-400/35 hover:bg-rose-400/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60" title="Delete assignment"><Trash2 size={14}/></button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </SectionCard>
      {modalAssignment !== undefined && <AssignmentFormModal subjects={subjects} assignment={modalAssignment ?? undefined} saving={saving} error={saveError ?? subjectsError} onClose={() => { if (!saving) { setModalAssignment(undefined); setSaveError(null) } }} onSubmit={saveAssignment} />}
      {deleteAssignmentTarget && <DeleteAssignmentDialog assignment={deleteAssignmentTarget} saving={deleteSaving} error={actionError} onCancel={() => { setDeleteAssignmentTarget(null); setActionError(null) }} onConfirm={() => void confirmDelete()} />}
    </div>
  )
}
