export default function ProgressBar({ percentage, label }: { percentage: number; label: string }) {
  return <div aria-label={`${label}: ${percentage}%`} className="mt-2"><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="text-slate-300">{percentage}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-blue-400 transition-[width]" style={{ width: `${percentage}%` }}/></div></div>
}
