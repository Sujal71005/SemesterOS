import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import PageHeading from '../components/common/PageHeading'
import SectionCard from '../components/common/SectionCard'
import DailyGoalFormModal from '../components/dailyGoals/DailyGoalFormModal'
import DeleteDailyGoalDialog from '../components/dailyGoals/DeleteDailyGoalDialog'
import DailyGoalList from '../components/dailyGoals/DailyGoalList'
import DailyGoalStats from '../components/dailyGoals/DailyGoalStats'
import WeeklyGoalProgress from '../components/dailyGoals/WeeklyGoalProgress'
import { completeDailyGoal, createDailyGoal, deleteDailyGoal, listDailyGoalsByDateRange, reopenDailyGoal, updateDailyGoal } from '../services/dailyGoals'
import type { CreateDailyGoalInput, DailyGoal, UpdateDailyGoalInput } from '../types/dailyGoals'
import { createLatestRequestGate } from '../utils/latestRequest'
import { addCalendarDays, formatDailyGoalDate, getPreviousDay, getTodayLocalDate, getNextDay, getWeekEnd, getWeekStart } from '../utils/dailyGoalDates'

export default function DailyGoalsPage() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayLocalDate())
  const [weekGoals, setWeekGoals] = useState<DailyGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [modalGoal, setModalGoal] = useState<DailyGoal | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyGoalIds, setBusyGoalIds] = useState<Set<string>>(() => new Set())
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<DailyGoal | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const requests = useRef(createLatestRequestGate())
  const inFlightGoals = useRef(new Set<string>())

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate])
  const weekEnd = useMemo(() => getWeekEnd(selectedDate), [selectedDate])
  const selectedWeekRef = useRef({ start: weekStart, end: weekEnd })
  selectedWeekRef.current = { start: weekStart, end: weekEnd }
  const selectedGoals = useMemo(
    () => weekGoals.filter((goal) => goal.goal_date === selectedDate),
    [selectedDate, weekGoals],
  )
  const dateLabel = useMemo(() => formatDailyGoalDate(selectedDate), [selectedDate])
  const today = getTodayLocalDate()

  const beginGoalAction = (id: string): boolean => {
    if (inFlightGoals.current.has(id)) return false
    inFlightGoals.current.add(id)
    setBusyGoalIds((current) => new Set(current).add(id))
    return true
  }

  const finishGoalAction = (id: string) => {
    inFlightGoals.current.delete(id)
    setBusyGoalIds((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  const refreshAfterMutation = (message: string) => {
    requests.current.invalidate()
    setLoading(true)
    setError(null)
    setNotice(message)
    setRetry((value) => value + 1)
  }

  const saveGoal = async (input: CreateDailyGoalInput | UpdateDailyGoalInput) => {
    if (saving) return
    setSaving(true)
    setFormError(null)
    setNotice(null)
    try {
      if (modalGoal) {
        await updateDailyGoal(modalGoal.id, input as UpdateDailyGoalInput)
      } else {
        await createDailyGoal(input as CreateDailyGoalInput)
      }
      setModalGoal(undefined)
      refreshAfterMutation(modalGoal ? 'Goal updated.' : 'Goal created.')
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save this goal.')
    } finally {
      setSaving(false)
    }
  }

  const changeGoalStatus = async (goal: DailyGoal, action: 'complete' | 'reopen') => {
    if (!beginGoalAction(goal.id)) return
    setNotice(null)
    setActionErrors((current) => { const next = { ...current }; delete next[goal.id]; return next })
    try {
      const saved = action === 'complete' ? await completeDailyGoal(goal.id) : await reopenDailyGoal(goal.id)
      const goalWeekStart = getWeekStart(goal.goal_date)
      const goalWeekEnd = getWeekEnd(goal.goal_date)
      if (selectedWeekRef.current.start === goalWeekStart && selectedWeekRef.current.end === goalWeekEnd) {
        setWeekGoals((current) => current.map((item) => item.id === saved.id ? saved : item))
      }
      refreshAfterMutation(action === 'complete' ? 'Goal completed.' : 'Goal reopened.')
    } catch (cause) {
      setActionErrors((current) => ({ ...current, [goal.id]: cause instanceof Error ? cause.message : 'Could not update this goal.' }))
    } finally {
      finishGoalAction(goal.id)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting || !beginGoalAction(deleteTarget.id)) return
    setDeleting(true)
    setDeleteError(null)
    setNotice(null)
    try {
      await deleteDailyGoal(deleteTarget.id)
      const deletedId = deleteTarget.id
      const goalWeekStart = getWeekStart(deleteTarget.goal_date)
      const goalWeekEnd = getWeekEnd(deleteTarget.goal_date)
      if (selectedWeekRef.current.start === goalWeekStart && selectedWeekRef.current.end === goalWeekEnd) {
        setWeekGoals((current) => current.filter((item) => item.id !== deletedId))
      }
      setDeleteTarget(null)
      setActionErrors((current) => { const next = { ...current }; delete next[deletedId]; return next })
      refreshAfterMutation('Goal deleted.')
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Could not delete this goal.')
    } finally {
      setDeleting(false)
      if (deleteTarget) finishGoalAction(deleteTarget.id)
    }
  }

  useEffect(() => {
    const requestId = requests.current.begin()
    setLoading(true)
    setError(null)

    void listDailyGoalsByDateRange(weekStart, weekEnd).then((goals) => {
      if (requests.current.isCurrent(requestId)) setWeekGoals(goals)
    }).catch((cause: unknown) => {
      if (requests.current.isCurrent(requestId)) {
        setError(cause instanceof Error ? cause.message : 'Could not load Daily Goals.')
      }
    }).finally(() => {
      if (requests.current.isCurrent(requestId)) setLoading(false)
    })

    return () => requests.current.invalidate()
  }, [retry, selectedDate, weekEnd, weekStart])

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1100px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading eyebrow="SemesterOS / Workspace" title="Daily Goals" description="Plan and follow through on the goals you set for each day." />
        <button type="button" onClick={() => { setNotice(null); setFormError(null); setModalGoal(null) }} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70">
          <Plus size={16} aria-hidden="true" />Add Goal
        </button>
      </div>

      {notice && <p role="status" className="mb-3 text-sm text-emerald-300">{notice}</p>}

      <SectionCard title="Selected date" className="mb-4 min-w-0">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-slate-100" aria-live="polite">
            <CalendarDays size={18} className="shrink-0 text-blue-300" aria-hidden="true" />
            <h2 className="break-words text-sm font-semibold">{dateLabel}</h2>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
            <button type="button" onClick={() => setSelectedDate((date) => getPreviousDay(date))} aria-label="Previous day" className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setSelectedDate(today)} disabled={selectedDate === today} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:cursor-default disabled:opacity-50">
              Today
            </button>
            <button type="button" onClick={() => setSelectedDate((date) => getNextDay(date))} aria-label="Next day" className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </SectionCard>

      {!loading && !error && <DailyGoalStats goals={selectedGoals} />}
      {!loading && !error && <WeeklyGoalProgress
        goals={weekGoals}
        weekDate={selectedDate}
        todayDate={today}
        onWeekChange={(offset) => setSelectedDate((date) => addCalendarDays(date, offset * 7))}
      />}

      <SectionCard title={`Goals for ${dateLabel}`} className="min-w-0">
        {loading ? (
          <div role="status" aria-live="polite" className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.025]" />)}
            <span className="sr-only">Loading Daily Goals…</span>
          </div>
        ) : error ? (
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-rose-200">Daily Goals could not be loaded</p>
            <p role="alert" className="mt-2 max-w-lg text-sm text-slate-400">{error}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60">
              <RefreshCw size={14} aria-hidden="true" />Retry
            </button>
          </div>
        ) : selectedGoals.length === 0 ? (
          <div className="grid min-h-40 place-items-center text-center">
            <div>
              <p className="text-sm font-medium text-slate-200">No goals for this day</p>
              <p className="mt-2 text-sm text-slate-500">Goals assigned to {dateLabel} will appear here.</p>
            </div>
          </div>
        ) : (
          <DailyGoalList
            goals={selectedGoals}
            busyGoalIds={busyGoalIds}
            actionErrors={actionErrors}
            onEdit={(goal) => { setNotice(null); setFormError(null); setModalGoal(goal) }}
            onComplete={(goal) => void changeGoalStatus(goal, 'complete')}
            onReopen={(goal) => void changeGoalStatus(goal, 'reopen')}
            onDelete={(goal) => { setNotice(null); setDeleteError(null); setDeleteTarget(goal) }}
          />
        )}
      </SectionCard>

      {modalGoal !== undefined && <DailyGoalFormModal
        goal={modalGoal ?? undefined}
        saving={saving}
        error={formError}
        onClose={() => { if (!saving) { setModalGoal(undefined); setFormError(null) } }}
        onSubmit={saveGoal}
      />}
      {deleteTarget && <DeleteDailyGoalDialog
        goal={deleteTarget}
        saving={deleting}
        error={deleteError}
        onCancel={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(null) } }}
        onConfirm={() => void confirmDelete()}
      />}
    </div>
  )
}
