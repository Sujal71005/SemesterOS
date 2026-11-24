import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import PlaceholderPage from './pages/PlaceholderPage'
import AcademicsPage from './pages/AcademicsPage'
import SupabaseDiagnosticPage from './pages/SupabaseDiagnosticPage'
import SyllabusPage from './pages/SyllabusPage'
import AssignmentsPage from './pages/AssignmentsPage'
import TimetablePage from './pages/TimetablePage'
import DailyGoalsPage from './pages/DailyGoalsPage'
import { navigationItems } from './utils/navigation'
import { PublicOnly, RequireAuth } from './auth/RouteGuards'
import { ForgotPasswordPage, ResetPasswordPage, SignInPage, SignUpPage } from './pages/AuthPages'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="supabase-diagnostic" element={<SupabaseDiagnosticPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="academics" element={<AcademicsPage />} />
          <Route path="academics/:subjectId/syllabus" element={<SyllabusPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="daily-goals" element={<DailyGoalsPage />} />
          {navigationItems.filter((item) => item.path !== '/' && item.path !== '/academics' && item.path !== '/assignments' && item.path !== '/timetable' && item.path !== '/daily-goals').map((item) => (
            <Route key={item.path} path={item.path.slice(1)} element={<PlaceholderPage title={item.label} />} />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
