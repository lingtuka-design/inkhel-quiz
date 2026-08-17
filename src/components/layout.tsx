import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Menu,
  Trophy,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Avatar, Button, toast } from './ui'
import { getParticipant, loginWithGoogle, logoutParticipant, logoutAdmin, subscribeToAuth } from '../services/authService'
import { trackPageView } from '../lib/analyticsTracker'
import { cn } from '../lib/utils'
import type { Participant } from '../types'

export function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
      />
    </svg>
  )
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 rounded-lg p-0.5',
    md: 'h-10 w-10 rounded-xl p-1',
  }
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 ring-1 ring-white/20',
          sizes[size],
        )}
      >
        <img
          src="/logo.svg"
          alt="Inkhel"
          className="h-full w-full object-contain filter drop-shadow scale-110"
          width={size === 'sm' ? 32 : 40}
          height={size === 'sm' ? 32 : 40}
        />
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-white">
        Qu<span className="text-gradient">iz</span>
      </span>
    </span>
  )
}

const NAV = [
  { to: '/rounds', label: 'Rounds', icon: Clapperboard },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [participant, setParticipant] = useState<Participant | null>(() => getParticipant())
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
    trackPageView(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    return subscribeToAuth((p) => {
      setParticipant(p)
    })
  }, [])

  const handleGoogleLogin = async () => {
    try {
      setLoggingIn(true)
      const p = await loginWithGoogle()
      setParticipant(p)
      toast(`Signed in as ${p.displayName}`, 'success')
    } catch (err: any) {
      toast(err.message || 'Google sign in failed', 'error')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await logoutParticipant()
    setParticipant(null)
    toast('Signed out', 'info')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="focus-ring rounded-xl">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'focus-ring rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  location.pathname.startsWith(item.to)
                    ? 'text-white bg-white/8'
                    : 'text-ink-300 hover:text-white hover:bg-white/5',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {participant && participant.provider === 'google' ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 transition-colors hover:border-violet-500/40 hover:bg-white/10"
                  title="View Profile & Prize Details"
                >
                  <Avatar
                    name={participant.displayName}
                    gradient={participant.avatarGradient}
                    photoUrl={participant.photoUrl}
                    size="sm"
                  />
                  <div className="flex flex-col text-left">
                    <span className="max-w-[120px] truncate text-xs font-semibold text-white">
                      {participant.displayName}
                    </span>
                    {!participant.phoneNumber ? (
                      <span className="text-[10px] font-bold text-amber-400">
                        + Add Phone
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink-300">
                        {participant.phoneNumber}
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="focus-ring rounded-full p-1.5 text-ink-300 hover:bg-white/10 hover:text-red-300"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                loading={loggingIn}
                onClick={handleGoogleLogin}
                className="gap-2 border-white/20 bg-white/5 hover:bg-white/10"
              >
                <GoogleIcon className="h-4 w-4" />
                Sign in with Google
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate({ to: '/rounds' })}>
              Play Quiz
            </Button>
          </div>

          <button
            className="focus-ring rounded-lg p-2 text-ink-200 hover:text-white md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/5 bg-ink-900/95 backdrop-blur-xl md:hidden">
            <nav className="mx-auto max-w-6xl space-y-1 px-4 py-4" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-200 hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              {participant && (
                <Link
                  to="/profile"
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20"
                >
                  <span>My Profile & Prize Phone</span>
                  {!participant.phoneNumber && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      Add Phone
                    </span>
                  )}
                </Link>
              )}
              <div className="space-y-2 pt-2">
                {participant && participant.provider === 'google' ? (
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Link to="/profile" className="flex items-center gap-2.5">
                      <Avatar
                        name={participant.displayName}
                        gradient={participant.avatarGradient}
                        photoUrl={participant.photoUrl}
                        size="sm"
                      />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">{participant.displayName}</p>
                        <p className="text-[11px] text-ink-300">{participant.phoneNumber || 'No phone set'}</p>
                      </div>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="focus-ring rounded-lg p-1.5 text-xs text-ink-300 hover:bg-white/10 hover:text-red-300"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={loggingIn}
                    onClick={handleGoogleLogin}
                    className="w-full gap-2 border-white/20 bg-white/5"
                  >
                    <GoogleIcon className="h-4 w-4" />
                    Sign in with Google
                  </Button>
                )}
                <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate({ to: '/rounds' })}>
                  Play Quiz
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
          <Logo size="sm" />
          <p className="text-sm text-ink-300">
            Beat the clock. Own the leaderboard. Every second counts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-300">
            <Link to="/rounds" className="transition-colors hover:text-white">
              Rounds
            </Link>
            <Link to="/leaderboard" className="transition-colors hover:text-white">
              Leaderboard
            </Link>
            <Link to="/seasons" className="transition-colors hover:text-white">
              Seasons
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-xs text-ink-300/70">
          © {new Date().getFullYear()} Inkhel — Competitive Quiz Platform · All rights reserved.
        </div>
      </footer>
    </div>
  )
}

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const handleLogout = () => {
    logoutAdmin()
    navigate({ to: '/admin/login' })
  }

  const items = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/seasons', label: 'Monthly Tournaments', icon: Calendar },
    { to: '/admin/rounds', label: 'Rounds', icon: Clapperboard },
  ]

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-ink-900/60 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-white/5 px-5">
          <Link to="/admin" className="focus-ring rounded-xl">
            <Logo size="sm" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4" aria-label="Admin">
          {items.map((item) => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white border border-violet-500/20'
                    : 'text-ink-300 hover:bg-white/5 hover:text-white border border-transparent',
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="space-y-1 border-t border-white/5 p-4">
          <Link
            to="/"
            className="focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-300 hover:bg-white/5 hover:text-white"
          >
            <Zap className="h-4.5 w-4.5" />
            View Site
          </Link>
          <button
            onClick={handleLogout}
            className="focus-ring flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-300/80 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-ink-950/80 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
          <Link to="/admin" className="focus-ring rounded-xl">
            <Logo size="sm" />
          </Link>
          <button
            className="focus-ring rounded-lg p-2 text-ink-200 hover:text-white"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle admin menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        {menuOpen && (
          <div className="border-b border-white/5 bg-ink-900/95 px-4 py-4 backdrop-blur-xl lg:hidden">
            <nav className="space-y-1" aria-label="Admin mobile">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-200 hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300/80 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </nav>
          </div>
        )}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="focus-ring inline-flex items-center gap-1.5 text-sm font-medium text-ink-300 hover:text-white"
    >
      <ChevronDown className="h-4 w-4 rotate-90" />
      {label}
    </Link>
  )
}
