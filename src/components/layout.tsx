import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import {
  Calendar,
  ChevronDown,
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Menu,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { Avatar, Button } from './ui'
import { getParticipant, logoutAdmin } from '../services/authService'
import { cn } from '../lib/utils'
import type { Participant } from '../types'

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 rounded-xl',
  }
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30',
          sizes[size],
        )}
      >
        <Zap className="h-5 w-5" fill="currentColor" />
      </span>
      <span className="font-display text-xl font-bold tracking-tight text-white">
        Ink<span className="text-gradient">hel</span>
      </span>
    </span>
  )
}

const NAV = [
  { to: '/rounds', label: 'Rounds', icon: Clapperboard },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/seasons', label: 'Seasons', icon: Calendar },
]

export function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [participant, setParticipant] = useState<Participant | null>(() => getParticipant())

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    setParticipant(getParticipant())
  }, [location.pathname])

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
            {participant ? (
              <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-4">
                <Avatar name={participant.displayName} gradient={participant.avatarGradient} size="sm" />
                <span className="text-sm font-semibold text-white">{participant.displayName}</span>
              </div>
            ) : null}
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
              <div className="pt-2">
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
          <div className="flex items-center gap-4 text-sm text-ink-300">
            <Link to="/rounds" className="hover:text-white">
              Rounds
            </Link>
            <Link to="/leaderboard" className="hover:text-white">
              Leaderboard
            </Link>
            <Link to="/seasons" className="hover:text-white">
              Seasons
            </Link>
          </div>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-xs text-ink-300/70">
          © {new Date().getFullYear()} Inkhel — Competitive Quiz Platform
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
    { to: '/admin/seasons', label: 'Seasons', icon: Calendar },
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
