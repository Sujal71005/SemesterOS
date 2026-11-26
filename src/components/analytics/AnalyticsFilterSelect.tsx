export type FilterOption = { value: string; label: string }

export default function AnalyticsFilterSelect({ label, value, options, onChange }: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}) {
  return <label className="flex min-w-0 max-w-full flex-1 flex-col gap-1 break-words text-[10px] text-slate-500">{label}
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-[#111a2a] px-2 text-xs text-slate-200 outline-none focus:border-blue-400/50">
      {options.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
    </select>
  </label>
}
