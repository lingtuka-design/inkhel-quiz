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
import { ensureCloudCatalog } from '../services/cloudCatalog'
import { setPageTitle } from '../services/shareService'
import { cn } from '../lib/utils'
import { Link } from '@tanstack/react-router'

type Tab = 'round' | 'month' | 'season'

export function LeaderboardPage() {
  useEffect(() => setPageTitle('Leaderboard'), [])
  const participant = getParticipant()
  const [tab, setTab] = useState<Tab>('month')

  const { data: currentMonth } = useQuery({
    queryKey: ['currentMonth'],
    queryFn: async () => {
      await ensureCloudCatalog()
      return getCurrentMonth()
    },
  })
  const { data: months } = useQuery({ queryKey: ['months'], queryFn: listAllMonths })
  const { data: seasons } = useQuery({ queryKey: ['seasons'], queryFn: listSeasons })
  const { data: rounds } = useQuery({
    queryKey: ['rounds'],
    queryFn: () => listRounds().filter((r) => r.status !== 'draft'),
  })

  const defaultMonthId = months?.find((m) => m.seasonId === (seasons?.find((s) => s.status === 'active')?.id ?? seasons?.[0]?.id ?? ''))?.id
  const [monthId, setMonthId] = useState<string>('')
  const [seasonId, setSeasonId] = useState<string>('')
  const [roundId, setRoundId] = useState<string>('')

  useEffect(() => {
    if (!monthId && defaultMonthId) setMonthId(defaultMonthId)
    if (!seasonId && seasons?.[0]) setSeasonId(seasons[0].id)
    if (!roundId && rounds?.[0]) setRoundId(rounds[0].id)
  }, [defaultMonthId, months, seasons, rounds, monthId, seasonId, roundId])

  const { data: monthRanking } = useQuery({
    queryKey: ['ranking', 'month', monthId],
    queryFn: () => (monthId ? getMonthRanking(monthId, { currentParticipantId: participant?.id ?? null }) : []),
    enabled: !!monthId,
  })

  const { data: seasonRanking } = useQuery({
    queryKey: ['ranking', 'season', seasonId],
    queryFn: () => (seasonId ? getSeasonRanking(seasonId, { currentParticipantId: participant?.id ?? null }) : []),
    enabled: !!seasonId,
  })

  const { data: roundLeaderboard } = useQuery({
    queryKey: ['leaderboard', roundId],
    queryFn: () => (roundId ? getRoundLeaderboard(roundId, { currentParticipantId: participant?.id ?? null }) : []),
    enabled: !!roundId,
  })

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: 'month', label: 'Monthly', icon: CalendarRange },
    { id: 'season', label: 'Season', icon: Trophy },
    { id: 'round', label: 'Round', icon: Medal },
  ]

  const selectedMonth = months?.find((m) => m.id === monthId)
  const selectedSeason = seasons?.find((s) => s.id === seasonId)
  const selectedRound = rounds?.find((r) => r.id === roundId)

  const podiumRows = useMemo(() => {
    const source =
      tab === 'round'
        ? (roundLeaderboard ?? []).map((r) => ({ ...r, score: r.score }))
        : (tab === 'month' ? monthRanking ?? [] : seasonRanking ?? []).map((r) => ({
            rank: r.rank,
            participant: r.participant,
            correctAnswers: 0,
            totalQuestions: 0,
            timeTakenSeconds: 0,
            score: r.points,
            completedAt: '',
            attemptId: `rank_${r.participant.id}`,
            isCurrentUser: r.isCurrentUser,
          }))
    return source.slice(0, 3)
  }, [tab, roundLeaderboard, monthRanking, seasonRanking])

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Hall of fame"
        title="Leaderboard"
        subtitle="Three levels of glory: round, month, season."
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
                  {m.name}
                </option>
              ))}
            </Select>
          )}
          {tab === 'season' && (
            <Select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className="w-64">
              {seasons?.map((s) => (
                <option key={s.id} value={s.id} className="bg-ink-800">
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {tab === 'month' && selectedMonth && (
        <Card className="mb-8 flex flex-wrap items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 text-sky-300">
            <CalendarRange className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">
              {selectedMonth.name}{' '}
              {currentMonth?.id === selectedMonth.id && (
                <span className="ml-2 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
                  In progress
                </span>
              )}
            </p>
            <p className="text-sm text-ink-300">
              {new Date(selectedMonth.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' — '}
              {new Date(selectedMonth.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}
              {monthRanking?.[0] ? `Leader: ${monthRanking[0].participant.displayName} (${monthRanking[0].points} pts)` : 'No scores yet'}
            </p>
          </div>
          {currentMonth?.id === selectedMonth.id && (
            <Link to="/rounds" className="ml-auto text-sm font-semibold text-violet-400 hover:text-violet-300">
              Play this month's rounds →
            </Link>
          )}
        </Card>
      )}

      {tab === 'season' && selectedSeason && (
        <Card className="mb-8 flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400/20 to-amber-600/10 text-yellow-300">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">
              {selectedSeason.name}{' '}
              <span className="text-sm font-semibold text-ink-300">
                · Season {selectedSeason.seasonNumber} · {selectedSeason.durationMonths} months
              </span>
            </p>
            <p className="text-sm text-ink-300">
              {new Date(selectedSeason.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {' — '}
              {new Date(selectedSeason.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {seasonRanking?.[0] ? ` · Leader: ${seasonRanking[0].participant.displayName}` : ''}
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

      {(tab === 'month' ? monthRanking : tab === 'season' ? seasonRanking : roundLeaderboard)?.length ? (
        <div className="space-y-8">
          <Podium rows={podiumRows} />
          {tab === 'round' ? (
            <LeaderboardTable rows={roundLeaderboard?.slice(0, 20) ?? []} />
          ) : (
            <RankingTable rows={(tab === 'month' ? monthRanking : seasonRanking)?.slice(0, 20) ?? []} />
          )}
        </div>
      ) : (
        <Card className="p-12 text-center text-sm text-ink-300">
          No scores yet in this {tab}. Play a round to claim the top spot.
        </Card>
      )}
    </div>
  )
}
