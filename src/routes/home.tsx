import { Link } from '@tanstack/react-router'
import { ArrowRight, Calendar, CalendarClock, Clock, Flame, Play, Sparkles, Trophy, Users, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RoundBanner, RoundCard } from '../components/rounds'
import { Podium, RankingTable } from '../components/leaderboard'
import { Button, Card, SectionHeading } from '../components/ui'
import {
  listAllPlayableRounds,
  countParticipants,
  countQuestions,
} from '../services/roundService'
import { getActiveSeason, listSeasons } from '../services/seasonService'
import { getCurrentMonth, listAllMonths } from '../services/monthService'
import { getSeasonRanking } from '../services/leaderboardService'
import { getParticipant } from '../services/authService'
import { setPageTitle } from '../services/shareService'
import { formatDate, cn } from '../lib/utils'
import { useEffect, useMemo, useState } from 'react'

export function HomePage() {
  const participant = getParticipant()

  useEffect(() => {
    document.title = 'Inkhel — Competitive Quiz Platform'
    setPageTitle('')
  }, [])

  const { data: rounds } = useQuery({
    queryKey: ['rounds', 'playable'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            return data
              .filter((r: any) => r.status === 'published')
              .map((r: any) => ({
                round: r,
                participants: r.participantCount || 0,
                questions: r.questionCount || 0,
              }))
          }
        }
      } catch {}
      return listAllPlayableRounds().map((r) => ({
        round: r,
        participants: countParticipants(r.id),
        questions: countQuestions(r.id),
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
    if (!months || months.length === 0) return getCurrentMonth()
    const now = Date.now()
    const open = months.filter((m: any) => {
      const start = new Date(m.startDate).getTime()
      const end = new Date(m.endDate).getTime()
      return now >= start && now <= end
    })
    return open.sort((a: any, b: any) => a.startDate.localeCompare(b.startDate))[0] ?? months[0] ?? null
  }, [months])

  const { data: ranking } = useQuery({
    queryKey: ['ranking', 'season', season?.id],
    queryFn: async () => {
      if (!season) return []
      try {
        const res = await fetch(`/api/leaderboard?type=season&seasonId=${encodeURIComponent(season.id)}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
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
      return getSeasonRanking(season.id, { currentParticipantId: participant?.id ?? null })
    },
    enabled: !!season,
  })
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const live = rounds ?? []
  const featured = live[0]
  const totalPlayers = live.reduce((s, e) => s + e.participants, 0)
  const totalQuestions = live.reduce((s, e) => s + e.questions, 0)

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

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
                  <Flame className="h-3.5 w-3.5" />
                  {currentMonth
                    ? `${currentMonth.name} — Trial Period`
                    : season
                      ? `Season ${season.seasonNumber} is live`
                      : 'Season starting soon'}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  🎁 Prize ₹2,000 starts September
                </div>
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-none">
                Inkhel Quiz <span className="text-gradient">Competition</span>
              </h1>
              <p className="mt-6 max-w-lg text-base text-ink-200 sm:text-lg leading-relaxed">
                Football, Sports, Music, Movies leh Mizoram chanchin thlengin! Hunbi chhungin zawhna 10 chhang la, <b>September thla atangin thla tin lawmman ₹2,000 kan tan dawn e!</b> Tun thla (August) chu Trial Period a ni e.
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
                    {totalPlayers}
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
                    {live.length}
                  </p>
                  <p className="text-xs text-ink-300">active rounds</p>
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
                      <Link to={`/rounds/${featured.round.id}`} className="mt-6 block">
                        <Button className="w-full" icon={Play}>
                          Start Playing
                        </Button>
                      </Link>
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
            <Link to="/rounds" className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300">
              All rounds <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

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

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLive.map(({ round, participants, questions }) => (
            <RoundCard
              key={round.id}
              round={round}
              month={currentMonth ?? undefined}
              participantCount={participants}
              questionCount={questions}
            />
          ))}
        </div>
      </section>

      {season && (
        <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <Card className="overflow-hidden">
            <div className="grid items-center gap-6 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                  Current Season {season.seasonNumber} · {season.durationMonths} months
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{season.name}</h2>
                <p className="mt-2 max-w-xl text-sm text-ink-300">{season.description}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-ink-300">
                  <Calendar className="h-4 w-4" />
                  {formatDate(season.startDate)} — {formatDate(season.endDate)}
                  <span className="hidden sm:inline">
                    · {months?.filter((m) => m.seasonId === season.id).length ?? 0} months
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <Trophy className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-300">Season leader</p>
                  <p className="font-display text-lg font-bold text-white">
                    {ranking?.[0]?.participant.displayName ?? '—'}
                  </p>
                  {ranking?.[0] && (
                    <p className="text-xs text-ink-300">{ranking[0].points} pts</p>
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
                        Top 10 Season Standings
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
                        View Full Leaderboard & Monthly Rankings →
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
      )}
    </div>
  )
}
