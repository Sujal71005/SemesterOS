import type { ReactNode } from 'react'
import SectionCard from '../common/SectionCard'

type AnalyticsSectionProps = {
  title: string
  loading: boolean
  error?: string
  children: ReactNode
}

export function AnalyticsSection({ title, loading, error, children }: AnalyticsSectionProps) {
  return (
    <SectionCard title={title} className="min-w-0">
      {loading ? <p role="status" className="text-sm text-slate-500">Loading {title.toLocaleLowerCase()}…</p>
        : error ? <div role="alert" className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] p-3 text-sm text-rose-200"><p className="font-medium">This section is unavailable.</p><p className="mt-1 text-xs text-rose-200/70">{error}</p></div>
          : children}
    </SectionCard>
  )
}

export function ComingNext({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-lg border border-dashed border-white/[0.09] px-3 py-3 text-xs text-slate-500">{children} analytics coming next.</div>
}
