import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import PlaceholderPage from './pages/PlaceholderPage'
import AcademicsPage from './pages/AcademicsPage'
import SupabaseDiagnosticPage from './pages/SupabaseDiagnosticPage'
import { navigationItems } from './utils/navigation'

export default function App() {
  return (
    <Routes>
      <Route path="/supabase-diagnostic" element={<SupabaseDiagnosticPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="academics" element={<AcademicsPage />} />
        {navigationItems.filter((item) => item.path !== '/' && item.path !== '/academics').map((item) => (
          <Route key={item.path} path={item.path.slice(1)} element={<PlaceholderPage title={item.label} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
