import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

type FrameProps = { title: string; description: string; children: ReactNode; footer?: ReactNode }

function Frame({ title, description, children, footer }: FrameProps) {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#080d17] px-4 py-10 text-slate-200 sm:px-6">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(49,99,177,.2),transparent_55%)]" />
    <section className="relative w-full max-w-[440px]">
      <Link to="/sign-in" className="mb-7 inline-flex items-center gap-3 text-sm font-semibold tracking-tight text-white"><span className="brand-mark"><span>S</span></span><span>Semester<span className="text-blue-400">OS</span></span></Link>
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d1421]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,.38)] sm:p-8">
        <p className="eyebrow mb-2">Your student workspace</p><h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        <div className="mt-7">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>}
      <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-600"><ShieldCheck size={14} />Protected with Supabase authentication</p>
    </section>
  </main>
}

function ConfigWarning() {
  const { configured } = useAuth()
  return configured ? null : <div role="alert" className="mb-5 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-3.5 py-3 text-sm leading-5 text-amber-200">Authentication is unavailable because Supabase is not configured. Set the Vite Supabase URL and publishable key, then restart the app.</div>
}

function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div role={error ? 'alert' : 'status'} className={`mb-5 rounded-lg border px-3.5 py-3 text-sm leading-5 ${error ? 'border-rose-400/20 bg-rose-400/[0.07] text-rose-200' : 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200'}`}>{children}</div>
}

function Field({ id, label, type, value, onChange, autoComplete, minLength }: { id: string; label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string; minLength?: number }) {
  const Icon = type === 'password' ? LockKeyhole : Mail
  return <label htmlFor={id} className="block"><span className="mb-2 block text-xs font-medium text-slate-300">{label}</span><span className="relative block"><Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input id={id} type={type} required minLength={minLength} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-white/[0.09] bg-[#080d17] py-3 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10" /></span></label>
}

function Submit({ children, pending, disabled }: { children: ReactNode; pending: boolean; disabled?: boolean }) {
  return <button type="submit" disabled={pending || disabled} className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300/20 bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-blue-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{pending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Please wait…</> : <>{children}<ArrowRight size={16} /></>}</button>
}

function destination(state: unknown) {
  const from = (state as { from?: { pathname: string; search: string; hash: string } } | null)?.from
  return from ? `${from.pathname}${from.search}${from.hash}` : '/'
}

export function SignInPage() {
  const { configured, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { sessionError?: string } | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(state?.sessionError ?? '')
  const [notice, setNotice] = useState(new URLSearchParams(location.search).has('confirmed') ? 'Email confirmed. You can sign in now.' : '')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); setPending(true)
    try { const result = await signIn(email.trim(), password); if (result.error) setError(result.error); else navigate(destination(location.state), { replace: true }) }
    catch { setError('Could not reach Supabase. Check your connection and try again.') }
    finally { setPending(false) }
  }
  return <Frame title="Welcome back" description="Sign in to continue to your personal SemesterOS workspace." footer={<>New to SemesterOS? <Link className="font-medium text-blue-300 hover:text-blue-200" to="/sign-up" state={location.state}>Create an account</Link></>}>
    <ConfigWarning />{notice && <Notice>{notice}</Notice>}{error && <Notice error>{error}</Notice>}
    <form onSubmit={submit} className="space-y-4"><Field id="email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" /><Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" /><div className="-mt-1 flex justify-end"><Link to="/forgot-password" className="text-xs font-medium text-blue-300 hover:text-blue-200">Forgot password?</Link></div><Submit pending={pending} disabled={!configured}>Sign in</Submit></form>
  </Frame>
}

export function SignUpPage() {
  const { configured, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(''); const [confirmation, setConfirmation] = useState(false); const [pending, setPending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setPending(true)
    try { const result = await signUp(email.trim(), password, destination(location.state)); if (result.error) setError(result.error); else if (result.requiresEmailConfirmation) setConfirmation(true); else navigate(destination(location.state), { replace: true }) }
    catch { setError('Could not reach Supabase. Check your connection and try again.') }
    finally { setPending(false) }
  }
  return <Frame title="Create your account" description="Use your email to set up a private student workspace." footer={<>Already have an account? <Link className="font-medium text-blue-300 hover:text-blue-200" to="/sign-in" state={location.state}>Sign in</Link></>}>
    <ConfigWarning />{confirmation && <Notice>Check your inbox to confirm your email. You can sign in after confirming your account.</Notice>}{error && <Notice error>{error}</Notice>}
    {!confirmation && <form onSubmit={submit} className="space-y-4"><Field id="email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" /><Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} /><Field id="confirm-password" label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={6} /><p className="text-[11px] leading-5 text-slate-500">Use at least 6 characters. Supabase may require additional password strength.</p><Submit pending={pending} disabled={!configured}>Create account</Submit></form>}
    {confirmation && <Link to="/sign-in" className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-blue-300 hover:text-blue-200"><ArrowLeft size={15} />Back to sign in</Link>}
  </Frame>
}

export function ForgotPasswordPage() {
  const { configured, sendPasswordReset } = useAuth()
  const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [sent, setSent] = useState(false); const [pending, setPending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setPending(true)
    try { const result = await sendPasswordReset(email.trim()); if (result.error) setError(result.error); else setSent(true) }
    catch { setError('Could not reach Supabase. Check your connection and try again.') }
    finally { setPending(false) }
  }
  return <Frame title="Reset your password" description="We’ll send a recovery link if an account matches that email." footer={<Link className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200" to="/sign-in"><ArrowLeft size={15} />Back to sign in</Link>}>
    <ConfigWarning />{sent && <Notice>If an account matches that address, a password reset link is on its way. Check your inbox.</Notice>}{error && <Notice error>{error}</Notice>}
    {!sent && <form onSubmit={submit} className="space-y-5"><Field id="email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" /><Submit pending={pending} disabled={!configured}>Send recovery link</Submit></form>}
  </Frame>
}

export function ResetPasswordPage() {
  const { configured, recoveryMode, session, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState(false); const [pending, setPending] = useState(false)
  const hasRecoverySession = Boolean(session && recoveryMode)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setPending(true)
    try { const result = await updatePassword(password); if (result.error) setError(result.error); else setSuccess(true) }
    catch { setError('Could not reach Supabase. Check your connection and try again.') }
    finally { setPending(false) }
  }
  return <Frame title="Choose a new password" description="Use the recovery link from your email to securely update your password." footer={<Link className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200" to="/sign-in"><ArrowLeft size={15} />Back to sign in</Link>}>
    <ConfigWarning />
    {success && <><Notice>Your password has been updated.</Notice><button type="button" onClick={() => navigate('/', { replace: true })} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400">Continue to SemesterOS<Check size={16} /></button></>}
    {!success && !hasRecoverySession && <><Notice error>This recovery link is missing, expired, or invalid. Request a new reset link to continue.</Notice><Link to="/forgot-password" className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400">Request another link<ArrowRight size={16} /></Link></>}
    {!success && hasRecoverySession && <>{error && <Notice error>{error}</Notice>}<form onSubmit={submit} className="space-y-4"><Field id="password" label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={6} /><Field id="confirm-password" label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={6} /><p className="text-[11px] leading-5 text-slate-500">Choose at least 6 characters and meet any additional Supabase password requirements.</p><Submit pending={pending} disabled={!configured}><KeyRound size={15} />Update password</Submit></form></>}
  </Frame>
}
