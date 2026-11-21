import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { navigationItems } from '../utils/navigation'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const currentPage = navigationItems.find((item) => item.path === location.pathname)?.label ?? 'Dashboard'
  return (
    <div className={`app-shell ${collapsed ? 'shell-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <div className="main-column"><Header title={currentPage} onMenu={() => setMobileOpen(true)} /><main className="page-content"><Outlet /></main></div>
    </div>
  )
}
