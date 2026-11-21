import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, FlaskConical, RefreshCw, Plus, X } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import { addSubject, listSubjects, listSyllabusAnalytics } from '../services/academics'
import type { Subject, SubjectKind } from '../types/academics'
import BulkImportModal from '../components/academics/BulkImportModal'
import { Link } from 'react-router-dom'
import ProgressBar from '../components/academics/ProgressBar'
import { calculateSyllabusProgress } from '../utils/syllabusProgress'

export default function AcademicsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [progressBySubject, setProgressBySubject] = useState<Record<string, { percentage: number; completed: number; total: number }>>({})
  const [progressError, setProgressError] = useState<string | null>(null)

  const loadSubjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSubjects(await listSubjects())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load academics. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProgress = useCallback(async () => {
    try {
      const data = await listSyllabusAnalytics()
      const calculated = calculateSyllabusProgress(data.modules, data.topics, data.subjects)
      setProgressBySubject(Object.fromEntries(calculated.map((item) => [item.subjectId, item])))
      setProgressError(null)
    } catch (cause) { setProgressError(cause instanceof Error ? cause.message : 'Could not load syllabus progress.') }
  }, [])

  useEffect(() => { void loadSubjects(); void loadProgress() }, [loadSubjects, loadProgress])

  const { mainSubjects, labs, mainCredits, labCredits } = useMemo(() => {
    const main = subjects.filter((subject) => subject.kind === 'subject')
    const laboratory = subjects.filter((subject) => subject.kind === 'lab')
    return {
      mainSubjects: main,
      labs: laboratory,
      mainCredits: main.reduce((total, subject) => total + subject.credits, 0),
      labCredits: laboratory.reduce((total, subject) => total + subject.credits, 0),
    }
  }, [subjects])

  const totalCredits = mainCredits + labCredits
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const credits = Number(form.get('credits'))
    const kind = String(form.get('kind')) as SubjectKind
    if (!name || !Number.isInteger(credits) || credits <= 0 || !['subject', 'lab'].includes(kind)) {
      setSaveError('Enter a subject name and a positive whole number of credits.')
      return
    }
    setSaving(true); setSaveError(null); setSuccess(null)
    try { await addSubject({ name, credits, kind }); await loadSubjects(); setOpen(false); setSuccess('Subject saved.') }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Could not save subject.') }
    finally { setSaving(false) }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-start justify-between gap-3"><PageHeading eyebrow="SemesterOS / Semester VI" title="Academics" description="Your Semester VI subjects and credit load." /><div className="flex gap-2"><button onClick={() => setBulkOpen(true)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.06]">Bulk Import</button><button onClick={() => { setOpen(true); setSuccess(null); setSaveError(null) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400"><Plus size={16}/>Add Subject</button></div></div>
      {bulkOpen && <BulkImportModal existing={subjects} onClose={() => setBulkOpen(false)} onImported={loadSubjects} />}
      {success && <p role="status" className="mb-3 text-sm text-emerald-300">{success}</p>}
      {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={(event) => { if(event.target===event.currentTarget && !saving) setOpen(false) }}><section role="dialog" aria-modal="true" aria-labelledby="add-subject-title" className="w-full max-w-md rounded-xl border border-white/10 bg-[#101827] p-5 shadow-2xl"><div className="mb-5 flex justify-between"><h2 id="add-subject-title" className="font-semibold text-slate-100">Add Subject</h2><button disabled={saving} onClick={()=>setOpen(false)} aria-label="Close"><X size={18}/></button></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm text-slate-300">Subject name<input name="name" required maxLength={160} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"/></label><label className="block text-sm text-slate-300">Credits<input name="credits" type="number" min="1" step="1" required className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"/></label><label className="block text-sm text-slate-300">Kind<select name="kind" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"><option value="subject">Subject</option><option value="lab">Lab</option></select></label>{saveError && <p role="alert" className="text-sm text-rose-300">{saveError}</p>}<button disabled={saving} className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving?'Saving…':'Save subject'}</button></form></section></div>}

      {loading ? (
        <section className="panel grid min-h-52 place-items-center" role="status" aria-live="polite">
          <div className="flex items-center gap-3 text-sm text-slate-300"><span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-300" />Loading your subjects…</div>
        </section>
      ) : error ? (
        <section className="panel flex min-h-52 flex-col items-center justify-center text-center" role="alert">
          <p className="text-sm font-medium text-rose-200">Subjects could not be loaded</p>
          <p className="mt-2 max-w-lg text-sm text-slate-400">{error}</p>
          <button type="button" onClick={() => void loadSubjects()} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.06]">
            <RefreshCw size={14} /> Retry
          </button>
        </section>
      ) : subjects.length === 0 ? (
        <section className="panel grid min-h-52 place-items-center text-center">
          <div><p className="text-sm font-medium text-slate-200">No subjects saved yet</p><p className="mt-2 text-sm text-slate-500">Your academic records will appear here when they are available.</p></div>
        </section>
      ) : (
        <section className="panel">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Semester VI credit summary</h2>
              <p className="mt-1 text-xs text-slate-500">{mainSubjects.length} main subjects · {labs.length} laboratory components</p>
            </div>
            <div className="rounded-lg border border-blue-400/15 bg-blue-400/[0.06] px-4 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Total credits</p>
              <p className="text-xl font-semibold text-blue-200">{totalCredits}</p>
            </div>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"><p className="text-xs text-slate-400">Main subject credits</p><p className="mt-1 text-lg font-semibold text-slate-100">{mainCredits}</p></div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"><p className="text-xs text-slate-400">Laboratory credits</p><p className="mt-1 text-lg font-semibold text-slate-100">{labCredits}</p></div>
          </div>
          {mainSubjects.length > 0 && <>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Main subjects</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mainSubjects.map((subject) => <article key={subject.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4"><div className="flex items-start gap-3"><span className="icon-tile tone-blue mt-0.5"><BookOpen size={16} /></span><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-medium leading-5 text-slate-200">{subject.name}</h3><p className="mt-2 text-xs text-slate-500">{subject.credits} credits</p>{progressBySubject[subject.id] ? <ProgressBar percentage={progressBySubject[subject.id].percentage} label={`${progressBySubject[subject.id].completed} / ${progressBySubject[subject.id].total} topics`}/> : <p className="mt-2 text-xs text-slate-500">{progressError ?? 'Loading syllabus progress…'}</p>}<Link className="mt-3 inline-block text-xs font-medium text-blue-300 hover:text-blue-200" to={`/academics/${subject.id}/syllabus`}>Manage Syllabus</Link></div></div></article>)}
            </div>
          </>}
          {labs.length > 0 && <>
            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Laboratory components</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {labs.map((subject) => <article key={subject.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4"><div className="flex items-start gap-3"><span className="icon-tile tone-violet mt-0.5"><FlaskConical size={16} /></span><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-medium leading-5 text-slate-200">{subject.name}</h4><p className="mt-2 text-xs text-slate-500">{subject.credits} credits</p>{progressBySubject[subject.id] ? <ProgressBar percentage={progressBySubject[subject.id].percentage} label={`${progressBySubject[subject.id].completed} / ${progressBySubject[subject.id].total} topics`}/> : <p className="mt-2 text-xs text-slate-500">{progressError ?? 'Loading syllabus progress…'}</p>}<Link className="mt-3 inline-block text-xs font-medium text-violet-300 hover:text-violet-200" to={`/academics/${subject.id}/syllabus`}>Manage Syllabus</Link></div></div></article>)}
            </div>
          </>}
        </section>
      )}
    </div>
  )
}
