import { BookOpen } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'

const semesterSubjects = [
  { name: 'Machine Learning and Swarm Intelligence', credits: 3 },
  { name: 'Data Analytics and Visualization', credits: 3 },
  { name: 'Internet of Things', credits: 3 },
  { name: 'Digital Imaging Techniques and Analysis', credits: 3 },
  { name: 'Multi-disciplinary Minor', credits: 3 },
  { name: 'Mini Project-II', credits: 2 },
  { name: 'Professional Skill', credits: 2 },
]
const laboratoryComponents = [
  'Machine Learning and Swarm Intelligence Lab',
  'Data Analytics and Visualization Lab',
  'Internet of Things Lab',
  'Digital Imaging Techniques and Analysis Lab',
  'Multi-disciplinary Minor Lab',
]
const mainCredits = semesterSubjects.reduce((total, subject) => total + subject.credits, 0)
const laboratoryCredits = laboratoryComponents.length

export default function AcademicsPage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeading
        eyebrow="SemesterOS / Semester VI"
        title="Academics"
        description="Your Semester VI subjects and credit load."
      />

      <section className="panel">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Semester VI credit summary</h2>
            <p className="mt-1 text-xs text-slate-500">{semesterSubjects.length} main subjects · {laboratoryComponents.length} laboratory components</p>
          </div>
          <div className="rounded-lg border border-blue-400/15 bg-blue-400/[0.06] px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Total credits</p>
            <p className="text-xl font-semibold text-blue-200">{mainCredits + laboratoryCredits}</p>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-400">Main subject credits</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{mainCredits}</p>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-400">Laboratory credits</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{laboratoryCredits}</p>
          </div>
        </div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Main subjects</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {semesterSubjects.map((subject) => (
            <article key={subject.name} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <span className="icon-tile tone-blue mt-0.5"><BookOpen size={16} /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-medium leading-5 text-slate-200">{subject.name}</h3>
                  <p className="mt-2 text-xs text-slate-500">{subject.credits} credits</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Laboratory components</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {laboratoryComponents.map((name) => (
            <article key={name} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <span className="icon-tile tone-violet mt-0.5"><BookOpen size={16} /></span>
                <div className="min-w-0 flex-1">
                  <h4 className="break-words text-sm font-medium leading-5 text-slate-200">{name}</h4>
                  <p className="mt-2 text-xs text-slate-500">1 credit</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
