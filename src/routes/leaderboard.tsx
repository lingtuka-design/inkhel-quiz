import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Medal, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Podium, RankingTable, LeaderboardTable } from '../components/leaderboard'
import { Card, Select, SectionHeading } from '../components/ui'
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
import { Link } from '@tanstack/react-router'

type Tab = 'month' | 'round' | 'alltime'

export function LeaderboardPage() {
  useEffect(() => setPageTitle('Leaderboard'), [])
  const participant = getParticipant()
  const [tab, setTab] = useState<Tab>('month')

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
    queryFn: () => listRounds().filter((r) => r.status !== 'draft'),
  })

  const defaultMonthId = useMemo(() => {
    if (currentMonth?.id) return currentMonth.id
    const now = Date.now()
    const openMonth = months?.find((m) => {
      const start = new Date(m.startDate).getTime()
      const end = new Date(m.endDate).getTime()
      return now >= start && now <= end
    })
    if (openMonth) return openMonth.id
    return months?.[0]?.id ?? ''
  }, [currentMonth, months])

  const [monthId, setMonthId] = useState<string>('')
  const [roundId, setRoundId] = useState<string>('')

  useEffect(() => {
    if (defaultMonthId && (!monthId || monthId === 'season_1786731482471_m10')) {
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
            <Select value={roundId} onChange={(e) => setRoundId(e.target.value)} className="w-64">
              {rounds?.map((r) => (
                <option key={r.id} value={r.id} className="bg-ink-800">
                  {r.title} ({countQuestions(r.id)} q)
                </option>
              ))}
            </Select>
          )}
          {tab === 'month' && (
            <Select value={monthId} onChange={(e) => setMonthId(e.target.value)} className="w-56">
              {months?.map((m) => (
                <option key={m.id} value={m.id} className="bg-ink-800">
                  {m.name} Tournament
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              🎁 Monthly Prize: ₹2,000
            </span>
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
          No scores yet in this {tab === 'month' ? 'month' : tab}. Play a round to claim the top spot.
        </Card>
      )}
    </div>
  )
}
