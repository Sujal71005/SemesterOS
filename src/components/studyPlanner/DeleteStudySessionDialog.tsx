import { useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import type { StudySessionWithSubject } from '../../types/studyPlanner'
import { useDialogFocus } from '../../hooks/useDialogFocus'

type Props = { session: StudySessionWithSubject; saving: boolean; error: string | null; onCancel: () => void; onConfirm: () => void }

export default function DeleteStudySessionDialog({ session, saving, error, onCancel, onConfirm }: Props) {
  const closeIfSafe = useCallback(() => { if (!saving) onCancel() }, [onCancel, saving])
  const dialogRef = useDialogFocus<HTMLElement>(closeIfSafe)
  const schedule = session.schedule_type === 'recurring'
    ? `Repeats weekly · weekday ${session.day_of_week}`
    : `One-time · ${session.session_date}`
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel() }}>
    <section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="delete-study-session-title" aria-describedby="delete-study-session-description" className="w-full max-w-md rounded-xl border border-white/10 bg-[#101827] p-5 shadow-2xl sm:p-6">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-rose-400/20 bg-rose-400/[0.08] text-rose-300"><AlertTriangle size={18} /></span><div className="min-w-0 flex-1"><h2 id="delete-study-session-title" className="text-lg font-semibold text-slate-100">Delete study session?</h2><p id="delete-study-session-description" className="mt-1 text-sm leading-relaxed text-slate-400">This permanently deletes the session and all completion logs associated with it.</p></div><button type="button" disabled={saving} onClick={onCancel} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] disabled:opacity-50"><X size={17} /></button></div>
      <div className="my-4 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3"><p className="break-words text-sm font-medium text-slate-100">{session.title}</p><p className="mt-1 text-xs text-slate-400">{session.subject ? `${session.subject.name} · ${session.subject.kind === 'lab' ? 'Laboratory' : 'Subject'}` : 'Personal session'}</p><p className="mt-1 text-xs text-slate-500">{schedule}</p></div>
      {error && <p role="alert" className="mb-4 break-words text-sm text-rose-300">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] disabled:opacity-50">Cancel</button><button type="button" disabled={saving} onClick={onConfirm} className="rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-400 disabled:cursor-wait disabled:opacity-50">{saving ? 'Deleting…' : 'Delete Session'}</button></div>
    </section>
  </div>
}
