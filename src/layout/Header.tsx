import { Bell, Menu, Search } from 'lucide-react'

type HeaderProps = { title: string; onMenu: () => void }

export default function Header({ title, onMenu }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="flex min-w-0 items-center gap-3">
        <button className="icon-button md:hidden" onClick={onMenu} aria-label="Open navigation"><Menu size={19} /></button>
        <span className="hidden text-slate-600 sm:inline">/</span>
        <span className="truncate text-sm font-medium text-slate-300">{title}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button className="search-button" aria-label="Search"><Search size={16} /><span>Search</span><kbd>⌘ K</kbd></button>
        <button className="icon-button relative" aria-label="Notifications"><Bell size={17} /><span className="notification-dot" /></button>
        <div className="ml-1 flex items-center gap-2.5 border-l border-white/[0.08] pl-3 sm:pl-4">
          <div className="avatar">S</div><div className="hidden sm:block"><p className="text-xs font-medium text-slate-200">Student</p><p className="mt-0.5 text-[10px] text-slate-500">Semester VI</p></div>
        </div>
      </div>
    </header>
  )
}
