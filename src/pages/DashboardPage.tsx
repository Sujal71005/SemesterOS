import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Brain, Check, Clock3, Code2, Target, ClipboardList, CalendarClock, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PageHeading from '../components/common/PageHeading'
import SectionCard from '../components/common/SectionCard'
import SampleBadge from '../components/dashboard/SampleBadge'
import StatCard from '../components/dashboard/StatCard'
import type { StudyDay } from '../types/dashboard'
import { listSyllabusAnalytics } from '../services/academics'
import { calculateSyllabusProgress } from '../utils/syllabusProgress'
import ProgressBar from '../components/academics/ProgressBar'
import { listAssignments } from '../services/assignments'
import type { AssignmentWithSubject } from '../types/assignments'
import { formatAssignmentStatus, isOverdue, isUpcoming } from '../utils/assignmentDates'
import { createLatestRequestGate } from '../utils/latestRequest'
import { listSessionLogs, listStudySessions } from '../services/studyPlanner'
import type { StudySessionLog, StudySessionWithSubject } from '../types/studyPlanner'
import { calculateSessionOccurrences, formatLocalDate, parseLocalDate } from '../utils/studyPlannerDates'
import { sessionCategoryStyles } from '../components/studyPlanner/StudyPlannerWeekView'
import DailyGoalsDashboardSection from '../components/dashboard/DailyGoalsDashboardSection'
import { listDailyGoalsByDate } from '../services/dailyGoals'
import type { DailyGoal } from '../types/dailyGoals'
import { calculateDailyGoalProgress } from '../utils/dailyGoalProgress'
import { getTodayLocalDate } from '../utils/dailyGoalDates'

const studyData: StudyDay[] = [
  { day: 'Mon', hours: 2.5 }, { day: 'Tue', hours: 3.8 }, { day: 'Wed', hours: 2.9 },
  { day: 'Thu', hours: 4.4 }, { day: 'Fri', hours: 3.2 }, { day: 'Sat', hours: 5.1 }, { day: 'Sun', hours: 2.1 },
]
const stats = [
  { label: 'Study hours', value: '24.0h', detail: 'This week · sample', icon: Clock3, tone: 'violet' as const },
  { label: 'DSA progress', value: '38 / 150', detail: 'Problems solved · sample', icon: Code2, tone: 'green' as const },
  { label: 'Semester progress', value: '62%', detail: 'Semester VI · sample', icon: BookOpen, tone: 'amber' as const },
]

function clockMinutes(value: string): number { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute }
function formatSessionTime(value: string): string { const [hour, minute] = value.split(':').map(Number); return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, hour, minute)) }
function formatSessionDate(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(parseLocalDate(value)) }
function categoryDot(category: StudySessionWithSubject['session_category']): string {
  if (category === 'lecture') return 'dot-blue'
  if (category === 'practical') return 'dot-violet'
  if (category === 'self_study') return 'dot-green'
  if (category === 'revision') return 'bg-amber-300 text-amber-300'
  return 'dot-blue'
}

export default function DashboardPage() {
  const [syllabusSummary, setSyllabusSummary] = useState<{ total: number; completed: number; percentage: number } | null>(null)
  const [syllabusError, setSyllabusError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<AssignmentWithSubject[]>([])
  const [assignmentLoading, setAssignmentLoading] = useState(true)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [plannerSessions, setPlannerSessions] = useState<StudySessionWithSubject[]>([])
  const [plannerLogs, setPlannerLogs] = useState<StudySessionLog[]>([])
  const [plannerLoading, setPlannerLoading] = useState(true)
  const [plannerError, setPlannerError] = useState<string | null>(null)
  const [plannerRetry, setPlannerRetry] = useState(0)
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([])
  const [dailyGoalsLoading, setDailyGoalsLoading] = useState(true)
  const [dailyGoalsError, setDailyGoalsError] = useState<string | null>(null)
  const [dailyGoalsRetry, setDailyGoalsRetry] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const plannerRequest = useRef(createLatestRequestGate())
  const dailyGoalsRequest = useRef(createLatestRequestGate())
  useEffect(() => {
    let active = true
    const requests = createLatestRequestGate()
    let inFlight = false
    const load = async () => {
      if (!active || inFlight) return
      inFlight = true
      const requestId = requests.begin()
      setAssignmentLoading(true); setAssignmentError(null)
      try {
        const rows = await listAssignments()
        if (active && requests.isCurrent(requestId)) setAssignments(rows)
      } catch (cause) {
        if (active && requests.isCurrent(requestId)) setAssignmentError(cause instanceof Error ? cause.message : 'Could not load assignments.')
      } finally {
        inFlight = false
        if (active && requests.isCurrent(requestId)) setAssignmentLoading(false)
      }
    }
    void load()
    const refresh = () => { if (document.visibilityState === 'visible') void load() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { active = false; requests.invalidate(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  useEffect(() => {
    let active = true
    let inFlight = false
    const load = async () => {
      if (!active || inFlight) return
      inFlight = true
      const requestId = plannerRequest.current.begin()
      setPlannerLoading(true); setPlannerError(null)
      try {
        const [sessions, logs] = await Promise.all([listStudySessions(), listSessionLogs()])
        if (active && plannerRequest.current.isCurrent(requestId)) { setPlannerSessions(sessions); setPlannerLogs(logs) }
      } catch (cause) {
        if (active && plannerRequest.current.isCurrent(requestId)) setPlannerError(cause instanceof Error ? cause.message : 'Could not load Study Planner data.')
      } finally {
        inFlight = false
        if (active && plannerRequest.current.isCurrent(requestId)) setPlannerLoading(false)
      }
    }
    void load()
    const refresh = () => { if (document.visibilityState === 'visible') void load() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { active = false; plannerRequest.current.invalidate(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [plannerRetry])
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer) }, [])
  const dailyGoalDate = getTodayLocalDate(now)
  useEffect(() => {
    let active = true
    const load = async () => {
      const requestId = dailyGoalsRequest.current.begin()
      setDailyGoalsLoading(true)
      setDailyGoalsError(null)
      try {
        const goals = await listDailyGoalsByDate(dailyGoalDate)
        if (active && dailyGoalsRequest.current.isCurrent(requestId)) setDailyGoals(goals)
      } catch (cause) {
        if (active && dailyGoalsRequest.current.isCurrent(requestId)) {
          setDailyGoalsError(cause instanceof Error ? cause.message : "Could not load today's goals.")
        }
      } finally {
        if (active && dailyGoalsRequest.current.isCurrent(requestId)) setDailyGoalsLoading(false)
      }
    }
    const refresh = () => { if (document.visibilityState === 'visible') void load() }
    void load()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      dailyGoalsRequest.current.invalidate()
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [dailyGoalDate, dailyGoalsRetry])
  const assignmentStats = useMemo(() => ({
    total: assignments.length,
    todo: assignments.filter((item) => item.status === 'todo').length,
    inProgress: assignments.filter((item) => item.status === 'in_progress').length,
    submitted: assignments.filter((item) => item.status === 'submitted').length,
    done: assignments.filter((item) => item.status === 'done').length,
    overdue: assignments.filter((item) => isOverdue(item, now)).length,
  }), [assignments, now])
  const deadlineAssignments = useMemo(() => ({
    upcoming: assignments.filter((item) => isUpcoming(item, now)).sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!)).slice(0, 4),
    overdue: assignments.filter((item) => isOverdue(item, now)).sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!)).slice(0, 3),
  }), [assignments, now])
  const todayKey = formatLocalDate(now)
  const dailyGoalProgress = useMemo(() => calculateDailyGoalProgress(dailyGoals), [dailyGoals])
  const dashboardStats = [
    {
      label: 'Daily goals',
      value: dailyGoalsLoading || dailyGoalsError ? '—' : `${dailyGoalProgress.completed} / ${dailyGoalProgress.total}`,
      detail: dailyGoalsLoading ? "Loading today's goals" : dailyGoalsError ? 'Unable to load today' : `${dailyGoalProgress.pending} pending · ${dailyGoalProgress.percentage}% complete`,
      icon: Target,
      tone: 'blue' as const,
    },
    ...stats,
  ]
  const upcomingRangeEnd = useMemo(() => { const date = parseLocalDate(todayKey); date.setDate(date.getDate() + 7); return formatLocalDate(date) }, [todayKey])
  const logByOccurrence = useMemo(() => new Map(plannerLogs.map((log) => [`${log.session_id}:${log.occurrence_date}`, log])), [plannerLogs])
  const todayOccurrences = useMemo(() => calculateSessionOccurrences(plannerSessions, todayKey, todayKey).map((item) => ({ ...item, log: logByOccurrence.get(`${item.session.id}:${item.occurrence_date}`) })), [logByOccurrence, plannerSessions, todayKey])
  const upcomingOccurrences = useMemo(() => calculateSessionOccurrences(plannerSessions, todayKey, upcomingRangeEnd)
    .filter((item) => item.occurrence_date > todayKey || (item.occurrence_date === todayKey && clockMinutes(item.start_time) > now.getHours() * 60 + now.getMinutes()))
    .slice(0, 4).map((item) => ({ ...item, log: logByOccurrence.get(`${item.session.id}:${item.occurrence_date}`) })), [logByOccurrence, now, plannerSessions, todayKey, upcomingRangeEnd])
  const todayProgress = useMemo(() => {
    const completed = todayOccurrences.filter((item) => item.log?.status === 'completed').length
    const skipped = todayOccurrences.filter((item) => item.log?.status === 'skipped').length
    const pending = todayOccurrences.length - completed - skipped
    return { total: todayOccurrences.length, completed, pending, skipped, percentage: todayOccurrences.length ? Math.round(completed / todayOccurrences.length * 100) : 0 }
  }, [todayOccurrences])
  const formatDue = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'No deadline'
  useEffect(() => { void listSyllabusAnalytics().then((data) => {
    const progress = calculateSyllabusProgress(data.modules, data.topics, data.subjects)
    const total = progress.reduce((sum, item) => sum + item.total, 0)
    const completed = progress.reduce((sum, item) => sum + item.completed, 0)
    setSyllabusSummary({ total, completed, percentage: total ? Math.round(completed / total * 100) : 0 })
  }).catch((cause) => setSyllabusError(cause instanceof Error ? cause.message : 'Could not load syllabus progress.')) }, [])
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <PageHeading eyebrow="Friday, November 21, 2026" title="Good morning, Student" description="A clear view of your semester, one day at a time." />

      <div className="welcome-banner">
        <div className="relative z-10 max-w-xl">
          <div className="mb-3 flex items-center gap-2"><span className="welcome-icon"><Brain size={16} /></span><span className="text-xs font-medium text-blue-200">Your semester at a glance</span></div>
          <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Make today count.</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-300">Small, consistent steps add up. Pick a priority and get into your flow.</p>
          <a href="/daily-goals" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-300 hover:text-blue-200">View daily goals <ArrowRight size={14} /></a>
        </div>
        <div className="welcome-orbit" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-center"><BookOpen size={22} /></div><div className="orbit-star">✦</div></div>
        <div className="absolute right-4 top-4"><SampleBadge /></div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{dashboardStats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {([
          ['Total assignments', assignmentStats.total, ClipboardList, 'blue'], ['To Do', assignmentStats.todo, CalendarClock, 'amber'], ['In Progress', assignmentStats.inProgress, Clock3, 'violet'], ['Submitted', assignmentStats.submitted, Check, 'blue'], ['Completed', assignmentStats.done, Check, 'green'], ['Overdue', assignmentStats.overdue, CalendarClock, 'amber'],
        ] as const).map(([label, value, Icon, tone]) => <div key={label} className="panel flex items-center gap-3 p-3"><span className={`icon-tile tone-${tone}`}><Icon size={15}/></span><div className="min-w-0"><p className="truncate text-[10px] text-slate-500">{label}</p><p className="text-lg font-semibold tabular-nums text-slate-100">{assignmentLoading ? '—' : value}</p></div></div>)}
      </div>

      <SectionCard title="Syllabus progress" className="min-w-0" action={<a href="/academics" className="text-xs text-blue-300 hover:text-blue-200">Academics <ArrowRight size={13} className="inline"/></a>}>
        {syllabusSummary ? <><ProgressBar percentage={syllabusSummary.percentage} label="Semester topics"/><p className="mt-2 text-xs text-slate-500">{syllabusSummary.completed} completed · {Math.max(0, syllabusSummary.total - syllabusSummary.completed)} pending of {syllabusSummary.total} topics</p></> : syllabusError ? <p role="alert" className="text-sm text-rose-300">{syllabusError}</p> : <p className="text-sm text-slate-500">Loading syllabus progress…</p>}
      </SectionCard>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <SectionCard title="Today's schedule" className="h-full min-w-0" action={<a href="/timetable" className="text-xs text-blue-300 hover:text-blue-200">Timetable <ArrowRight size={13} className="inline" /></a>}>
          {plannerLoading ? <p role="status" className="text-sm text-slate-500">Loading today's sessions…</p> : plannerError ? <div><p role="alert" className="text-sm text-rose-300">{plannerError}</p><button type="button" onClick={() => setPlannerRetry((value) => value + 1)} className="mt-2 inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"><RefreshCw size={12} />Retry</button></div> : todayOccurrences.length ? <div className="space-y-1">{todayOccurrences.map((item) => {
            const category = sessionCategoryStyles[item.session.session_category]
            const subject = 'subject' in item.session ? item.session.subject : null
            const status = item.log?.status === 'completed' ? 'Completed' : item.log?.status === 'skipped' ? 'Skipped' : 'Pending'
            const statusTone = status === 'Completed' ? 'text-emerald-300' : status === 'Skipped' ? 'text-slate-400' : 'text-amber-200'
            return <div key={`${item.session.id}:${item.occurrence_date}`} className="schedule-row"><span className="w-[100px] shrink-0 text-[10px] tabular-nums text-slate-500 sm:text-[11px]">{formatSessionTime(item.start_time)}–{formatSessionTime(item.end_time)}</span><span className={`schedule-dot ${categoryDot(item.session.session_category)}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{item.session.title}</p><p className="mt-1 truncate text-[10px] text-slate-500 sm:text-xs">{subject ? `${subject.name} · ` : ''}{category.label}</p></div><span className={`shrink-0 text-[10px] ${statusTone}`}>{status}</span></div>
          })}</div> : <p className="text-sm text-slate-500">No sessions scheduled for today.</p>}
          {!plannerLoading && !plannerError && <div className="mt-4 border-t border-white/[0.06] pt-3"><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold text-slate-300">Study progress</h3><span className="text-xs font-semibold text-blue-200">{todayProgress.percentage}% complete</span></div><div className="grid grid-cols-4 gap-2 text-center"><div className="rounded-lg bg-white/[0.025] px-2 py-2"><p className="text-lg font-semibold tabular-nums text-slate-100">{todayProgress.total}</p><p className="text-[9px] text-slate-500">Scheduled</p></div><div className="rounded-lg bg-emerald-400/[0.04] px-2 py-2"><p className="text-lg font-semibold tabular-nums text-emerald-200">{todayProgress.completed}</p><p className="text-[9px] text-slate-500">Completed</p></div><div className="rounded-lg bg-amber-400/[0.04] px-2 py-2"><p className="text-lg font-semibold tabular-nums text-amber-200">{todayProgress.pending}</p><p className="text-[9px] text-slate-500">Pending</p></div><div className="rounded-lg bg-white/[0.025] px-2 py-2"><p className="text-lg font-semibold tabular-nums text-slate-300">{todayProgress.skipped}</p><p className="text-[9px] text-slate-500">Skipped</p></div></div></div>}
        </SectionCard>

        <DailyGoalsDashboardSection goals={dailyGoals} loading={dailyGoalsLoading} error={dailyGoalsError} onRetry={() => setDailyGoalsRetry((value) => value + 1)} />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <SectionCard title="Weekly study hours" className="h-full min-w-0" action={<><SampleBadge /><button className="period-select ml-1">This week <span>⌄</span></button></>}>
          <div className="mb-2 flex items-end justify-between"><div><span className="text-2xl font-semibold tracking-tight text-white">24.0</span><span className="ml-1.5 text-xs text-slate-500">hours</span></div><span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><ArrowUpRight size={13} /> 12% <span className="text-slate-500">vs last week</span></span></div>
          <div className="h-[195px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={studyData} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#619cff" stopOpacity={0.25}/><stop offset="95%" stopColor="#619cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#69758a', fontSize: 11 }} dy={9}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#69758a', fontSize: 10 }} ticks={[0,2,4,6]} tickFormatter={(value: number) => `${value}h`}/><Tooltip contentStyle={{ background: '#111a2a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, color: '#e2e8f0', fontSize: 12 }} formatter={(value) => [`${value}h`, 'Study time']} cursor={{ stroke: 'rgba(119,165,255,.3)' }}/><Area type="monotone" dataKey="hours" stroke="#76aaff" strokeWidth={2} fill="url(#studyFill)" activeDot={{ r: 4, fill: '#76aaff', stroke: '#101827', strokeWidth: 2 }}/></AreaChart></ResponsiveContainer></div>
          <p className="mt-2 text-[10px] text-slate-600">Illustrative sample figures · connect your data to personalize this chart.</p>
        </SectionCard>

        <div className="grid min-w-0 content-start gap-4">
        <SectionCard title="Upcoming sessions" className="min-w-0" action={<a href="/timetable" className="text-xs text-blue-300 hover:text-blue-200">Timetable <ArrowRight size={13} className="inline" /></a>}>
          {plannerLoading ? <p role="status" className="text-sm text-slate-500">Loading sessions…</p> : plannerError ? <div><p role="alert" className="text-sm text-rose-300">{plannerError}</p><button type="button" onClick={() => setPlannerRetry((value) => value + 1)} className="mt-2 inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"><RefreshCw size={12} />Retry</button></div> : upcomingOccurrences.length ? <div className="space-y-1">{upcomingOccurrences.map((item) => {
            const category = sessionCategoryStyles[item.session.session_category]
            const subject = 'subject' in item.session ? item.session.subject : null
            const status = item.log?.status === 'completed' ? 'Completed' : item.log?.status === 'skipped' ? 'Skipped' : 'Pending'
            const statusTone = status === 'Completed' ? 'text-emerald-300' : status === 'Skipped' ? 'text-slate-400' : 'text-amber-200'
            return <div key={`${item.session.id}:${item.occurrence_date}`} className="deadline-row"><div className="deadline-date"><CalendarClock size={14} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{item.session.title}</p><p className="mt-1 truncate text-[11px] text-slate-500">{formatSessionDate(item.occurrence_date)} · {formatSessionTime(item.start_time)}–{formatSessionTime(item.end_time)}{subject ? ` · ${subject.name}` : ` · ${category.label}`}</p></div><span className={`shrink-0 text-[10px] ${statusTone}`}>{status}</span></div>
          })}</div> : <p className="text-sm text-slate-500">No upcoming sessions in the next week.</p>}
        </SectionCard>
        <SectionCard title="Upcoming assignments" className="min-w-0" action={<a href="/assignments" className="text-xs text-blue-300 hover:text-blue-200">View All <ArrowRight size={13} className="inline"/></a>}>
          {assignmentLoading ? <p role="status" className="text-sm text-slate-500">Loading assignments…</p> : assignmentError ? <p role="alert" className="text-sm text-rose-300">{assignmentError}</p> : deadlineAssignments.upcoming.length ? <div className="space-y-1">{deadlineAssignments.upcoming.map((item) => <div key={item.id} className="deadline-row"><div className="deadline-date"><CalendarClock size={14}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{item.title}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.subject.name} · {formatAssignmentStatus(item.status)}</p></div><time className="text-[10px] text-slate-400">{formatDue(item.due_at)}</time></div>)}</div> : <p className="text-sm text-slate-500">No upcoming assignments.</p>}
        </SectionCard>
        <SectionCard title={`Overdue assignments · ${assignmentLoading ? '—' : assignmentStats.overdue}`} className="min-w-0" action={<a href="/assignments" className="text-xs text-blue-300 hover:text-blue-200">View All <ArrowRight size={13} className="inline"/></a>}>
          {assignmentLoading ? <p role="status" className="text-sm text-slate-500">Loading assignments…</p> : assignmentError ? <p role="alert" className="text-sm text-rose-300">{assignmentError}</p> : deadlineAssignments.overdue.length ? <div className="space-y-1">{deadlineAssignments.overdue.map((item) => <div key={item.id} className="deadline-row"><div className="deadline-date text-rose-300"><CalendarClock size={14}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{item.title}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.subject.name}</p></div><span className="text-[10px] font-medium text-rose-300">Overdue</span><time className="text-[10px] text-slate-400">{formatDue(item.due_at)}</time></div>)}</div> : <p className="text-sm text-slate-500">No overdue assignments.</p>}
        </SectionCard>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.055] bg-white/[0.015] px-4 py-3"><div className="flex items-center gap-2 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Dashboard layout preview · assignment and Daily Goals data are synced.</div><span className="items-center gap-1 text-[11px] text-slate-600 sm:flex"><ArrowDownRight size={12}/> Sample academic and study figures</span></div>
    </div>
  )
}

