import type { LucideIcon } from 'lucide-react'

type StatCardProps = { label: string; value: string; detail: string; icon: LucideIcon; tone: 'blue' | 'violet' | 'green' | 'amber' }

export default function StatCard({ label, value, detail, icon: Icon, tone }: StatCardProps) {
  return (
    <div className="panel flex min-h-36 flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`icon-tile tone-${tone}`}><Icon size={17} /></span>
      </div>
      <div>
        <div className="text-[26px] font-semibold tracking-tight text-white">{value}</div>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  )
}
