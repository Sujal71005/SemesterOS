import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

function AuthLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080d17] px-5 text-slate-300">
      <div className="flex items-center gap-3 text-sm"><span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-300" />Restoring your session…</div>
    </main>
  )
}

export function RequireAuth() {
  const { configured, loading, session, sessionError } = useAuth()
  const location = useLocation()
  if (loading) return <AuthLoading />
  if (!configured || !session) {
    return <Navigate to="/sign-in" replace state={{ from: location, sessionError }} />
  }
  return <Outlet />
}

export function PublicOnly() {
  const { loading, session, recoveryMode } = useAuth()
  const location = useLocation()
  if (loading) return <AuthLoading />
  if (session && !recoveryMode) {
    const from = (location.state as { from?: Location } | null)?.from
    const requested = new URLSearchParams(location.search).get('returnTo')
    const safeRequested = requested?.startsWith('/') && !requested.startsWith('//') ? requested : null
    return <Navigate to={from ? `${from.pathname}${from.search}${from.hash}` : safeRequested ?? '/'} replace />
  }
  return <Outlet />
}
