import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import type { AssignmentWithSubject, CreateAssignmentInput, UpdateAssignmentInput } from '../../types/assignments'
import type { Subject } from '../../types/academics'
import { localDateTimeToIso, toLocalDateTimeInput } from '../../utils/assignmentDateInput'
import { validateAssignmentTitle, validateAssignmentSubjectId } from '../../utils/assignmentValidation'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import AssignmentDateTimePicker from './AssignmentDateTimePicker'

type Props = {
  subjects: Subject[]
  assignment?: AssignmentWithSubject
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (input: CreateAssignmentInput | UpdateAssignmentInput) => Promise<void>
}

export default function AssignmentFormModal({ subjects, assignment, saving, error, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState(assignment?.title ?? '')
  const [subjectId, setSubjectId] = useState(assignment?.subject_id ?? '')
  const [description, setDescription] = useState(assignment?.description ?? '')
  const [dueAt, setDueAt] = useState(toLocalDateTimeInput(assignment?.due_at ?? null))
  const [validationError, setValidationError] = useState<string | null>(null)

  const closeIfSafe = useCallback(() => { if (!saving) onClose() }, [onClose, saving])
  const dialogRef = useDialogFocus<HTMLElement>(closeIfSafe)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setValidationError(null)
    try {
      const cleanTitle = validateAssignmentTitle(title)
      const cleanSubject = validateAssignmentSubjectId(subjectId)
      const due_at = localDateTimeToIso(dueAt)
      if (assignment) {
        await onSubmit({ title: cleanTitle, subject_id: cleanSubject, description, due_at })
      } else {
        await onSubmit({ title: cleanTitle, subject_id: cleanSubject, description, due_at, status: 'todo' })
      }
    } catch (cause) {
      setValidationError(cause instanceof Error ? cause.message : 'Could not save assignment.')
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="assignment-form-title" className="w-full max-w-xl rounded-xl border border-white/10 bg-[#101827] p-5 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3"><div><h2 id="assignment-form-title" className="text-lg font-semibold text-slate-100">{assignment ? 'Edit Assignment' : 'Add Assignment'}</h2><p className="mt-1 text-sm text-slate-400">{assignment ? 'Update the details and deadline.' : 'Add an academic task to your list.'}</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"><X size={18}/></button></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-300" htmlFor="assignment-title">Assignment title<span className="ml-1 text-rose-300">*</span><input id="assignment-title" autoFocus required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50" aria-describedby="assignment-title-help"/><span id="assignment-title-help" className="mt-1 block text-xs text-slate-500">{title.trim().length}/180 characters</span></label>
        <label className="block text-sm text-slate-300" htmlFor="assignment-subject">Subject or laboratory<span className="ml-1 text-rose-300">*</span><select id="assignment-subject" required value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50"><option value="" disabled>Select a subject or lab</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · {subject.kind === 'lab' ? 'Laboratory' : 'Subject'}</option>)}</select>{subjects.length === 0 && <span className="mt-1 block text-xs text-amber-300">Add a subject or laboratory in Academics first.</span>}</label>
        <label className="block text-sm text-slate-300" htmlFor="assignment-description">Description <span className="text-xs text-slate-500">(optional)</span><textarea id="assignment-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50" /></label>
        <AssignmentDateTimePicker value={dueAt} onChange={setDueAt} disabled={saving} />
        {(validationError || error) && <p role="alert" className="break-words text-sm text-rose-300">{validationError ?? error}</p>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] disabled:opacity-50">Cancel</button><button type="submit" disabled={saving || subjects.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : assignment ? 'Save Changes' : 'Create Assignment'}</button></div>
      </form>
    </section>
  </div>
}
