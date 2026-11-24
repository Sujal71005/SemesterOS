import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import type { CreateDailyGoalInput, DailyGoal, DailyGoalCategory, DailyGoalPriority, UpdateDailyGoalInput } from '../../types/dailyGoals'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { getTodayLocalDate } from '../../utils/dailyGoalDates'
import {
  validateDailyGoalCategory,
  validateDailyGoalDate,
  validateDailyGoalDescription,
  validateDailyGoalPriority,
  validateDailyGoalTitle,
} from '../../utils/dailyGoalValidation'

type Field = 'title' | 'description' | 'goal_date' | 'category' | 'priority'
type FormInput = CreateDailyGoalInput | UpdateDailyGoalInput
type Props = {
  goal?: DailyGoal
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (input: FormInput) => Promise<void>
}

const categories: { value: DailyGoalCategory; label: string }[] = [
  { value: 'academics', label: 'Academics' }, { value: 'dsa', label: 'DSA' }, { value: 'coding', label: 'Coding' },
  { value: 'placement', label: 'Placement' }, { value: 'skills', label: 'Skills' }, { value: 'personal', label: 'Personal' }, { value: 'other', label: 'Other' },
]
const priorities: { value: DailyGoalPriority; label: string }[] = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' },
]
const inputClass = 'mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-400/50'

export default function DailyGoalFormModal({ goal, saving, error, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [goalDate, setGoalDate] = useState(goal?.goal_date ?? getTodayLocalDate())
  const [category, setCategory] = useState<DailyGoalCategory>(goal?.category ?? 'academics')
  const [priority, setPriority] = useState<DailyGoalPriority>(goal?.priority ?? 'medium')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const closeIfSafe = useCallback(() => { if (!saving) onClose() }, [onClose, saving])
  const dialogRef = useDialogFocus<HTMLElement>(closeIfSafe)
  const setFieldError = (field: Field) => setFieldErrors((current) => ({ ...current, [field]: undefined }))

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSubmitError(null)
    const nextErrors: Partial<Record<Field, string>> = {}
    let cleanTitle = ''
    let cleanDescription = ''
    let cleanDate = ''
    try { cleanTitle = validateDailyGoalTitle(title) } catch (cause) { nextErrors.title = cause instanceof Error ? cause.message : 'Enter a valid goal title.' }
    try { cleanDescription = validateDailyGoalDescription(description) } catch (cause) { nextErrors.description = cause instanceof Error ? cause.message : 'Enter a valid description.' }
    try { cleanDate = validateDailyGoalDate(goalDate) } catch (cause) { nextErrors.goal_date = cause instanceof Error ? cause.message : 'Enter a valid goal date.' }
    try { validateDailyGoalCategory(category) } catch (cause) { nextErrors.category = cause instanceof Error ? cause.message : 'Choose a valid category.' }
    try { validateDailyGoalPriority(priority) } catch (cause) { nextErrors.priority = cause instanceof Error ? cause.message : 'Choose a valid priority.' }
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    try {
      await onSubmit({ title: cleanTitle, description: cleanDescription, goal_date: cleanDate, category, priority })
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not save this goal.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="daily-goal-form-title" className="my-auto max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#101827] p-4 shadow-2xl sm:max-h-[calc(100vh-2.5rem)] sm:max-h-[calc(100dvh-2.5rem)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="daily-goal-form-title" className="text-lg font-semibold text-slate-100">{goal ? 'Edit Goal' : 'Add Goal'}</h2>
            <p className="mt-1 text-sm text-slate-400">{goal ? 'Update this daily goal.' : 'Choose a goal and the day you want to work on it.'}</p>
          </div>
          <button type="button" disabled={saving} onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50"><X size={18} /></button>
        </div>

        <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
          <label className="block text-sm text-slate-300" htmlFor="daily-goal-title">
            Goal title<span className="ml-1 text-rose-300">*</span>
            <input id="daily-goal-title" value={title} onChange={(event) => { setTitle(event.target.value); setFieldError('title') }} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'daily-goal-title-error' : 'daily-goal-title-help'} className={inputClass} />
            {fieldErrors.title ? <span id="daily-goal-title-error" className="mt-1 block text-xs text-rose-300">{fieldErrors.title}</span> : <span id="daily-goal-title-help" className="mt-1 block text-xs text-slate-500">{title.trim().length}/180 characters</span>}
          </label>

          <label className="block text-sm text-slate-300" htmlFor="daily-goal-description">
            Description <span className="text-xs text-slate-500">(optional)</span>
            <textarea id="daily-goal-description" rows={3} value={description} onChange={(event) => { setDescription(event.target.value); setFieldError('description') }} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? 'daily-goal-description-error' : 'daily-goal-description-help'} className={`${inputClass} resize-y`} />
            {fieldErrors.description ? <span id="daily-goal-description-error" className="mt-1 block text-xs text-rose-300">{fieldErrors.description}</span> : <span id="daily-goal-description-help" className="mt-1 block text-xs text-slate-500">{description.trim().length}/1000 characters</span>}
          </label>

          <label className="block text-sm text-slate-300" htmlFor="daily-goal-date">
            Goal date
            <input id="daily-goal-date" type="date" required value={goalDate} onChange={(event) => { setGoalDate(event.target.value); setFieldError('goal_date') }} aria-invalid={Boolean(fieldErrors.goal_date)} aria-describedby={fieldErrors.goal_date ? 'daily-goal-date-error' : undefined} className={inputClass} />
            {fieldErrors.goal_date && <span id="daily-goal-date-error" className="mt-1 block text-xs text-rose-300">{fieldErrors.goal_date}</span>}
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-300" htmlFor="daily-goal-category">
              Category
              <select id="daily-goal-category" value={category} onChange={(event) => { setCategory(event.target.value as DailyGoalCategory); setFieldError('category') }} aria-invalid={Boolean(fieldErrors.category)} aria-describedby={fieldErrors.category ? 'daily-goal-category-error' : undefined} className={inputClass}>
                {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {fieldErrors.category && <span id="daily-goal-category-error" className="mt-1 block text-xs text-rose-300">{fieldErrors.category}</span>}
            </label>

            <label className="block text-sm text-slate-300" htmlFor="daily-goal-priority">
              Priority
              <select id="daily-goal-priority" value={priority} onChange={(event) => { setPriority(event.target.value as DailyGoalPriority); setFieldError('priority') }} aria-invalid={Boolean(fieldErrors.priority)} aria-describedby={fieldErrors.priority ? 'daily-goal-priority-error' : undefined} className={inputClass}>
                {priorities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {fieldErrors.priority && <span id="daily-goal-priority-error" className="mt-1 block text-xs text-rose-300">{fieldErrors.priority}</span>}
            </label>
          </div>

          {(submitError || error) && <p role="alert" className="break-words text-sm text-rose-300">{submitError ?? error}</p>}
          <div className="grid grid-cols-1 gap-2 pt-2 min-[360px]:flex min-[360px]:justify-end">
            <button type="button" disabled={saving} onClick={onClose} className="min-h-10 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-10 min-w-32 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 disabled:cursor-wait disabled:opacity-50">
              {saving ? 'Saving…' : goal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
