import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Brain, Check, Clock3, Code2, MoreHorizontal, Plus, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PageHeading from '../components/common/PageHeading'
import SectionCard from '../components/common/SectionCard'
import SampleBadge from '../components/dashboard/SampleBadge'
import StatCard from '../components/dashboard/StatCard'
import type { Deadline, Goal, ScheduleItem, StudyDay } from '../types/dashboard'
import { listSyllabusAnalytics } from '../services/academics'
import { calculateSyllabusProgress } from '../utils/syllabusProgress'
import ProgressBar from '../components/academics/ProgressBar'

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
const deadlines: Deadline[] = [
  { title: 'IoT sensor prototype', course: 'Machine Learning and Swarm Intelligence', date: 'Nov 24', daysLeft: 3 },
  { title: 'Project progress review', course: 'Mini Project-II', date: 'Nov 27', daysLeft: 6 },
  { title: 'Image enhancement practical', course: 'Digital Imaging Techniques and Analysis', date: 'Dec 02', daysLeft: 11 },
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
  useEffect(() => { void listSyllabusAnalytics().then((data) => {
    const progress = calculateSyllabusProgress(data.modules, data.topics, data.subjects)
    const total = progress.reduce((sum, item) => sum + item.total, 0)
    const completed = progress.reduce((sum, item) => sum + item.completed, 0)
    setSyllabusSummary({ total, completed, percentage: total ? Math.round(completed / total * 100) : 0 })
  }).catch((cause) => setSyllabusError(cause instanceof Error ? cause.message : 'Could not load syllabus progress.')) }, [])
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeading eyebrow="Friday, November 21, 2026" title="Good morning, Student" description="A clear view of your semester, one day at a time." />

      <div className="welcome-banner mb-6">
        <div className="relative z-10 max-w-xl">
          <div className="mb-3 flex items-center gap-2"><span className="welcome-icon"><Brain size={16} /></span><span className="text-xs font-medium text-blue-200">Your semester at a glance</span></div>
          <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Make today count.</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-300">Small, consistent steps add up. Pick a priority and get into your flow.</p>
          <a href="/daily-goals" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-300 hover:text-blue-200">View daily goals <ArrowRight size={14} /></a>
        </div>
        <div className="welcome-orbit" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-center"><BookOpen size={22} /></div><div className="orbit-star">✦</div></div>
        <div className="absolute right-4 top-4"><SampleBadge /></div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>

      <SectionCard title="Syllabus progress" action={<a href="/academics" className="text-xs text-blue-300 hover:text-blue-200">Academics <ArrowRight size={13} className="inline"/></a>}>
        {syllabusSummary ? <><ProgressBar percentage={syllabusSummary.percentage} label="Semester topics"/><p className="mt-2 text-xs text-slate-500">{syllabusSummary.completed} completed · {Math.max(0, syllabusSummary.total - syllabusSummary.completed)} pending of {syllabusSummary.total} topics</p></> : syllabusError ? <p role="alert" className="text-sm text-rose-300">{syllabusError}</p> : <p className="text-sm text-slate-500">Loading syllabus progress…</p>}
      </SectionCard>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Today's timetable" action={<><SampleBadge /><button className="icon-button ml-1" aria-label="More timetable options"><MoreHorizontal size={18} /></button></>}>
          <div className="space-y-1">{schedule.map((item) => <div key={item.title} className="schedule-row"><span className="w-[68px] shrink-0 text-[10px] tabular-nums text-slate-500 sm:w-[76px] sm:text-[11px]">{item.time}</span><span className={`schedule-dot dot-${item.color}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{item.title}</p><p className="mt-1 truncate text-[10px] text-slate-500 sm:text-xs">{item.detail}</p></div><ArrowRight size={15} className="text-slate-600" /></div>)}</div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.11] py-2.5 text-xs font-medium text-slate-400 transition hover:border-blue-400/30 hover:text-blue-300"><Plus size={14} /> Add a class</button>
        </SectionCard>

        <SectionCard title="Daily goals" action={<><SampleBadge /><button className="icon-button ml-1" aria-label="More goal options"><MoreHorizontal size={18} /></button></>}>
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-white/[0.025] p-3"><div className="relative h-10 w-10 shrink-0"><svg className="h-full w-full -rotate-90" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3"/><circle cx="20" cy="20" r="16" fill="none" stroke="#5d9cff" strokeWidth="3" strokeDasharray="25.1 100.5" strokeLinecap="round"/></svg><span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">25%</span></div><div><p className="text-xs font-medium text-slate-200">You're off to a start</p><p className="mt-1 text-[11px] text-slate-500">1 of 4 goals completed</p></div></div>
          <div className="space-y-1">{goals.map((goal) => <div key={goal.label} className="goal-row"><span className={`goal-check ${goal.done ? 'goal-check-done' : ''}`}>{goal.done && <Check size={12} />}</span><span className={`flex-1 text-xs ${goal.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{goal.label}</span></div>)}</div>
          <a href="/daily-goals" className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs font-medium text-slate-400 hover:text-blue-300"><span>See all goals</span><ArrowRight size={14} /></a>
        </SectionCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Weekly study hours" action={<><SampleBadge /><button className="period-select ml-1">This week <span>⌄</span></button></>}>
          <div className="mb-2 flex items-end justify-between"><div><span className="text-2xl font-semibold tracking-tight text-white">24.0</span><span className="ml-1.5 text-xs text-slate-500">hours</span></div><span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><ArrowUpRight size={13} /> 12% <span className="text-slate-500">vs last week</span></span></div>
          <div className="h-[195px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={studyData} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#619cff" stopOpacity={0.25}/><stop offset="95%" stopColor="#619cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#69758a', fontSize: 11 }} dy={9}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#69758a', fontSize: 10 }} ticks={[0,2,4,6]} tickFormatter={(value: number) => `${value}h`}/><Tooltip contentStyle={{ background: '#111a2a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, color: '#e2e8f0', fontSize: 12 }} formatter={(value) => [`${value}h`, 'Study time']} cursor={{ stroke: 'rgba(119,165,255,.3)' }}/><Area type="monotone" dataKey="hours" stroke="#76aaff" strokeWidth={2} fill="url(#studyFill)" activeDot={{ r: 4, fill: '#76aaff', stroke: '#101827', strokeWidth: 2 }}/></AreaChart></ResponsiveContainer></div>
          <p className="mt-2 text-[10px] text-slate-600">Illustrative sample figures · connect your data to personalize this chart.</p>
        </SectionCard>

        <SectionCard title="Upcoming deadlines" action={<><SampleBadge /><button className="icon-button ml-1" aria-label="More deadlines"><MoreHorizontal size={18} /></button></>}>
          <div className="space-y-1">{deadlines.map((deadline) => <div key={deadline.title} className="deadline-row"><div className="deadline-date"><span>{deadline.date.split(' ')[0]}</span><strong>{deadline.date.split(' ')[1]}</strong></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{deadline.title}</p><p className="mt-1 text-[11px] text-slate-500">{deadline.course}</p></div><span className={`days-pill ${deadline.daysLeft <= 3 ? 'days-soon' : ''}`}>{deadline.daysLeft}d</span></div>)}</div>
          <a href="/academics" className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs font-medium text-slate-400 hover:text-blue-300"><span>View academic calendar</span><ArrowRight size={14} /></a>
        </SectionCard>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/[0.055] bg-white/[0.015] px-4 py-3"><div className="flex items-center gap-2 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Dashboard figures are sample data for layout preview.</div><span className="hidden items-center gap-1 text-[11px] text-slate-600 sm:flex"><ArrowDownRight size={12}/> Nothing is synced yet</span></div>
    </div>
  )
}

