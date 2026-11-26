export type PeriodComparison = { current: number; previous: number; absoluteChange: number; percentageChange: number | null }

/** Calculates signed change; percentage is omitted when a zero baseline makes it undefined. */
export function calculatePeriodComparison(current: number, previous: number): PeriodComparison {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) throw new Error('Comparison values must be finite numbers.')
  const absoluteChange = current - previous
  return { current, previous, absoluteChange, percentageChange: previous === 0 ? null : absoluteChange / Math.abs(previous) * 100 }
}
