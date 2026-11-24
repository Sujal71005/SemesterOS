import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, Clock3, LoaderCircle, SkipForward } from 'lucide-react'
import type { SessionLogStatus, StudySessionOccurrence } from '../../types/studyPlanner'

type Props = {
  occurrence: StudySessionOccurrence
  saving: boolean
  error: string | null
  compact?: boolean
  onChange: (status: SessionLogStatus) => void
}

export default function SessionCompletionControl({ occurrence, saving, error, compact = false, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const status = occurrence.log?.status ?? 'planned'
  const label = status === 'completed' ? 'Completed' : status === 'skipped' ? 'Skipped' : 'Pending'
  const Icon = status === 'completed' ? CheckCircle2 : status === 'skipped' ? SkipForward : Clock3
  const tone = status === 'completed' ? 'text-emerald-300' : status === 'skipped' ? 'text-slate-400' : 'text-amber-200'
  const statusOptions: { value: SessionLogStatus; label: string }[] = [
    { value: 'planned', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'skipped', label: 'Skipped' },
  ]

  useEffect(() => {
    if (!compact || !menuOpen) return
    const closeFromOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        rootRef.current?.querySelector<HTMLButtonElement>('[aria-expanded]')?.focus()
      }
    }
    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [compact, menuOpen])

  if (compact) return <div ref={rootRef} className="relative inline-flex shrink-0">
    <button type="button" aria-label={`Change status for ${occurrence.session.title} on ${occurrence.occurrence_date}; current status ${label}`} title={`Change status: ${label}`} aria-expanded={menuOpen} aria-controls={`occurrence-status-menu-${occurrence.session.id}-${occurrence.occurrence_date}`} disabled={saving} onClick={() => setMenuOpen((open) => !open)} className={`relative grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-slate-950/50 ${tone} hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 disabled:cursor-wait disabled:opacity-50`}>
      {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Icon size={14} />}
      <span className="sr-only">{label}</span>
      <ChevronDown size={9} className="absolute bottom-0 right-0 rounded-full bg-slate-950" />
    </button>
    <div id={`occurrence-status-menu-${occurrence.session.id}-${occurrence.occurrence_date}`} role="group" aria-label={`Choose status for ${occurrence.session.title}`} className={`${menuOpen ? 'absolute right-0 top-full z-[100] mt-1 min-w-[142px] rounded-lg border border-white/10 bg-slate-950 p-1.5 shadow-xl shadow-black/40' : 'hidden'}`}>
      {statusOptions.map((option) => <button key={option.value} type="button" aria-pressed={status === option.value} disabled={saving} onClick={() => { rootRef.current?.querySelector<HTMLButtonElement>('[aria-expanded]')?.focus(); setMenuOpen(false); if (status !== option.value) onChange(option.value) }} className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 disabled:opacity-50 ${status === option.value ? 'bg-white/[0.05] text-slate-100' : 'text-slate-300'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${option.value === 'completed' ? 'bg-emerald-300' : option.value === 'skipped' ? 'bg-slate-400' : 'bg-amber-200'}`} />{option.label}{status === option.value && <span className="ml-auto text-[10px] text-slate-500">Current</span>}
      </button>)}
    </div>
    {saving && <span role="status" className="sr-only">Saving status</span>}
    {error && <span role="alert" className="absolute left-0 top-full z-[110] mt-1 w-max max-w-[220px] rounded-md border border-rose-400/25 bg-slate-950 px-2 py-1.5 text-[11px] text-rose-300 shadow-lg">{error}</span>}
  </div>

  return <div className={`flex min-w-0 ${compact ? 'flex-col items-stretch gap-1' : 'flex-wrap items-center gap-2'}`}>
    <span className={`inline-flex min-w-0 items-center gap-1 text-xs ${tone}`}><Icon size={compact ? 13 : 14} />{label}</span>
    <label className="sr-only" htmlFor={`occurrence-status-${occurrence.session.id}-${occurrence.occurrence_date}`}>Status for {occurrence.session.title} on {occurrence.occurrence_date}</label>
    <select id={`occurrence-status-${occurrence.session.id}-${occurrence.occurrence_date}`} value={status} disabled={saving} onChange={(event) => onChange(event.target.value as SessionLogStatus)} className="min-h-9 w-full min-w-0 rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:cursor-wait disabled:opacity-50">
      <option value="planned">Pending</option><option value="completed">Completed</option><option value="skipped">Skipped</option>
    </select>
    {saving && <span role="status" className="inline-flex items-center gap-1 text-[10px] text-slate-400"><LoaderCircle size={12} className="animate-spin" />Saving</span>}
    {error && <p role="alert" className="basis-full text-[11px] text-rose-300">{error}</p>}
  </div>
}
