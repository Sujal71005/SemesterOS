import type { ReactNode } from 'react'

type SectionCardProps = { title: string; action?: ReactNode; children: ReactNode; className?: string }

export default function SectionCard({ title, action, children, className = '' }: SectionCardProps) {
  return (
    <section className={`panel ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
