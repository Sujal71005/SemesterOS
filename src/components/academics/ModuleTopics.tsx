import { useCallback, useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createTopic, deleteTopic, listTopics, updateTopic } from '../../services/academics'
import type { SyllabusModule, SyllabusTopic } from '../../types/academics'

export default function ModuleTopics({ module, onChanged }: { module: SyllabusModule; onChanged?: () => void }) {
  const [topics, setTopics] = useState<SyllabusTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try { setTopics(await listTopics(module.id)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load topics.') }
    finally { setLoading(false) }
  }, [module.id])
  useEffect(() => { void refresh() }, [refresh])

  const submit = async (event: React.FormEvent<HTMLFormElement>, topic?: SyllabusTopic) => {
    event.preventDefault(); if (busy) return
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!title || title.length > 200) { setError('Enter a topic title of 1 to 200 characters.'); return }
    const duplicate = topics.some((item) => item.id !== topic?.id && item.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase())
    if (duplicate) { setError('A topic with this title already exists in this module.'); return }
    setBusy(true); setError(null); setNotice(null)
    try {
      if (topic) await updateTopic(topic.id, { title })
      else await createTopic({ module_id: module.id, title, position: topics.reduce((max, item) => Math.max(max, item.position), -1) + 1 })
      await refresh(); onChanged?.(); setAdding(false); setEditing(null); setNotice(topic ? 'Topic updated.' : 'Topic added.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save topic.') }
    finally { setBusy(false) }
  }

  const toggle = async (topic: SyllabusTopic) => {
    if (busy) return
    setBusy(true); setError(null); setNotice(null)
    try { await updateTopic(topic.id, { is_complete: !topic.is_complete }); await refresh(); onChanged?.(); setNotice('Topic completion updated.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update topic.') }
    finally { setBusy(false) }
  }

  const remove = async (topic: SyllabusTopic) => {
    if (busy || !window.confirm(`Delete “${topic.title}”? This cannot be undone.`)) return
    setBusy(true); setError(null); setNotice(null)
    try { await deleteTopic(topic.id); await refresh(); onChanged?.(); setNotice('Topic deleted.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete topic.') }
    finally { setBusy(false) }
  }

  return <div className="mt-4 border-t border-white/[0.07] pt-3">
    <div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Topics</h4><button disabled={busy} onClick={() => { setAdding(true); setEditing(null); setError(null) }} className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 disabled:opacity-50"><Plus size={13}/>Add Topic</button></div>
    {error && <p role="alert" className="mb-2 text-xs text-rose-300">{error}</p>}{notice && <p role="status" className="mb-2 text-xs text-emerald-300">{notice}</p>}
    {loading ? <p className="text-xs text-slate-500">Loading topics…</p> : topics.length === 0 ? <p className="py-2 text-xs text-slate-500">No topics yet. Add the first topic for this module.</p> : <ul className="space-y-1">{topics.map((topic) => <li key={topic.id} className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1 hover:bg-white/[0.025]">
      <input aria-label={`Mark ${topic.title} complete`} type="checkbox" checked={topic.is_complete} disabled={busy} onChange={() => void toggle(topic)} className="accent-blue-500"/>
      {editing === topic.id ? <form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => void submit(event, topic)}><input autoFocus name="title" defaultValue={topic.title} maxLength={200} className="min-w-0 flex-1 rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-200"/><button disabled={busy} aria-label="Save title"><Check size={14}/></button><button type="button" aria-label="Cancel edit" onClick={() => setEditing(null)}><X size={14}/></button></form> : <><span className={`min-w-0 flex-1 break-words text-sm ${topic.is_complete ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{topic.title}</span><button disabled={busy} aria-label={`Edit ${topic.title}`} onClick={() => { setEditing(topic.id); setAdding(false); setError(null) }} className="text-slate-500 hover:text-slate-200 disabled:opacity-50"><Pencil size={13}/></button><button disabled={busy} aria-label={`Delete ${topic.title}`} onClick={() => void remove(topic)} className="text-slate-500 hover:text-rose-300 disabled:opacity-50"><Trash2 size={13}/></button></>}
    </li>)}</ul>}
    {adding && <form onSubmit={(event) => void submit(event)} className="mt-2 flex gap-2"><input autoFocus name="title" required maxLength={200} placeholder="Topic title" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600"/><button disabled={busy} className="rounded-lg bg-blue-500 px-3 py-2 text-xs text-white disabled:opacity-50">{busy?'Saving…':'Save'}</button><button type="button" disabled={busy} onClick={() => setAdding(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Cancel</button></form>}
  </div>
}
