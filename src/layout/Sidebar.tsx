import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navigationItems } from '../utils/navigation'

type SidebarProps = { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onNavigate: () => void }

export default function Sidebar({ collapsed, onToggle, mobileOpen, onNavigate }: SidebarProps) {
  return (
    <>
      {mobileOpen && <button aria-label="Close navigation" className="sidebar-backdrop" onClick={onNavigate} />}
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.06] px-5">
          <div className="brand-mark"><span>S</span></div>
          {!collapsed && <div className="min-w-0"><p className="text-[15px] font-semibold tracking-tight text-white">Semester<span className="text-blue-400">OS</span></p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">Student workspace</p></div>}
        </div>
        <div className="px-3 pt-7">
          {!collapsed && <p className="nav-caption">Workspace</p>}
          <nav className="mt-2 space-y-1" aria-label="Main navigation">
            {navigationItems.map(({ label, path, icon: Icon }) => (
              <NavLink key={path} to={path} end={path === '/'} title={collapsed ? label : undefined} onClick={onNavigate} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                <Icon size={18} strokeWidth={1.8} /><span className="nav-label">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-3 max-md:hidden">
          <button onClick={onToggle} className="nav-link w-full text-slate-500 hover:text-slate-200" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span className="nav-label">Collapse sidebar</span>
          </button>
        </div>
      </aside>
    </>
  )
}
