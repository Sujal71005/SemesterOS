import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { AssignmentStatus } from '../../types/assignments'
import { formatAssignmentStatus } from '../../utils/assignmentDates'

type Props = { status: AssignmentStatus; disabled?: boolean; onChange: (status: AssignmentStatus) => void }
const options: AssignmentStatus[] = ['todo', 'in_progress', 'submitted', 'done']
const styles: Record<AssignmentStatus, { dot: string; trigger: string; selected: string }> = {
  todo: { dot: 'bg-amber-300', trigger: 'border-amber-400/25 bg-amber-400/[0.09] text-amber-100', selected: 'bg-amber-400/[0.1] text-amber-100' },
  in_progress: { dot: 'bg-blue-300', trigger: 'border-blue-400/25 bg-blue-400/[0.09] text-blue-100', selected: 'bg-blue-400/[0.1] text-blue-100' },
  submitted: { dot: 'bg-purple-300', trigger: 'border-purple-400/25 bg-purple-400/[0.09] text-purple-100', selected: 'bg-purple-400/[0.1] text-purple-100' },
  done: { dot: 'bg-emerald-300', trigger: 'border-emerald-400/25 bg-emerald-400/[0.09] text-emerald-100', selected: 'bg-emerald-400/[0.1] text-emerald-100' },
}

export default function AssignmentStatusSelect({ status, disabled = false, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(options.indexOf(status))
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    optionRefs.current[activeIndex]?.focus()
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, activeIndex])

  useEffect(() => { if (disabled) setOpen(false) }, [disabled])

  const select = (next: AssignmentStatus) => {
    if (disabled) return
    setOpen(false)
    buttonRef.current?.focus()
    if (next !== status) onChange(next)
  }

  const move = (offset: number) => setActiveIndex((index) => (index + offset + options.length) % options.length)

  return <div ref={rootRef} className="relative">
    <button ref={buttonRef} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={`Status: ${formatAssignmentStatus(status)}`} onClick={() => { setActiveIndex(options.indexOf(status)); setOpen((value) => !value) }} onKeyDown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActiveIndex(options.indexOf(status)) }
    }} className={`inline-flex min-w-[126px] items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:cursor-wait disabled:opacity-60 ${styles[status].trigger}`}>
      <span className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${styles[status].dot}`} />{formatAssignmentStatus(status)}</span>
      <ChevronDown aria-hidden="true" size={14} className={`text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div role="listbox" aria-label="Assignment status" className="absolute right-0 top-full z-30 mt-2 w-44 rounded-xl border border-white/10 bg-[#111a29] p-1.5 shadow-xl shadow-black/40" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); buttonRef.current?.focus() }
      else if (event.key === 'ArrowDown') { event.preventDefault(); move(1) }
      else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1) }
      else if (event.key === 'Home') { event.preventDefault(); setActiveIndex(0) }
      else if (event.key === 'End') { event.preventDefault(); setActiveIndex(options.length - 1) }
    }}>
      {options.map((option, index) => <button ref={(element) => { optionRefs.current[index] = element }} key={option} type="button" role="option" disabled={disabled} aria-selected={status === option} tabIndex={activeIndex === index ? 0 : -1} onFocus={() => setActiveIndex(index)} onClick={() => select(option)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${status === option ? styles[option].selected : 'text-slate-300'} hover:bg-white/[0.06] focus-visible:bg-white/[0.07] focus-visible:outline-none disabled:cursor-wait disabled:opacity-60`}>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${styles[option].dot}`} />{formatAssignmentStatus(option)}</span>{status === option && <Check aria-hidden="true" size={14} className="text-current" />}
      </button>)}
    </div>}
  </div>
}
