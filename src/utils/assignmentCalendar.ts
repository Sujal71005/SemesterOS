export type CalendarCell = { date: Date; inMonth: boolean; key: string }
export type PopoverPlacement = { side: 'above' | 'below'; maxHeight: number; top: number }

export function calculatePopoverPlacement(anchor: { top: number; bottom: number }, popoverHeight: number, viewportHeight: number, gap = 8, padding = 12): PopoverPlacement {
  const below = Math.max(0, viewportHeight - padding - anchor.bottom - gap)
  const above = Math.max(0, anchor.top - padding - gap)
  const side = below >= popoverHeight || below >= above ? 'below' : 'above'
  const available = side === 'below' ? below : above
  return { side, maxHeight: Math.max(120, Math.min(popoverHeight, available)), top: side === 'below' ? anchor.bottom + gap : Math.max(padding, anchor.top - gap) }
}

export function calendarCells(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return { date, inMonth: date.getMonth() === month, key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` }
  })
}

export function combineLocalDateTime(dateValue: string, hour: number, minute: number): string {
  const date = new Date(`${dateValue}T00:00:00`)
  if (!dateValue || !Number.isFinite(date.getTime()) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error('Choose a valid deadline date and time.')
  }
  date.setHours(hour, minute, 0, 0)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function splitLocalDateTime(value: string): { date: string; hour: number; minute: number } | null {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, hour: date.getHours(), minute: date.getMinutes() }
}
