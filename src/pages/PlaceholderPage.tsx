import { Construction } from 'lucide-react'
import PageHeading from '../components/common/PageHeading'
import SampleBadge from '../components/dashboard/SampleBadge'

type PlaceholderPageProps = { title: string }

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeading eyebrow="SemesterOS / Workspace" title={title} description="Your workspace for this module is ready to take shape." />
      <div className="panel flex min-h-[280px] flex-col items-center justify-center text-center">
        <div className="icon-tile tone-blue mb-4 h-12 w-12"><Construction size={21} /></div>
        <h2 className="text-base font-semibold text-slate-100">Coming into focus</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">This module is a placeholder in Phase 1. Its real data and workflows will be added in a later phase.</p>
        <div className="mt-4"><SampleBadge /></div>
      </div>
    </div>
  )
}
