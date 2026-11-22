import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { calculatePopoverPlacement, calendarCells, combineLocalDateTime, splitLocalDateTime } from '../../utils/assignmentCalendar'

type Props = { value: string; onChange: (value: string) => void; disabled?: boolean }
const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const pad = (value: number) => String(value).padStart(2, '0')

export default function AssignmentDateTimePicker({ value, onChange, disabled = false }: Props) {
  const selected = splitLocalDateTime(value)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => { const d = selected ? new Date(`${selected.date}T00:00:00`) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [activeDate, setActiveDate] = useState(selected?.date ?? '')
  const [hour, setHour] = useState(selected?.hour ?? 9)
  const [minute, setMinute] = useState(selected?.minute ?? 0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dateRefs = useRef<Array<HTMLButtonElement | null>>([])
  const popoverRef = useRef<HTMLElement>(null)
  const [placement, setPlacement] = useState({ side: 'below' as 'above' | 'below', maxHeight: 560 })

  useEffect(() => {
    const parsed = splitLocalDateTime(value)
    if (parsed) {
      setActiveDate(parsed.date); setHour(parsed.hour); setMinute(parsed.minute)
      setView(new Date(Number(parsed.date.slice(0, 4)), Number(parsed.date.slice(5, 7)) - 1, 1))
    } else setActiveDate('')
  }, [value])
  useEffect(() => {
    if (!open) return
    let frame = 0
    const reposition = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const anchor = triggerRef.current?.getBoundingClientRect()
        const popover = popoverRef.current
        if (!anchor || !popover) return
        const result = calculatePopoverPlacement(anchor, popover.scrollHeight, window.innerHeight)
        setPlacement({ side: result.side, maxHeight: result.maxHeight })
      })
    }
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    const observer = popoverRef.current ? new ResizeObserver(reposition) : null
    if (popoverRef.current && observer) observer.observe(popoverRef.current)
    reposition()
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])

  const commit = (date: string, nextHour = hour, nextMinute = minute) => onChange(combineLocalDateTime(date, nextHour, nextMinute))
  const displayed = selected ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Choose date and time'
  const cells = calendarCells(view.getFullYear(), view.getMonth())
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(view)

  return <div ref={rootRef} className="relative">
    <span id="assignment-due-label" className="mb-1.5 block text-sm text-slate-300">Due date and time <span className="text-xs text-slate-500">(optional)</span></span>
    <button ref={triggerRef} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-labelledby="assignment-due-label" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-left text-sm text-slate-100 transition hover:border-blue-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50"><span className={`min-w-0 truncate ${selected ? 'text-slate-100' : 'text-slate-500'}`}>{displayed}</span><CalendarDays size={16} className="shrink-0 text-blue-300"/></button>
    <p className="mt-1 text-xs text-slate-500">Leave empty if there is no deadline. Time is shown in your local timezone.</p>
    {open && <section ref={popoverRef} role="dialog" aria-modal="false" aria-labelledby="assignment-calendar-heading" style={{ maxHeight: `min(${placement.maxHeight}px, calc(100dvh - 24px))` }} className={`absolute left-0 z-[60] flex w-[min(21rem,calc(100vw-2rem))] flex-col overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#111a29] p-4 shadow-2xl shadow-black/50 sm:w-[22rem] ${placement.side === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
      <div className="mb-3 flex items-center justify-between gap-2"><h3 id="assignment-calendar-heading" className="text-sm font-semibold text-slate-100">Choose deadline</h3><div className="flex gap-1"><button type="button" onClick={() => setView((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} aria-label="Previous month" className="rounded-md p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"><ChevronLeft size={16}/></button><button type="button" onClick={() => setView((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} aria-label="Next month" className="rounded-md p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"><ChevronRight size={16}/></button></div></div>
      <div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium text-slate-300" aria-live="polite">{monthLabel}</p><div className="flex gap-2"><button type="button" onClick={() => { const d = new Date(); const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; setView(new Date(d.getFullYear(), d.getMonth(), 1)); setActiveDate(key); commit(key) }} className="text-xs text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:underline">Today</button><button type="button" onClick={() => { setActiveDate(''); onChange(''); setOpen(false); triggerRef.current?.focus() }} className="text-xs text-slate-400 hover:text-white focus-visible:outline-none focus-visible:underline">Clear</button></div></div>
      <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-1 text-center">{weekdays.map((day) => <span key={day} role="columnheader" className="py-1 text-[10px] font-medium text-slate-500">{day}</span>)}{cells.map(({ date, inMonth, key }, index) => {
        const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        const selectedDay = activeDate === iso
        const isToday = todayKey === `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        return <button key={key} ref={(element) => { dateRefs.current[index] = element }} type="button" role="gridcell" aria-selected={selectedDay} aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)} tabIndex={activeDate === iso || (!activeDate && isToday) ? 0 : -1} onFocus={() => setActiveDate(iso)} onClick={() => { setActiveDate(iso); commit(iso) }} onKeyDown={(event) => {
          const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -7 : event.key === 'ArrowDown' ? 7 : 0
          if (offset) { event.preventDefault(); const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset); const nextIso = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`; setActiveDate(nextIso); setView(new Date(next.getFullYear(), next.getMonth(), 1)); requestAnimationFrame(() => dateRefs.current.find((button) => button?.getAttribute('aria-label') === new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(next))?.focus()) }
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); commit(iso) }
        }} className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 ${selectedDay ? 'bg-blue-500 font-semibold text-white' : isToday ? 'border border-blue-400/50 text-blue-200' : inMonth ? 'text-slate-300 hover:bg-white/[0.07]' : 'text-slate-600 hover:bg-white/[0.04]'}`}>{date.getDate()}</button>
      })}</div>
      <div className="mt-4 border-t border-white/[0.07] pt-3"><p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300"><Clock3 size={14} className="text-blue-300"/>Time</p><div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-slate-500">Hour<select aria-label="Hour" value={hour} onChange={(event) => { const next = Number(event.target.value); setHour(next); if (activeDate) commit(activeDate, next, minute) }} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none">{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{pad(i)}</option>)}</select></label><label className="text-[10px] text-slate-500">Minute<select aria-label="Minute" value={minute} onChange={(event) => { const next = Number(event.target.value); setMinute(next); if (activeDate) commit(activeDate, hour, next) }} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-sm text-slate-100 focus:border-blue-400/50 focus:outline-none">{Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{pad(i)}</option>)}</select></label></div></div>
    </section>}
  </div>
}
