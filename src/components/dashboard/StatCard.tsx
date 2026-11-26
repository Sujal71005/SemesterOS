import type { LucideIcon } from 'lucide-react'

type StatCardProps = { label: string; value: string; detail: string; icon: LucideIcon; tone: 'blue' | 'violet' | 'green' | 'amber'; allowTextWrap?: boolean }

export default function StatCard({ label, value, detail, icon: Icon, tone, allowTextWrap = false }: StatCardProps) {
  return (
    <div className={`panel flex min-h-36 flex-col justify-between ${allowTextWrap ? 'min-w-0' : ''}`}>
      <div className={`flex justify-between ${allowTextWrap ? 'min-w-0 items-start gap-2' : 'items-center'}`}>
        <span className={`${allowTextWrap ? 'min-w-0 break-words ' : ''}text-sm text-slate-400`}>{label}</span>
        <span className={`icon-tile ${allowTextWrap ? 'shrink-0 ' : ''}tone-${tone}`}><Icon size={17} /></span>
      </div>
      <div className={allowTextWrap ? 'min-w-0 max-w-full' : ''}>
        <div className={`${allowTextWrap ? 'break-words ' : ''}text-[26px] font-semibold tracking-tight text-white`}>{value}</div>
        <p className={`${allowTextWrap ? 'break-words ' : ''}mt-1 text-xs text-slate-500`}>{detail}</p>
      </div>
    </div>
  )
}
