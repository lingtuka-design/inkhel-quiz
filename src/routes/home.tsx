import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Calendar, CalendarClock, Clock, Flame, Play, Sparkles, Trophy, Users, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RoundBanner, RoundCard } from '../components/rounds'
import { Podium, RankingTable } from '../components/leaderboard'
import { PollPreviewCard } from '../components/pollCard'
import { Button, Card, SectionHeading } from '../components/ui'
import {
  listRounds,
  listAllPlayableRounds,
  countParticipants,
  countQuestions,
} from '../services/roundService'
import { getActiveSeason, listSeasons } from '../services/seasonService'
import { getCurrentMonth, listAllMonths } from '../services/monthService'
import { getMonthRanking, getSeasonRanking } from '../services/leaderboardService'
import { getParticipant, useCurrentUser } from '../services/authService'
import { listPolls } from '../services/pollService'
import { setPageTitle } from '../services/shareService'
import { formatDate, cn } from '../lib/utils'
import { useEffect, useMemo, useState } from 'react'

export function HomePage() {
  const navigate = useNavigate()
  const participant = useCurrentUser()

  useEffect(() => {
    document.title = 'Inkhel — Competitive Quiz Platform'
    setPageTitle('')
  }, [])

  const { data: rounds } = useQuery<{ round: any; participants: number; questions: number }[]>({
    queryKey: ['rounds', 'playable'],
    placeholderData: () =>
      listRounds()
        .filter((r) => r.status !== 'draft')
        .map((r) => ({
          round: r,
          participants: (r as any).participantCount ?? countParticipants(r.id),
          questions: (r as any).questionCount ?? countQuestions(r.id),
        })),
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
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
              .map((r: any) => ({
                round: r,
                participants: r.participantCount || 0,
                questions: r.questionCount || 0,
              }))
          }
        }
      } catch {}
      return listRounds()
        .filter((r) => r.status !== 'draft')
        .map((r) => ({
          round: r,
          participants: (r as any).participantCount ?? countParticipants(r.id),
          questions: (r as any).questionCount ?? countQuestions(r.id),
        }))
    },
  })

  const { data: season } = useQuery({
    queryKey: ['activeSeason'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/seasons?status=active')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            return data[0]
          }
        }
      } catch {}
      const s = getActiveSeason()
      return s ?? listSeasons().at(-1) ?? null
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

  const currentMonth = useMemo(() => {
    const now = Date.now()
    if (Array.isArray(months) && months.length > 0) {
      const open = months.filter((m: any) => {
        const start = new Date(m.startDate).getTime()
        const end = new Date(m.endDate).getTime()
        return now >= start && now <= end
      })
      if (open.length > 0) return open[0]
      return months.find((m: any) => new Date(m.endDate).getTime() >= now) ?? months.at(-1) ?? null
    }
    return getCurrentMonth()
  }, [months])

  const { data: ranking } = useQuery({
    queryKey: ['ranking', 'month', currentMonth?.id],
    queryFn: async () => {
      if (!currentMonth?.id) return []
      try {
        const res = await fetch(`/api/leaderboard?type=month&monthId=${encodeURIComponent(currentMonth.id)}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            return data.map((r: any) => ({
              rank: r.rank,
              participant: r.participant,
              points: r.points || r.score || 0,
              rounds: r.rounds || 1,
              totalCorrect: r.totalCorrect || 0,
              avgTimeSeconds: r.avgTimeSeconds || 0,
              bestScore: r.bestScore ?? r.points ?? 0,
              worstScore: r.worstScore ?? r.points ?? 0,
              isCurrentUser: r.isCurrentUser || (participant ? r.participant?.id === participant.id : false),
            }))
          }
        }
      } catch {}
      return getMonthRanking(currentMonth.id, { currentParticipantId: participant?.id ?? null })
    },
    enabled: !!currentMonth?.id,
  })
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

  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const live = useMemo(() => {
    if (!rounds) return []
    const now = Date.now()
    return rounds.filter(({ round }) => {
      // Must be published (never draft or archived)
      if (round.status !== 'published') return false

      // Check month window: if month is completed/closed, do not show on Home
      if (months && months.length > 0) {
        const m = months.find((x: any) => x.id === round.monthId)
        if (m) {
          const start = new Date(m.startDate).getTime()
          const end = new Date(m.endDate).getTime()
          if (now < start || now > end) return false
        }
      }
      return true
    })
  }, [rounds, months])

  const featured = live[0] ?? rounds?.[0]
  const totalPlayers = (rounds ?? []).reduce((s, e) => s + e.participants, 0)
  const totalQuestions = (rounds ?? []).reduce((s, e) => s + e.questions, 0)
  const totalRounds = (rounds ?? []).length

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

  const filteredLive = live.filter(({ round }) => {
    if (categoryFilter === 'all') return true
    return (round.category || 'football').toLowerCase() === categoryFilter.toLowerCase()
  })

  const playedLiveCount = useMemo(() => {
    if (!userAttemptsMap || live.length === 0) return 0
    return live.filter(({ round }) => {
      const a = userAttemptsMap[round.id]
      return a && (a.status === 'completed' || a.status === 'expired')
    }).length
  }, [userAttemptsMap, live])

  const { data: polls, refetch: refetchPolls } = useQuery({
    queryKey: ['polls', participant?.id, 'active'],
    queryFn: () => listPolls(participant?.id ?? null, 'active'),
    staleTime: 15000,
  })

  return (
    <div>
      {/* Keep Home Page clean and premium without cluttering banner ads */}
      <style>{`
        .adsbygoogle,
        ins.adsbygoogle,
        div[id*="google_ads"],
        div[class*="google_ads"],
        .google-auto-placed {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>
      <section className="relative overflow-hidden">
        <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
                  <Flame className="h-3.5 w-3.5" />
                  {currentMonth
                    ? `${currentMonth.name} Tournament`
                    : season
                      ? `Season ${season.seasonNumber} is live`
                      : 'Season live'}
                </div>
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-none">
                Inkhel Quiz <span className="text-gradient">Competition</span>
              </h1>
              <p className="mt-6 max-w-lg text-base text-ink-200 sm:text-lg leading-relaxed">
                Football, Sports, Music, Movies leh Mizoram chanchin thlengin! Hunbi chhungin zawhna 10 chhang la, score sang ber nih tum rawh le!
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/rounds">
                  <Button size="lg" icon={Play} className="font-bold bg-gradient-to-r from-violet-600 to-indigo-600 shadow-xl shadow-violet-950/50">
                    Play Quiz Now
                  </Button>
                </Link>
                <Link to="/leaderboard">
                  <Button size="lg" variant="secondary" icon={Trophy}>
                    View Leaderboard
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-8 sm:gap-6">
                <div>
                  <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                    {totalPlayers.toLocaleString()}
                  </p>
                  <p className="text-xs text-ink-300">players</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                    {totalQuestions}
                  </p>
                  <p className="text-xs text-ink-300">questions</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-gradient sm:text-3xl">
                    {totalRounds}
                  </p>
                  <p className="text-xs text-ink-300">quiz rounds</p>
                </div>
              </div>
            </div>

            <div className="animate-fade-up [animation-delay:150ms]">
              {featured && (
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-fuchsia-500/30 blur-2xl" />
                  <Card className="animate-float relative overflow-hidden">
                    <div className="relative">
                      <RoundBanner round={featured.round} className="h-44 sm:h-52" iconSize="h-20 w-20" />
                      <div className="absolute left-4 top-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
                          <Flame className="h-3.5 w-3.5 text-orange-400" /> Featured Round
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                        {currentMonth?.name} · {season?.name}
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-bold text-white">
                        {featured.round.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-ink-300">
                        {featured.round.description}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-sm text-ink-300">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {Math.round(featured.round.timeLimitSeconds / 60)} min timer
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Zap className="h-4 w-4" />
                          {featured.questions} questions
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="h-4 w-4" />
                          closes {formatDate(currentMonth?.endDate ?? '')}
                        </span>
                      </div>
                      <div className="mt-6">
                        <Button
                          className="w-full font-bold"
                          icon={Play}
                          onClick={() => navigate({ to: `/rounds/${featured.round.id}` })}
                        >
                          Start Playing
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="This month"
          title="Live rounds"
          subtitle={`${currentMonth?.name ?? 'The current month'} — every round stays open until the month ends.`}
          action={
            <div className="flex items-center gap-3">
              <Link
                to="/rounds"
                search={{ filter: 'closed' }}
                className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-ink-300 hover:text-white transition-colors"
              >
                Archive ({rounds ? Math.max(0, rounds.length - live.length) : ''}) <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/rounds"
                className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300"
              >
                All rounds <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          }
        />

        {/* Campaign Progression Bar for Logged in Players */}
        {participant && live.length > 0 && (
          <div className="mb-8 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-black/40 p-4 sm:p-5 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                    🎮 {currentMonth?.name ?? 'Monthly'} Campaign Progress
                  </span>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                    {playedLiveCount} / {live.length} Rounds Done
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-300">
                  {playedLiveCount === live.length
                    ? `🎉 Ro-pui lutuk! ${currentMonth?.name ?? 'Tun thla'} Round awm zawng zawng i khel kim vek e!`
                    : `Round ${live.length - playedLiveCount} i la khel lo — Khel kim la, Leaderboard-ah i rank ti sang sauh rawh!`}
                </p>
              </div>
              <div className="w-full sm:w-56 space-y-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-violet-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((playedLiveCount / Math.max(1, live.length)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-ink-400">
                  <span>Progress</span>
                  <span className="font-bold text-emerald-400">
                    {Math.round((playedLiveCount / Math.max(1, live.length)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Pills Bar on Home */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((c) => {
            const count = live.filter(({ round }) =>
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

        {filteredLive.length === 0 ? (
          <Card className="p-10 text-center border-white/10 bg-white/[0.02]">
            <Sparkles className="mx-auto h-10 w-10 text-violet-400 opacity-60" />
            <h3 className="mt-3 font-display text-lg font-bold text-white">
              {categoryFilter === 'all'
                ? 'Quiz Round thar buatsaih mek a ni e'
                : 'He category-ah hian round live a la awm rih lo'}
            </h3>
            <p className="mt-1 text-sm text-ink-300 max-w-md mx-auto">
              Round closed tawh te chu Archive-ah dahthat an ni a, round thar chhuah thuai a ni ang.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link to="/rounds" search={{ filter: 'closed' }}>
                <Button variant="secondary" size="sm">
                  View Past / Archived Rounds
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLive.map(({ round, participants, questions }) => (
              <RoundCard
                key={round.id}
                round={round}
                month={currentMonth ?? undefined}
                participantCount={participants}
                questionCount={questions}
                userAttempt={userAttemptsMap?.[round.id]}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <Card className="overflow-hidden border-violet-500/20 shadow-2xl">
          <div className="grid items-center gap-6 border-b border-white/5 bg-gradient-to-r from-violet-950/40 via-indigo-950/20 to-transparent p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 px-3 py-1 text-xs font-bold text-violet-300">
                  ⚡ {currentMonth?.name ?? 'Monthly'} Tournament
                </span>
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                {currentMonth?.name ?? 'Monthly'} Leaderboard Standings
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-300">
                Thla tin ni 1 atanga ni tawp thlengin Quiz Round awm zawng zawng chhang la, Leaderboard-a a chungnung ber nih tum rawh le!
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <Trophy className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-300">Current Leader</p>
                <p className="font-display text-lg font-bold text-white">
                  {ranking?.[0]?.participant.displayName ?? '—'}
                </p>
                {ranking?.[0] && (
                  <p className="text-xs text-emerald-400 font-bold">{ranking[0].points} pts</p>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            {ranking && ranking.length > 0 ? (
              <>
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-white sm:text-lg">
                      Top 10 Player Dinhmun
                    </h3>
                    <span className="text-xs text-ink-300">
                      {ranking.length} {ranking.length === 1 ? 'player' : 'players'} total
                    </span>
                  </div>
                  <RankingTable rows={ranking.slice(0, 10)} />
                </div>

                <div className="mt-8 flex justify-center">
                  <Link to="/leaderboard">
                    <Button variant="outline" icon={Trophy}>
                      View Full Monthly Leaderboard & Rankings →
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-ink-300">
                No rankings yet — play a round to make your mark.
              </p>
            )}
          </div>
        </Card>
      </section>

      {/* Featured Opinion Poll Section */}
      {polls && polls.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-4 pb-16 sm:px-6">
          <SectionHeading
            eyebrow="Fan Voting"
            title="Opinion Poll"
            subtitle="Mizo football & sports fans-te ngaihdan lakna. Vote thlak la, live result en rawh le."
            action={
              <Link
                to="/polls"
                className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300"
              >
                All polls <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {polls.slice(0, 3).map((poll) => (
              <PollPreviewCard key={poll.id} poll={poll} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
