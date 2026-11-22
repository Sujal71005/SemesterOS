import { useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import type { AssignmentWithSubject } from '../../types/assignments'
import { useDialogFocus } from '../../hooks/useDialogFocus'

type Props = { assignment: AssignmentWithSubject; saving: boolean; error: string | null; onCancel: () => void; onConfirm: () => void }

export default function DeleteAssignmentDialog({ assignment, saving, error, onCancel, onConfirm }: Props) {
  const cancelIfSafe = useCallback(() => { if (!saving) onCancel() }, [onCancel, saving])
  const dialogRef = useDialogFocus<HTMLElement>(cancelIfSafe)
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel() }}>
    <section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="delete-assignment-title" aria-describedby="delete-assignment-description" className="w-full max-w-md rounded-xl border border-white/10 bg-[#101827] p-5 shadow-2xl">
      <h2 id="delete-assignment-title" className="text-lg font-semibold text-slate-100">Delete assignment?</h2>
      <p id="delete-assignment-description" className="mt-2 text-sm leading-6 text-slate-400">“{assignment.title}” will be permanently deleted. This action cannot be undone.</p>
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50">Cancel</button>
        <button type="button" disabled={saving} onClick={onConfirm} className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"><Trash2 size={14}/>{saving ? 'Deleting…' : 'Delete Assignment'}</button>
      </div>
    </section>
  </div>
}
