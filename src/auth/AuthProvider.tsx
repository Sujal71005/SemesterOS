import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthResult = { error: string | null; requiresEmailConfirmation?: boolean }
type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  recoveryMode: boolean
  sessionError: string | null
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, returnTo?: string) => Promise<AuthResult>
  sendPasswordReset: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  signOut: () => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyAuthError(error: AuthError | Error | null | undefined): string {
  if (!error) return 'Authentication failed. Please try again.'
  const message = error.message.toLowerCase()
  const code = 'code' in error ? String(error.code ?? '').toLowerCase() : ''

  if (code.includes('invalid_credentials') || message.includes('invalid login credentials')) {
    return 'Email or password is incorrect.'
  }
  if (code.includes('user_already_exists') || code.includes('email_exists') || message.includes('already registered')) {
    return 'An account with this email already exists. Sign in instead.'
  }
  if (code.includes('email_not_confirmed') || message.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Check your inbox for the confirmation link.'
  }
  if (code.includes('weak_password') || message.includes('password should be')) {
    return 'Choose a stronger password that meets the requirements.'
  }
  if (code.includes('otp_expired') || message.includes('expired')) {
    return 'This link has expired. Request a new password reset email.'
  }
  if (code.includes('rate_limit') || message.includes('rate limit')) {
    return 'Too many attempts. Wait a little and try again.'
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Could not reach Supabase. Check your connection and try again.'
  }
  return 'We could not complete that request. Check your details and try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setLoading(false)
      setSessionError(null)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (event === 'SIGNED_OUT') setRecoveryMode(false)
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setSessionError(friendlyAuthError(error))
      setSession(data.session)
      setLoading(false)
    }).catch(() => {
      if (!mounted) return
      setSessionError('Could not restore your session. Check your connection and reload.')
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured. Add the Vite Supabase URL and publishable key.' }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: friendlyAuthError(error) }
    if (!data.session) return { error: 'Supabase did not return an authenticated session.' }
    setSession(data.session)
    return { error: null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, returnTo?: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured. Add the Vite Supabase URL and publishable key.' }
    const confirmationUrl = new URL('/sign-in?confirmed=1', window.location.origin)
    if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) confirmationUrl.searchParams.set('returnTo', returnTo)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmationUrl.toString() },
    })
    if (error) return { error: friendlyAuthError(error) }
    if (data.session) setSession(data.session)
    return { error: null, requiresEmailConfirmation: !data.session }
  }, [])

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured. Add the Vite Supabase URL and publishable key.' }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error ? friendlyAuthError(error) : null }
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured. Add the Vite Supabase URL and publishable key.' }
    if (!session || !recoveryMode) return { error: 'The recovery session is no longer valid. Request a new reset link.' }
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) return { error: friendlyAuthError(error) }
    if (!data.user) return { error: 'The recovery session is no longer valid. Request a new reset link.' }
    setRecoveryMode(false)
    return { error: null }
  }, [session, recoveryMode])

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.signOut()
    if (error) return { error: friendlyAuthError(error) }
    setSession(null)
    setRecoveryMode(false)
    return { error: null }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    recoveryMode,
    sessionError,
    signIn,
    signUp,
    sendPasswordReset,
    updatePassword,
    signOut,
  }), [loading, session, recoveryMode, sessionError, signIn, signUp, sendPasswordReset, updatePassword, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
