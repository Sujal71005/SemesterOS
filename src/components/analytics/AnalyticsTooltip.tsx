import type { ComponentProps, ReactNode } from 'react'
import { Tooltip } from 'recharts'
import { chartColors } from './chartTheme'

type Props = ComponentProps<typeof Tooltip>

function renderAnalyticsTooltip({ active, label, payload, labelFormatter, formatter, separator = ' : ' }: Props): ReactNode {
  const entries = (payload ?? []).filter((item) => !item.hide && item.value !== null && item.value !== undefined)
  if (!active || entries.length === 0) return null

  const rawHeading = labelFormatter ? labelFormatter(label, entries) : label
  const isPie = entries[0]?.chartType === 'pie'
  const heading = rawHeading === null || rawHeading === undefined || rawHeading === ''
    ? (isPie ? entries[0]?.name : undefined)
    : rawHeading

  return <div className="break-words rounded-lg border border-white/10 bg-[#0d1421] px-3 py-2.5 text-xs text-slate-200 shadow-xl [overflow-wrap:anywhere]" style={{ ...chartColors.tooltip, maxWidth: 'min(320px, calc(100vw - 32px))', boxSizing: 'border-box' }}>
    {heading !== undefined && heading !== null && <p className="mb-2 break-words border-b border-white/[0.08] pb-2 font-semibold text-slate-100 [overflow-wrap:anywhere]">{heading}</p>}
    <ul className="space-y-1.5">
      {entries.map((entry, index) => {
        const entryName = entry.name ?? entry.dataKey ?? 'Value'
        const formatted = (entry.formatter ?? formatter)?.(entry.value ?? '', entryName, entry, index, entries)
        const value: ReactNode = Array.isArray(formatted) ? formatted[0] : formatted ?? entry.value
        const formattedName = Array.isArray(formatted) ? formatted[1] : entryName
        const displayName = isPie && String(formattedName) === String(heading) ? 'Count' : formattedName
        const color = entry.color ?? entry.stroke ?? chartColors.tooltipItem.color

        return <li key={`${String(entry.dataKey ?? entry.name ?? 'value')}-${index}`} className="flex min-w-0 items-start gap-2">
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="min-w-0 flex-1 break-words text-slate-300 [overflow-wrap:anywhere]">{displayName}{separator}</span>
          <span className="min-w-0 break-words text-right font-medium text-slate-100 [overflow-wrap:anywhere]">{value}</span>
        </li>
      })}
    </ul>
  </div>
}

/** Shared payload-driven tooltip for every Analytics chart. */
export default function AnalyticsTooltip(props: Props) {
  return <Tooltip
    {...props}
    content={renderAnalyticsTooltip}
    trigger="hover"
    shared={props.shared ?? true}
    contentStyle={{ ...props.contentStyle, ...chartColors.tooltip }}
    labelStyle={{ ...props.labelStyle, ...chartColors.tooltipLabel }}
    itemStyle={{ ...props.itemStyle, ...chartColors.tooltipItem }}
    wrapperStyle={{ zIndex: 20, pointerEvents: 'none', ...props.wrapperStyle }}
  />
}
