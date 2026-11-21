import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Search } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'

type HeaderProps = { title: string; onMenu: () => void }

export default function Header({ title, onMenu }: HeaderProps) {
  const { user, signOut } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [signOutPending, setSignOutPending] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function dismiss(event: MouseEvent) {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [])

  async function handleSignOut() {
    setSignOutPending(true)
    setSignOutError('')
    try {
      const result = await signOut()
      if (result.error) setSignOutError(result.error)
      else setProfileOpen(false)
    } catch {
      setSignOutError('Could not reach Supabase. Check your connection and try again.')
    } finally {
      setSignOutPending(false)
    }
  }

  const email = user?.email ?? 'Signed in'
  const avatar = (user?.email?.[0] ?? 'S').toUpperCase()

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
        <div className="relative ml-1 border-l border-white/[0.08] pl-3 sm:pl-4" ref={profileRef}>
          <button type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex max-w-[190px] items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-white/[0.04]">
            <div className="avatar">{avatar}</div>
            <span className="hidden min-w-0 sm:block"><span className="block truncate text-xs font-medium text-slate-200">{email}</span><span className="mt-0.5 block text-[10px] text-slate-500">Account</span></span>
            <ChevronDown size={14} className="hidden text-slate-500 sm:block" />
          </button>
          {profileOpen && <div role="menu" className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-xl border border-white/[0.09] bg-[#101827] p-2 shadow-2xl">
            <p className="truncate px-3 py-2 text-xs text-slate-400">{email}</p>
            {signOutError && <p role="alert" className="px-3 pb-2 text-xs text-rose-300">{signOutError}</p>}
            <button role="menuitem" type="button" disabled={signOutPending} onClick={handleSignOut} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"><LogOut size={15} />{signOutPending ? 'Signing out…' : 'Sign out'}</button>
          </div>}
        </div>
      </div>
    </header>
  )
}
