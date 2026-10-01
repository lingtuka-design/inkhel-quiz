import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Medal, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Podium, RankingTable, LeaderboardTable } from '../components/leaderboard'
import { Button, Card, Select, SectionHeading } from '../components/ui'
import { getSeason, listSeasons } from '../services/seasonService'
import { listAllMonths, getCurrentMonth } from '../services/monthService'
import {
  getMonthRanking,
  getSeasonRanking,
  getRoundLeaderboard,
} from '../services/leaderboardService'
import { listRounds, countQuestions } from '../services/roundService'
import { getParticipant } from '../services/authService'
import { setPageTitle } from '../services/shareService'
import { cn } from '../lib/utils'
import { Link, useSearch } from '@tanstack/react-router'

type Tab = 'month' | 'round' | 'alltime'

export function LeaderboardPage() {
  useEffect(() => setPageTitle('Leaderboard'), [])
  const participant = getParticipant()
  const search = useSearch({ strict: false }) as { tab?: Tab; roundId?: string; monthId?: string }
  const [tab, setTab] = useState<Tab>(search?.tab || 'month')

  const { data: currentMonth } = useQuery({ queryKey: ['currentMonth'], queryFn: getCurrentMonth })
  const { data: months } = useQuery({
    queryKey: ['months'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/seasons')
        if (res.ok) {
          const data = await res.json()
          const ms: any[] = []
          for (const s of data) {
            if (Array.isArray(s.months)) ms.push(...s.months)
          }
          if (ms.length > 0) return ms.sort((a: any, b: any) => a.startDate.localeCompare(b.startDate))
        }
      } catch {}
      return listAllMonths().sort((a, b) => a.startDate.localeCompare(b.startDate))
    },
  })
  const { data: rounds } = useQuery({
    queryKey: ['rounds'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            return data.filter((r: any) => r.status !== 'draft')
          }
        }
      } catch {}
      return listRounds().filter((r) => r.status !== 'draft')
    },
  })

  const defaultMonthId = useMemo(() => {
    const now = Date.now()
    if (Array.isArray(months) && months.length > 0) {
      const openMonth = months.find((m: any) => {
        const start = new Date(m.startDate).getTime()
        const end = new Date(m.endDate).getTime()
        return now >= start && now <= end
      })
      if (openMonth) return openMonth.id
    }
    if (currentMonth?.id) return currentMonth.id
    return months?.[0]?.id ?? ''
  }, [currentMonth, months])

  const [monthId, setMonthId] = useState<string>(search?.monthId || '')
  const [roundId, setRoundId] = useState<string>(search?.roundId || '')

  useEffect(() => {
    if (search?.tab) setTab(search.tab)
    if (search?.monthId) setMonthId(search.monthId)
    if (search?.roundId) setRoundId(search.roundId)
  }, [search?.tab, search?.monthId, search?.roundId])

  useEffect(() => {
    if (defaultMonthId && !monthId) {
      setMonthId(defaultMonthId)
    }
  }, [defaultMonthId, monthId])

  useEffect(() => {
    if (!roundId && rounds?.[0]) setRoundId(rounds[0].id)
  }, [rounds, roundId])

  const { data: monthRanking } = useQuery({
    queryKey: ['ranking', 'month', monthId],
    queryFn: () => (monthId ? getMonthRanking(monthId, { currentParticipantId: participant?.id ?? null }) : []),
    enabled: !!monthId,
  })

  const { data: allTimeRanking } = useQuery({
    queryKey: ['ranking', 'alltime'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/leaderboard?type=season')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) return data
        }
      } catch {}
      return []
    },
  })

  const { data: roundLeaderboard } = useQuery({
    queryKey: ['leaderboard', roundId],
    queryFn: () => (roundId ? getRoundLeaderboard(roundId, { currentParticipantId: participant?.id ?? null }) : []),
    enabled: !!roundId,
  })

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: 'month', label: 'Monthly Tournament', icon: CalendarRange },
    { id: 'round', label: 'Round Leaderboard', icon: Medal },
    { id: 'alltime', label: 'Overall Hall of Fame', icon: Trophy },
  ]

  const selectedMonth = months?.find((m) => m.id === monthId)
  const selectedRound = rounds?.find((r) => r.id === roundId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Competitions & Rankings"
        title="Leaderboard"
        subtitle="Thla tin tournament chuh la, Leaderboard-a a chungnung ber nih tum rawh le!"
      />

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'focus-ring flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all',
              tab === t.id
                ? 'border-violet-500/40 bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-ink-300 hover:border-white/25 hover:text-white',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
        <div className="ml-auto">
          {tab === 'round' && (
            <Select value={roundId} onChange={(e) => setRoundId(e.target.value)} className="w-64 font-medium">
              {rounds?.map((r: any) => (
                <option key={r.id} value={r.id} className="bg-ink-800 text-white">
                  {r.title} ({countQuestions(r.id)} q)
                </option>
              ))}
            </Select>
          )}
          {tab === 'month' && (
            <Select value={monthId} onChange={(e) => setMonthId(e.target.value)} className="w-56 font-medium">
              {months?.map((m: any) => (
                <option key={m.id} value={m.id} className="bg-ink-800 text-white">
                  {m.name} Tournament
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* Month Selector Pills on Tab Month */}
      {tab === 'month' && months && months.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {months.map((m: any) => {
            const isCur = currentMonth?.id === m.id
            const active = monthId === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMonthId(m.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer',
                  active
                    ? 'border-violet-500 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-950/40 ring-1 ring-violet-400'
                    : 'border-white/10 bg-white/5 text-ink-300 hover:border-white/20 hover:text-white',
                )}
              >
                <span>📅 {m.name}</span>
                {isCur ? (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px]">Live</span>
                ) : (
                  <span className="rounded-full bg-white/10 text-ink-300 px-2 py-0.5 text-[10px]">Closed</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Round Selection Filters on Tab Round */}
      {tab === 'round' && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-400 mr-1">Month Filters:</span>
          {months?.map((m: any) => {
            const inMonthRounds = rounds?.filter((r: any) => r.monthId === m.id) ?? []
            if (inMonthRounds.length === 0) return null
            const isSelectedMonth = rounds?.find((r: any) => r.id === roundId)?.monthId === m.id
            return (
              <button
                key={m.id}
                onClick={() => {
                  const firstR = inMonthRounds[0]
                  if (firstR) setRoundId(firstR.id)
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                  isSelectedMonth
                    ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                    : 'border-white/10 bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white',
                )}
              >
                <span>{m.name}</span>
                <span className="text-[10px] opacity-75">({inMonthRounds.length})</span>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'month' && selectedMonth && (
        <Card className="mb-8 flex flex-wrap items-center justify-between gap-4 p-5 border-violet-500/20 bg-gradient-to-r from-violet-950/30 to-indigo-950/20">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-violet-300">
              <CalendarRange className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-white flex items-center gap-2">
                {selectedMonth.name} Tournament
                {currentMonth?.id === selectedMonth.id && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
                    🟢 Live Now
                  </span>
                )}
              </p>
              <p className="text-sm text-ink-300">
                {new Date(selectedMonth.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' — '}
                {new Date(selectedMonth.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                {monthRanking?.[0] ? `Rank #1: ${monthRanking[0].participant.displayName} (${monthRanking[0].points} pts)` : 'No scores yet'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {currentMonth?.id === selectedMonth.id && (
              <Link to="/rounds" className="text-sm font-semibold text-violet-400 hover:text-violet-300">
                Play Rounds →
              </Link>
            )}
          </div>
        </Card>
      )}

      {tab === 'alltime' && (
        <Card className="mb-8 flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400/20 to-amber-600/10 text-yellow-300">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">
              Overall Hall of Fame
            </p>
            <p className="text-sm text-ink-300">
              All-time highest points scored across all quiz tournaments and rounds.
            </p>
          </div>
        </Card>
      )}

      {tab === 'round' && selectedRound && (
        <Card className="mb-8 flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 text-violet-300">
            <Medal className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">{selectedRound.title}</p>
            <p className="text-sm text-ink-300">
              {countQuestions(selectedRound.id)} questions ·{' '}
              {Math.round(selectedRound.timeLimitSeconds / 60)} min limit
            </p>
          </div>
          <Link to={`/rounds/${selectedRound.id}`} className="ml-auto text-sm font-semibold text-violet-400 hover:text-violet-300">
            Round details →
          </Link>
        </Card>
      )}

      {(tab === 'month' ? monthRanking : tab === 'alltime' ? allTimeRanking : roundLeaderboard)?.length ? (
        <div>
          {tab === 'round' ? (
            <LeaderboardTable rows={roundLeaderboard?.slice(0, 50) ?? []} />
          ) : (
            <RankingTable rows={(tab === 'month' ? monthRanking : allTimeRanking)?.slice(0, 50) ?? []} />
          )}
        </div>
      ) : (
        <Card className="p-12 text-center text-sm text-ink-300">
          <Trophy className="mx-auto h-8 w-8 text-yellow-400 mb-2 opacity-70" />
          <p className="font-semibold text-white">
            {tab === 'month' && selectedMonth ? `${selectedMonth.name} Tournament Score a la awm rih lo` : `No scores yet in this ${tab === 'month' ? 'month' : tab}.`}
          </p>
          <p className="mt-1 text-xs text-ink-300">
            {tab === 'month' ? 'Thla hmasa (September 2026) result en duh tan a chunga "September 2026" button khu hmet rawh le.' : 'Play a round to claim the top spot.'}
          </p>
          {tab === 'month' && months?.find((m: any) => m.name.toLowerCase().includes('september')) && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const sep = months.find((m: any) => m.name.toLowerCase().includes('september'))
                  if (sep) setMonthId(sep.id)
                }}
              >
                🏆 September 2026 Leaderboard & Winner En Rawh
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
