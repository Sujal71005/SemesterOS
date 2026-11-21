import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Plus, X } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import { createModule, listModules, listSubjects, listTopicsForModules } from '../services/academics'
import type { Subject, SyllabusModule, SyllabusSection, SyllabusTopic } from '../types/academics'
import ModuleTopics from '../components/academics/ModuleTopics'
import ProgressBar from '../components/academics/ProgressBar'
import { calculateSyllabusProgress } from '../utils/syllabusProgress'

export default function SyllabusPage() {
  const { subjectId = '' } = useParams()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [modules, setModules] = useState<SyllabusModule[]>([])
  const [topics, setTopics] = useState<SyllabusTopic[]>([])
  const [progressLoading, setProgressLoading] = useState(true)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const found = (await listSubjects()).find((item) => item.id === subjectId)
      if (!found) throw new Error('Subject not found or you do not have access to it.')
      const loadedModules = await listModules(subjectId)
      setSubject(found)
      setModules(loadedModules)
      setTopics(await listTopicsForModules(loadedModules.map((module) => module.id)))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load this syllabus.') }
    finally { setLoading(false) }
  }, [subjectId])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { setProgressLoading(loading); setProgressError(error) }, [loading, error])

  const progress = calculateSyllabusProgress(modules, topics)[0]

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (saving) return
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    const section = String(form.get('section')) as SyllabusSection
    if (!title || title.length > 160 || !['theory', 'practical'].includes(section)) { setFormError('Enter a module title of 1 to 160 characters and choose a section.'); return }
    const duplicate = modules.some((module) => module.section === section && module.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase())
    if (duplicate) { setFormError('A module with this title already exists in this section.'); return }
    setSaving(true); setFormError(null)
    try {
      const position = modules.filter((module) => module.section === section).reduce((max, module) => Math.max(max, module.position), -1) + 1
      await createModule({ subject_id: subjectId, section, title, description, position })
      await refresh(); setOpen(false); setNotice('Module created successfully.')
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Could not create module.') }
    finally { setSaving(false) }
  }

  const renderSection = (section: SyllabusSection, label: string) => {
    const rows = modules.filter((module) => module.section === section)
    return <section className="panel"><h2 className="mb-4 text-sm font-semibold text-slate-100">{label}</h2>{rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No {label.toLowerCase()} yet. Add a module to get started.</p> : <ol className="space-y-3">{rows.map((module) => { const moduleProgress = progress?.modules.find((item) => item.moduleId === module.id); return <li key={module.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4"><div className="flex gap-3"><span className="icon-tile tone-blue"><BookOpen size={16}/></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><p className="text-xs text-slate-500">Module {module.position + 1} · {label}</p><h3 className="mt-1 text-sm font-medium text-slate-200">{module.title}</h3></div><span className="whitespace-nowrap text-xs text-slate-400">{moduleProgress?.completed ?? 0}/{moduleProgress?.total ?? 0} · {moduleProgress?.percentage ?? 0}%</span></div><ProgressBar percentage={moduleProgress?.percentage ?? 0} label="Module progress"/>{module.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">{module.description}</p>}</div></div><ModuleTopics module={module} onChanged={() => void refresh()}/></li> })}</ol>}</section>
  }

  return <div className="mx-auto max-w-[1100px]">
    <Link to="/academics" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"><ArrowLeft size={15}/>Back to Academics</Link>
    {loading ? <section className="panel text-sm text-slate-300">Loading syllabus…</section> : error ? <section role="alert" className="panel text-sm text-rose-200">{error}<button onClick={() => void refresh()} className="ml-3 underline">Retry</button></section> : <>
      <div className="flex flex-wrap items-start justify-between gap-3"><PageHeading eyebrow="SemesterOS / Syllabus" title={subject?.name ?? 'Syllabus'} description={`${subject?.credits ?? 0} credits · Manage theory and practical modules.`}/><button onClick={() => { setFormError(null); setOpen(true) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400"><Plus size={16}/>Add Module</button></div>
      {notice && <p role="status" className="mb-3 text-sm text-emerald-300">{notice}</p>}
      <section className="panel mb-4"><div className="grid gap-4 sm:grid-cols-3">{progressLoading ? <p className="text-sm text-slate-400">Loading progress…</p> : progressError ? <p role="alert" className="text-sm text-rose-300">{progressError}</p> : !progress || progress.total === 0 ? <p className="text-sm text-slate-400">No topics yet. Progress will appear when topics are added.</p> : <><div><ProgressBar percentage={progress.percentage} label="Overall progress"/><p className="mt-2 text-xs text-slate-500">{progress.completed} completed · {progress.pending} pending topics</p></div><div><ProgressBar percentage={progress.theory.percentage} label="Theory progress"/><p className="mt-2 text-xs text-slate-500">{progress.theory.completed} / {progress.theory.total} topics</p></div><div><ProgressBar percentage={progress.practical.percentage} label="Practical progress"/><p className="mt-2 text-xs text-slate-500">{progress.practical.completed} / {progress.practical.total} topics</p></div></>}</div></section>
      <div className="grid gap-4 lg:grid-cols-2">{renderSection('theory','Theory Modules')}{renderSection('practical','Practical Modules')}</div>
    </>}
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={(e) => { if (e.target===e.currentTarget&&!saving) setOpen(false) }}><section role="dialog" aria-modal="true" aria-labelledby="module-dialog-title" className="w-full max-w-md rounded-xl border border-white/10 bg-[#101827] p-5 shadow-2xl"><div className="mb-5 flex justify-between"><h2 id="module-dialog-title" className="font-semibold text-slate-100">Add Module</h2><button disabled={saving} onClick={() => setOpen(false)} aria-label="Close"><X size={18}/></button></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm text-slate-300">Module title<input name="title" required maxLength={160} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"/></label><label className="block text-sm text-slate-300">Description <span className="text-slate-500">(optional)</span><textarea name="description" rows={3} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"/></label><label className="block text-sm text-slate-300">Section<select name="section" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"><option value="theory">Theory</option><option value="practical">Practical</option></select></label>{formError&&<p role="alert" className="text-sm text-rose-300">{formError}</p>}<button disabled={saving} className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving?'Saving…':'Save module'}</button></form></section></div>}
  </div>
}
