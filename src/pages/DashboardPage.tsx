import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Brain, Check, Clock3, Code2, MoreHorizontal, Plus, Target, ClipboardList, CalendarClock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PageHeading from '../components/common/PageHeading'
import SectionCard from '../components/common/SectionCard'
import SampleBadge from '../components/dashboard/SampleBadge'
import StatCard from '../components/dashboard/StatCard'
import type { Goal, ScheduleItem, StudyDay } from '../types/dashboard'
import { listSyllabusAnalytics } from '../services/academics'
import { calculateSyllabusProgress } from '../utils/syllabusProgress'
import ProgressBar from '../components/academics/ProgressBar'
import { listAssignments } from '../services/assignments'
import type { AssignmentWithSubject } from '../types/assignments'
import { formatAssignmentStatus, isOverdue, isUpcoming } from '../utils/assignmentDates'
import { createLatestRequestGate } from '../utils/latestRequest'

const goals: Goal[] = [
  { label: 'Review Operating Systems notes', done: true },
  { label: 'Solve 2 array problems', done: false },
  { label: 'Read project research paper', done: false },
  { label: 'Revise database normalization', done: false },
]
const schedule: ScheduleItem[] = [
  { time: '09:00 AM', title: 'Machine Learning and Swarm Intelligence', detail: 'Sample · Lecture', color: 'blue' },
  { time: '11:00 AM', title: 'Data Analytics and Visualization', detail: 'Sample · Lecture', color: 'violet' },
  { time: '02:00 PM', title: 'Mini Project-II', detail: 'Sample · Studio', color: 'green' },
]
const studyData: StudyDay[] = [
  { day: 'Mon', hours: 2.5 }, { day: 'Tue', hours: 3.8 }, { day: 'Wed', hours: 2.9 },
  { day: 'Thu', hours: 4.4 }, { day: 'Fri', hours: 3.2 }, { day: 'Sat', hours: 5.1 }, { day: 'Sun', hours: 2.1 },
]
const stats = [
  { label: 'Daily goals', value: '1 / 4', detail: '3 goals left today', icon: Target, tone: 'blue' as const },
  { label: 'Study hours', value: '24.0h', detail: 'This week · sample', icon: Clock3, tone: 'violet' as const },
  { label: 'DSA progress', value: '38 / 150', detail: 'Problems solved · sample', icon: Code2, tone: 'green' as const },
  { label: 'Semester progress', value: '62%', detail: 'Semester VI · sample', icon: BookOpen, tone: 'amber' as const },
]

export default function DashboardPage() {
  const [syllabusSummary, setSyllabusSummary] = useState<{ total: number; completed: number; percentage: number } | null>(null)
  const [syllabusError, setSyllabusError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<AssignmentWithSubject[]>([])
  const [assignmentLoading, setAssignmentLoading] = useState(true)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
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
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer) }, [])
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {([
          ['Total assignments', assignmentStats.total, ClipboardList, 'blue'], ['To Do', assignmentStats.todo, CalendarClock, 'amber'], ['In Progress', assignmentStats.inProgress, Clock3, 'violet'], ['Submitted', assignmentStats.submitted, Check, 'blue'], ['Completed', assignmentStats.done, Check, 'green'], ['Overdue', assignmentStats.overdue, CalendarClock, 'amber'],
        ] as const).map(([label, value, Icon, tone]) => <div key={label} className="panel flex items-center gap-3 p-3"><span className={`icon-tile tone-${tone}`}><Icon size={15}/></span><div className="min-w-0"><p className="truncate text-[10px] text-slate-500">{label}</p><p className="text-lg font-semibold tabular-nums text-slate-100">{assignmentLoading ? '—' : value}</p></div></div>)}
      </div>

      <SectionCard title="Syllabus progress" className="min-w-0" action={<a href="/academics" className="text-xs text-blue-300 hover:text-blue-200">Academics <ArrowRight size={13} className="inline"/></a>}>
        {syllabusSummary ? <><ProgressBar percentage={syllabusSummary.percentage} label="Semester topics"/><p className="mt-2 text-xs text-slate-500">{syllabusSummary.completed} completed · {Math.max(0, syllabusSummary.total - syllabusSummary.completed)} pending of {syllabusSummary.total} topics</p></> : syllabusError ? <p role="alert" className="text-sm text-rose-300">{syllabusError}</p> : <p className="text-sm text-slate-500">Loading syllabus progress…</p>}
      </SectionCard>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <SectionCard title="Today's timetable" className="h-full min-w-0" action={<><SampleBadge /><button className="icon-button ml-1" aria-label="More timetable options"><MoreHorizontal size={18} /></button></>}>
          <div className="space-y-1">{schedule.map((item) => <div key={item.title} className="schedule-row"><span className="w-[68px] shrink-0 text-[10px] tabular-nums text-slate-500 sm:w-[76px] sm:text-[11px]">{item.time}</span><span className={`schedule-dot dot-${item.color}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{item.title}</p><p className="mt-1 truncate text-[10px] text-slate-500 sm:text-xs">{item.detail}</p></div><ArrowRight size={15} className="text-slate-600" /></div>)}</div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.11] py-2.5 text-xs font-medium text-slate-400 transition hover:border-blue-400/30 hover:text-blue-300"><Plus size={14} /> Add a class</button>
        </SectionCard>

        <SectionCard title="Daily goals" className="h-full min-w-0" action={<><SampleBadge /><button className="icon-button ml-1" aria-label="More goal options"><MoreHorizontal size={18} /></button></>}>
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-white/[0.025] p-3"><div className="relative h-10 w-10 shrink-0"><svg className="h-full w-full -rotate-90" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3"/><circle cx="20" cy="20" r="16" fill="none" stroke="#5d9cff" strokeWidth="3" strokeDasharray="25.1 100.5" strokeLinecap="round"/></svg><span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">25%</span></div><div><p className="text-xs font-medium text-slate-200">You're off to a start</p><p className="mt-1 text-[11px] text-slate-500">1 of 4 goals completed</p></div></div>
          <div className="space-y-1">{goals.map((goal) => <div key={goal.label} className="goal-row"><span className={`goal-check ${goal.done ? 'goal-check-done' : ''}`}>{goal.done && <Check size={12} />}</span><span className={`flex-1 text-xs ${goal.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{goal.label}</span></div>)}</div>
          <a href="/daily-goals" className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs font-medium text-slate-400 hover:text-blue-300"><span>See all goals</span><ArrowRight size={14} /></a>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <SectionCard title="Weekly study hours" className="h-full min-w-0" action={<><SampleBadge /><button className="period-select ml-1">This week <span>⌄</span></button></>}>
          <div className="mb-2 flex items-end justify-between"><div><span className="text-2xl font-semibold tracking-tight text-white">24.0</span><span className="ml-1.5 text-xs text-slate-500">hours</span></div><span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><ArrowUpRight size={13} /> 12% <span className="text-slate-500">vs last week</span></span></div>
          <div className="h-[195px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={studyData} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#619cff" stopOpacity={0.25}/><stop offset="95%" stopColor="#619cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#69758a', fontSize: 11 }} dy={9}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#69758a', fontSize: 10 }} ticks={[0,2,4,6]} tickFormatter={(value: number) => `${value}h`}/><Tooltip contentStyle={{ background: '#111a2a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, color: '#e2e8f0', fontSize: 12 }} formatter={(value) => [`${value}h`, 'Study time']} cursor={{ stroke: 'rgba(119,165,255,.3)' }}/><Area type="monotone" dataKey="hours" stroke="#76aaff" strokeWidth={2} fill="url(#studyFill)" activeDot={{ r: 4, fill: '#76aaff', stroke: '#101827', strokeWidth: 2 }}/></AreaChart></ResponsiveContainer></div>
          <p className="mt-2 text-[10px] text-slate-600">Illustrative sample figures · connect your data to personalize this chart.</p>
        </SectionCard>

        <div className="grid min-w-0 content-start gap-4">
        <SectionCard title="Upcoming assignments" className="min-w-0" action={<a href="/assignments" className="text-xs text-blue-300 hover:text-blue-200">View All <ArrowRight size={13} className="inline"/></a>}>
          {assignmentLoading ? <p role="status" className="text-sm text-slate-500">Loading assignments…</p> : assignmentError ? <p role="alert" className="text-sm text-rose-300">{assignmentError}</p> : deadlineAssignments.upcoming.length ? <div className="space-y-1">{deadlineAssignments.upcoming.map((item) => <div key={item.id} className="deadline-row"><div className="deadline-date"><CalendarClock size={14}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{item.title}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.subject.name} · {formatAssignmentStatus(item.status)}</p></div><time className="text-[10px] text-slate-400">{formatDue(item.due_at)}</time></div>)}</div> : <p className="text-sm text-slate-500">No upcoming assignments.</p>}
        </SectionCard>
        <SectionCard title={`Overdue assignments · ${assignmentLoading ? '—' : assignmentStats.overdue}`} className="min-w-0" action={<a href="/assignments" className="text-xs text-blue-300 hover:text-blue-200">View All <ArrowRight size={13} className="inline"/></a>}>
          {assignmentLoading ? <p role="status" className="text-sm text-slate-500">Loading assignments…</p> : assignmentError ? <p role="alert" className="text-sm text-rose-300">{assignmentError}</p> : deadlineAssignments.overdue.length ? <div className="space-y-1">{deadlineAssignments.overdue.map((item) => <div key={item.id} className="deadline-row"><div className="deadline-date text-rose-300"><CalendarClock size={14}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{item.title}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.subject.name}</p></div><span className="text-[10px] font-medium text-rose-300">Overdue</span><time className="text-[10px] text-slate-400">{formatDue(item.due_at)}</time></div>)}</div> : <p className="text-sm text-slate-500">No overdue assignments.</p>}
        </SectionCard>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.055] bg-white/[0.015] px-4 py-3"><div className="flex items-center gap-2 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Dashboard layout preview · assignment data is synced.</div><span className="items-center gap-1 text-[11px] text-slate-600 sm:flex"><ArrowDownRight size={12}/> Sample study and goal figures</span></div>
    </div>
  )
}

