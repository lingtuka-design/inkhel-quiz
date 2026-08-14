import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, Flame, Play, Sparkles, Trophy, Users, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { EpisodeBanner, EpisodeCard } from '../components/episodes'
import { Podium, RankingTable } from '../components/leaderboard'
import { Button, Card, SectionHeading } from '../components/ui'
import {
  listPublishedEpisodes,
  countParticipants,
  countQuestions,
} from '../services/episodeService'
import { getActiveSeason, listSeasons } from '../services/seasonService'
import { getOverallRanking } from '../services/leaderboardService'
import { getParticipant } from '../services/authService'
import { setPageTitle } from '../services/shareService'
import { formatDate } from '../lib/utils'
import { useEffect } from 'react'

export function HomePage() {
  const participant = getParticipant()

  useEffect(() => {
    setPageTitle('')
    document.title = 'Inkhel — Competitive Quiz Platform'
  }, [])

  const { data: episodes } = useQuery({
    queryKey: ['episodes'],
    queryFn: () =>
      listPublishedEpisodes().map((e) => ({
        episode: e,
        participants: countParticipants(e.id),
        questions: countQuestions(e.id),
      })),
  })

  const { data: season } = useQuery({
    queryKey: ['activeSeason'],
    queryFn: () => {
      const s = getActiveSeason()
      return s ?? listSeasons().at(-1) ?? null
    },
  })

  const { data: ranking } = useQuery({
    queryKey: ['ranking', 'current'],
    queryFn: () => getOverallRanking({ currentParticipantId: participant?.id ?? null }),
  })

  const live = episodes?.filter((e) => e.episode.status === 'published') ?? []
  const featured = live[0]
  const totalPlayers = episodes?.reduce((s, e) => s + e.participants, 0) ?? 0
  const totalQuestions = episodes?.reduce((s, e) => s + e.questions, 0) ?? 0

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
                <Flame className="h-3.5 w-3.5" />
                {season ? `Season ${season.seasonNumber} is live` : 'New episodes weekly'}
              </div>
              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Beat the clock.
                <br />
                <span className="text-gradient">Own the leaderboard.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-ink-300 sm:text-lg">
                Fast-paced competitive quizzes with server-enforced timers. Answer quickly, answer
                accurately, and climb the season rankings before time runs out.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={featured ? `/episodes/${featured.episode.id}` : '/episodes'}>
                  <Button size="lg" icon={Play}>
                    Play Quiz
                  </Button>
                </Link>
                <Link to="/leaderboard">
                  <Button size="lg" variant="outline" icon={Trophy}>
                    View Leaderboard
                  </Button>
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-8">
                {[
                  { icon: Zap, label: `${live.length} live episodes` },
                  { icon: Users, label: `${totalPlayers} players` },
                  { icon: Sparkles, label: `${totalQuestions} questions` },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-sm text-ink-300">
                    <s.icon className="h-4 w-4 text-violet-400" />
                    <span className="font-semibold text-white">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-fade-up [animation-delay:150ms]">
              {featured && (
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-fuchsia-500/30 blur-2xl" />
                  <Card className="animate-float relative overflow-hidden">
                    <div className="relative">
                      <EpisodeBanner episode={featured.episode} className="h-44 sm:h-52" iconSize="h-20 w-20" />
                      <div className="absolute left-4 top-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
                          <Flame className="h-3.5 w-3.5 text-orange-400" /> Featured
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                        {season?.name}
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-bold text-white">
                        {featured.episode.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-ink-300">
                        {featured.episode.description}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-sm text-ink-300">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {featured.episode.timeLimitSeconds >= 60
                            ? `${Math.round(featured.episode.timeLimitSeconds / 60)} min timer`
                            : `${featured.episode.timeLimitSeconds}s timer`}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Zap className="h-4 w-4" />
                          {featured.questions} questions
                        </span>
                      </div>
                      <Link to={`/episodes/${featured.episode.id}`} className="mt-6 block">
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
          eyebrow="Featured"
          title="Live episodes"
          subtitle="Timer running. Brains sharpened. Who's fastest today?"
          action={
            <Link to="/episodes" className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300">
              All episodes <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {live.slice(0, 3).map(({ episode, participants }) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              season={season ?? undefined}
              participantCount={participants}
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
                  Current Season {season.seasonNumber}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{season.name}</h2>
                <p className="mt-2 max-w-xl text-sm text-ink-300">{season.description}</p>
                <p className="mt-3 text-sm text-ink-300">
                  {formatDate(season.startDate)} — {formatDate(season.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <Trophy className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-300">Current leader</p>
                  <p className="font-display text-lg font-bold text-white">
                    {ranking?.[0]?.participant.displayName ?? '—'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              {ranking && ranking.length > 0 ? (
                <>
                  <Podium rows={ranking.slice(0, 3).map((r, i) => ({
                    rank: r.rank,
                    participant: r.participant,
                    correctAnswers: 0,
                    totalQuestions: 0,
                    timeTakenSeconds: 0,
                    score: r.points,
                    completedAt: '',
                    attemptId: `rank_${r.participant.id}`,
                    isCurrentUser: r.isCurrentUser,
                  }))}
                  />
                  <div className="mt-6">
                    <RankingTable rows={ranking.slice(0, 5)} />
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-ink-300">
                  No rankings yet — play an episode to make your mark.
                </p>
              )}
            </div>
          </Card>
        </section>
      )}
    </div>
  )
}
