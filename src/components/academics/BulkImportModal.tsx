import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { addSubjectsBatch } from '../../services/academics'
import type { Subject, SubjectKind } from '../../types/academics'

const curriculum: Array<{ name: string; credits: number; kind: SubjectKind }> = [
  { name: 'Machine Learning and Swarm Intelligence', credits: 3, kind: 'subject' },
  { name: 'Data Analytics and Visualization', credits: 3, kind: 'subject' },
  { name: 'Internet of Things', credits: 3, kind: 'subject' },
  { name: 'Digital Imaging Techniques and Analysis', credits: 3, kind: 'subject' },
  { name: 'Multi-disciplinary Minor', credits: 3, kind: 'subject' },
  { name: 'Mini Project-II', credits: 2, kind: 'subject' },
  { name: 'Professional Skill', credits: 2, kind: 'subject' },
  { name: 'Machine Learning and Swarm Intelligence Lab', credits: 1, kind: 'lab' },
  { name: 'Data Analytics and Visualization Lab', credits: 1, kind: 'lab' },
  { name: 'Internet of Things Lab', credits: 1, kind: 'lab' },
  { name: 'Digital Imaging Techniques and Analysis Lab', credits: 1, kind: 'lab' },
  { name: 'Multi-disciplinary Minor Lab', credits: 1, kind: 'lab' },
]

const keyFor = (name: string, kind: SubjectKind) => `${kind}:${name.trim().toLocaleLowerCase()}`

export type BulkImportOutcome = { imported: number; skipped: number; credits: number; errors: string[] }

export default function BulkImportModal({ existing, onClose, onImported }: {
  existing: Subject[]; onClose: () => void; onImported: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<BulkImportOutcome | null>(null)
  const existingKeys = useMemo(() => new Set(existing.map((row) => keyFor(row.name, row.kind))), [existing])
  const missing = curriculum.filter((row) => !existingKeys.has(keyFor(row.name, row.kind)))

  const importRows = async () => {
    if (saving || outcome) return
    setSaving(true); setLoadError(null)
    try {
      const inserted = await addSubjectsBatch(missing)
      const result = { imported: inserted.length, skipped: curriculum.length - missing.length, credits: inserted.reduce((sum, row) => sum + row.credits, 0), errors: [] as string[] }
      setOutcome(result)
      if (inserted.length) await onImported()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database rejected the batch insert.'
      // A unique conflict may occur if another request inserts after preview. Refresh and report safely.
      try {
        const current = await onImported()
        void current
      } catch { /* retain the original database error */ }
      setOutcome({ imported: 0, skipped: curriculum.length - missing.length, credits: 0, errors: [message] })
      setLoadError(message)
    } finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="bulk-import-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-white/10 bg-[#101827] p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><div><h2 id="bulk-import-title" className="font-semibold text-slate-100">Bulk Import · Semester VI</h2><p className="mt-1 text-xs text-slate-400">Review curriculum records before adding them to your account.</p></div><button disabled={saving} onClick={onClose} aria-label="Close"><X size={18}/></button></div>
      <div className="overflow-auto rounded-lg border border-white/[0.08]"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="p-3">Name</th><th className="p-3">Kind</th><th className="p-3">Credits</th><th className="p-3">Status</th></tr></thead><tbody>{curriculum.map((row) => { const exists = existingKeys.has(keyFor(row.name, row.kind)); return <tr key={keyFor(row.name,row.kind)} className="border-t border-white/[0.06]"><td className="p-3 text-slate-200">{row.name}</td><td className="p-3 capitalize text-slate-400">{row.kind}</td><td className="p-3 text-slate-300">{row.credits}</td><td className="p-3 text-xs">{exists ? <span className="text-amber-300">Already exists — will skip</span> : <span className="text-emerald-300">New</span>}</td></tr> })}</tbody></table></div>
      <p className="mt-3 text-sm text-slate-300">{missing.length} new records · {missing.reduce((sum,row)=>sum+row.credits,0)} credits to import</p>
      {loadError && <p role="alert" className="mt-2 break-words text-sm text-rose-300">Import error: {loadError}</p>}
      {outcome && <div role="status" className="mt-3 rounded-lg bg-white/[0.04] p-3 text-sm text-slate-200"><p>Imported: {outcome.imported} · Skipped: {outcome.skipped} · Imported credits: {outcome.credits}</p>{outcome.errors.map((error) => <p key={error} className="mt-1 break-words text-rose-300">Failed batch: {error}</p>)}</div>}
      <div className="mt-5 flex justify-end gap-2"><button disabled={saving} onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:opacity-50">{outcome ? 'Close' : 'Cancel'}</button><button disabled={saving || missing.length===0 || !!outcome} onClick={() => void importRows()} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving?'Importing…':outcome?'Imported':'Import'}</button></div>
    </section>
  </div>
}
