import { useEffect, useState } from 'react'
import { checkSupabaseConnection } from '../lib/supabase'

type DiagnosticState =
  | { status: 'checking' }
  | { status: 'successful'; detail: string }
  | { status: 'failed'; detail: string }

export default function SupabaseDiagnosticPage() {
  const [state, setState] = useState<DiagnosticState>({ status: 'checking' })

  useEffect(() => {
    let active = true

    checkSupabaseConnection().then((result) => {
      if (!active) return

      if (result.connected) {
        setState({ status: 'successful', detail: result.status ? `HTTP ${result.status}` : '' })
        return
      }

      const httpStatus = result.message.match(/HTTP (\d{3})/)
      const detail = httpStatus
        ? `HTTP ${httpStatus[1]}`
        : result.message.includes('not configured')
          ? 'Network error: Supabase is not configured'
          : 'Network error: Could not reach Supabase'

      setState({ status: 'failed', detail })
    })

    return () => {
      active = false
    }
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', color: '#111' }}>
      {state.status === 'checking' && <p>Checking connection</p>}
      {state.status === 'successful' && (
        <>
          <p>Connection successful</p>
          {state.detail && <p>{state.detail}</p>}
        </>
      )}
      {state.status === 'failed' && (
        <>
          <p>Connection failed</p>
          <p>{state.detail}</p>
        </>
      )}
    </main>
  )
}
