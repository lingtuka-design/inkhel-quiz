import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RoundCard } from '../components/rounds'
import { EmptyState, Input, Select, SectionHeading } from '../components/ui'
import { listRounds, countParticipants } from '../services/roundService'
import { listAllMonths, monthStatus } from '../services/monthService'
import { setPageTitle } from '../services/shareService'
import { useEffect } from 'react'

type Filter = 'all' | 'live' | 'closed'

export function RoundsPage() {
  useEffect(() => setPageTitle('Rounds'), [])
  const [filter, setFilter] = useState<Filter>('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: rounds } = useQuery({
    queryKey: ['rounds'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            return data
              .filter((r: any) => r.status !== 'draft')
              .map((r: any) => ({ round: r, participants: r.participantCount || 0 }))
          }
        }
      } catch {}
      return listRounds()
        .filter((r) => r.status !== 'draft')
        .map((r) => ({ round: r, participants: countParticipants(r.id) }))
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

  const filtered = useMemo(() => {
    if (!rounds) return []
    return rounds.filter(({ round }) => {
      const month = months?.find((m) => m.id === round.monthId)
      const status = month ? monthStatus(month) : 'completed'
      if (filter === 'live' && (round.status !== 'published' || status !== 'open')) return false
      if (filter === 'closed' && status === 'open') return false
      if (monthFilter !== 'all' && round.monthId !== monthFilter) return false
      if (search && !round.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [rounds, months, filter, monthFilter, search])

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="This season's battles"
        title="Rounds"
        subtitle="Each round belongs to a month. Play them while the month is open — when the month ends, the round closes."
      />

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
          <option value="all" className="bg-ink-800">All</option>
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
