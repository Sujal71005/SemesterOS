import type { PeriodComparison as PeriodComparisonValues } from '../../utils/periodComparison'

export default function PeriodComparison({ label, values, previousRangeLabel, unit = '', digits = 0 }: {
  label: string
  values: PeriodComparisonValues
  previousRangeLabel: string
  unit?: string
  digits?: number
}) {
  const format = (value: number) => `${value.toFixed(digits)}${unit}`
  const delta = values.absoluteChange
  const noChange = delta === 0
  const bothZero = noChange && values.previous === 0
  const changeText = noChange ? 'No change' : `${delta > 0 ? '+' : ''}${format(delta)}`
  const percentText = values.percentageChange === null
    ? bothZero ? 'both periods were zero' : 'n/a · previous value was zero'
    : `${values.percentageChange > 0 ? '+' : ''}${values.percentageChange.toFixed(1)}%`
  const tone = delta > 0 ? 'text-emerald-200' : delta < 0 ? 'text-rose-200' : 'text-slate-300'
  return <div className="min-w-0 rounded-lg border border-white/[0.055] bg-white/[0.015] p-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><p className="break-words text-xs font-medium text-slate-300">{label}</p><p className="mt-1 break-words text-[10px] text-slate-500">Previous period · {previousRangeLabel}</p></div>
      <p className={`min-w-0 max-w-full break-words text-xs font-semibold tabular-nums ${tone}`}><span>{changeText}</span>{' '}<span className="font-normal text-slate-500">({percentText})</span></p>
    </div>
    <div className="mt-3 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 border-t border-white/[0.05] pt-3">
      <div className="min-w-0"><p className="break-words text-[10px] text-slate-500">Selected period</p><p className="mt-1 break-words text-sm font-semibold tabular-nums text-white">{format(values.current)}</p></div>
      <div className="min-w-0"><p className="break-words text-[10px] text-slate-500">Previous period</p><p className="mt-1 break-words text-sm font-semibold tabular-nums text-slate-300">{format(values.previous)}</p></div>
    </div>
  </div>
}
