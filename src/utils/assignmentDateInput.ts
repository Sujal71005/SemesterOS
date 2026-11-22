/** Convert an ISO instant to a datetime-local value using the browser's local timezone. */
export function toLocalDateTimeInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

/** Convert a datetime-local wall time back to its correct UTC instant. */
export function localDateTimeToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid deadline date and time.')
  return date.toISOString()
}
