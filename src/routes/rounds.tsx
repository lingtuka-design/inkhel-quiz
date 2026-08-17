import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RoundCard } from '../components/rounds'
import { EmptyState, Input, Select, SectionHeading } from '../components/ui'
import { listRounds, countParticipants } from '../services/roundService'
import { listAllMonths, monthStatus } from '../services/monthService'
import { setPageTitle } from '../services/shareService'
import { cn } from '../lib/utils'
import { useEffect } from 'react'

import { getParticipant, useCurrentUser } from '../services/authService'

type Filter = 'all' | 'live' | 'closed'

export function RoundsPage() {
  useEffect(() => setPageTitle('Rounds'), [])
  const participant = useCurrentUser()
  const [filter, setFilter] = useState<Filter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: userAttemptsMap } = useQuery({
    queryKey: ['userAttemptsMap', participant?.id, participant?.email, participant?.googleId],
    queryFn: async () => {
      if (!participant?.id && !participant?.email) return {}
      try {
        const params = new URLSearchParams()
        if (participant?.id) params.set('participantId', participant.id)
        if (participant?.email) params.set('email', participant.email)
        if (participant?.googleId) params.set('googleId', participant.googleId)

        const res = await fetch(`/api/attempts?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          const map: Record<string, any> = {}
          if (Array.isArray(data.attempts)) {
            for (const a of data.attempts) {
              map[a.roundId] = a
            }
          }
          return map
        }
      } catch {}
      return {}
    },
    enabled: !!(participant?.id || participant?.email),
  })

  const { data: rounds } = useQuery({
    queryKey: ['rounds'],
    initialData: () =>
      listRounds()
        .filter((r) => r.status !== 'draft')
        .map((r) => ({
          round: r,
          participants: (r as any).participantCount ?? countParticipants(r.id),
        })),
    staleTime: 30000,
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            // Sync with local database so subsequent visits load 0ms with exact participant numbers
            try {
              const { getDb, saveDb } = await import('../db/database')
              const db = getDb()
              for (const r of data) {
                const existing = db.rounds.find((x) => x.id === r.id)
                if (existing) {
                  ;(existing as any).participantCount = r.participantCount || 0
                  ;(existing as any).questionCount = r.questionCount || 0
                }
              }
              saveDb()
            } catch {}

            return data
              .filter((r: any) => r.status !== 'draft')
              .map((r: any) => ({ round: r, participants: r.participantCount || 0 }))
          }
        }
      } catch {}
      return listRounds()
        .filter((r) => r.status !== 'draft')
        .map((r) => ({
          round: r,
          participants: (r as any).participantCount ?? countParticipants(r.id),
        }))
    },
  })

  const { data: months } = useQuery({
    queryKey: ['months'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/seasons')
        if (res.ok) {
          const data = await res.json()
          const allM: any[] = []
          for (const s of data) {
            if (Array.isArray(s.months)) allM.push(...s.months)
          }
          if (allM.length > 0) return allM
        }
      } catch {}
      return listAllMonths()
    },
  })

  const categories = [
    { id: 'all', label: 'All', icon: '✨' },
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'sports', label: 'Sports', icon: '🏆' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'movies', label: 'Movies', icon: '🎬' },
    { id: 'mizoram', label: 'Mizoram', icon: '🏔️' },
    { id: 'gk', label: 'GK', icon: '🧠' },
    { id: 'pop_culture', label: 'Pop Culture', icon: '🎮' },
  ]

  const filtered = useMemo(() => {
    if (!rounds) return []
    return rounds.filter(({ round }) => {
      const month = months?.find((m) => m.id === round.monthId)
      const status = month ? monthStatus(month) : 'completed'
      if (filter === 'live' && (round.status !== 'published' || status !== 'open')) return false
      if (filter === 'closed' && status === 'open') return false
      if (categoryFilter !== 'all') {
        const cat = (round.category || 'football').toLowerCase()
        if (cat !== categoryFilter.toLowerCase()) return false
      }
      if (monthFilter !== 'all' && round.monthId !== monthFilter) return false
      if (search && !round.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [rounds, months, filter, categoryFilter, monthFilter, search])

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="This season's battles"
        title="Rounds"
        subtitle="Each round belongs to a month. Play them while the month is open — when the month ends, the round closes."
      />

      {/* Category Pills Bar */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((c) => {
          const count = (rounds ?? []).filter(({ round }) =>
            c.id === 'all' ? true : (round.category || 'football').toLowerCase() === c.id.toLowerCase(),
          ).length
          const active = categoryFilter === c.id

          return (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all',
                active
                  ? 'border-violet-500 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-950/40'
                  : 'border-white/10 bg-white/5 text-ink-300 hover:border-white/20 hover:text-white',
              )}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.2 text-[10px]',
                  active ? 'bg-black/30 text-white' : 'bg-white/10 text-ink-300',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <Input
            className="pl-10"
            placeholder="Search rounds…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="sm:w-36">
          <option value="all" className="bg-ink-800">All Status</option>
          <option value="live" className="bg-ink-800">Open now</option>
          <option value="closed" className="bg-ink-800">Closed</option>
        </Select>
        <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="sm:w-48">
          <option value="all" className="bg-ink-800">All months</option>
          {months?.map((m) => (
            <option key={m.id} value={m.id} className="bg-ink-800">
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No rounds found"
          description="Try a different filter, or wait for next month's rounds."
          action={
            <Link to="/rounds" className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300">
              Reset filters
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ round, participants }) => (
            <RoundCard
              key={round.id}
              round={round}
              month={months?.find((m) => m.id === round.monthId)}
              participantCount={participants}
              questionCount={(round as any).questionCount}
              userAttempt={userAttemptsMap?.[round.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
