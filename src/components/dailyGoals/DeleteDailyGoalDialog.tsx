import { useCallback } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import type { DailyGoal } from '../../types/dailyGoals'
import { useDialogFocus } from '../../hooks/useDialogFocus'

type Props = { goal: DailyGoal; saving: boolean; error: string | null; onCancel: () => void; onConfirm: () => void }

export default function DeleteDailyGoalDialog({ goal, saving, error, onCancel, onConfirm }: Props) {
  const closeIfSafe = useCallback(() => { if (!saving) onCancel() }, [onCancel, saving])
  const dialogRef = useDialogFocus<HTMLElement>(closeIfSafe)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel() }}>
      <section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="delete-daily-goal-title" aria-describedby="delete-daily-goal-description" className="my-auto max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#101827] p-4 shadow-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-rose-400/20 bg-rose-400/[0.08] text-rose-300"><AlertTriangle size={18} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-daily-goal-title" className="text-lg font-semibold text-slate-100">Delete goal?</h2>
            <p id="delete-daily-goal-description" className="mt-1 text-sm leading-relaxed text-slate-400">This permanently deletes this goal. This action cannot be undone.</p>
          </div>
          <button type="button" disabled={saving} onClick={onCancel} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50"><X size={17} aria-hidden="true" /></button>
        </div>
        <div className="my-4 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3">
          <p className="break-words text-sm font-medium text-slate-100">{goal.title}</p>
        </div>
        {error && <p role="alert" className="mb-4 break-words text-sm text-rose-300">{error}</p>}
        <div className="grid grid-cols-1 gap-2 min-[360px]:flex min-[360px]:justify-end">
          <button type="button" disabled={saving} onClick={onCancel} className="min-h-10 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={saving} onClick={onConfirm} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 disabled:cursor-wait disabled:opacity-50">
            <Trash2 size={14} aria-hidden="true" />{saving ? 'Deleting…' : 'Delete Goal'}
          </button>
        </div>
      </section>
    </div>
  )
}
