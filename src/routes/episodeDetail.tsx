import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Calendar, Clock, Play, ShieldAlert, Trophy, Users, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { EpisodeBanner, ShareButtons, statusBadge } from '../components/episodes'
import { Podium, LeaderboardTable } from '../components/leaderboard'
import { Badge, Button, Card, SectionHeading } from '../components/ui'
import {
  getEpisode,
  countParticipants,
  countQuestions,
} from '../services/episodeService'
import { getSeason } from '../services/seasonService'
import { getEpisodeLeaderboard } from '../services/leaderboardService'
import { hasCompletedEpisode } from '../services/attemptService'
import { getParticipant } from '../services/authService'
import { setPageTitle, setMetaDescription } from '../services/shareService'
import { formatTime } from '../lib/utils'

export function EpisodeDetailPage() {
  const { episodeId } = useParams({ strict: false })
  const participant = getParticipant()

  const { data: episode } = useQuery({
    queryKey: ['episode', episodeId],
    queryFn: () => getEpisode(episodeId),
  })

  const { data: season } = useQuery({
    queryKey: ['season', episode?.seasonId],
    queryFn: () => (episode ? getSeason(episode.seasonId) : null),
    enabled: !!episode,
  })

  const { data: stats } = useQuery({
    queryKey: ['episodeStats', episodeId],
    queryFn: () => ({
      participants: countParticipants(episodeId),
      questions: countQuestions(episodeId),
    }),
    enabled: !!episode,
  })

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', episodeId],
    queryFn: () =>
      getEpisodeLeaderboard(episodeId, {
        currentParticipantId: participant?.id ?? null,
      }),
    enabled: !!episode,
  })

  const { data: alreadyPlayed } = useQuery({
    queryKey: ['played', episodeId, participant?.id],
    queryFn: () => (participant ? hasCompletedEpisode(participant.id, episodeId) : false),
    enabled: !!episode && !!participant,
  })

  useEffect(() => {
    if (episode) {
      setPageTitle(episode.title)
      setMetaDescription(episode.description)
    }
  }, [episode])

  if (!episode) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-white">Episode not found</h1>
        <Link to="/episodes" className="mt-4 inline-block text-violet-400 hover:text-violet-300">
          Browse all episodes
        </Link>
      </div>
    )
  }

  const badge = statusBadge(episode.status)
  const isOpen = episode.status === 'published'
  const minutes = Math.round(episode.timeLimitSeconds / 60)

  return (
    <div>
      <div className="relative">
        <EpisodeBanner episode={episode} className="h-56 sm:h-72" iconSize="h-24 w-24" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
      </div>

      <div className="mx-auto -mt-24 max-w-5xl px-4 sm:px-6">
        <div className="relative">
          <Link
            to="/episodes"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All episodes
          </Link>

          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={badge.tone}>{badge.label}</Badge>
              <Badge tone="violet">
                <Calendar className="h-3.5 w-3.5" /> {season?.name ?? 'Season'}
              </Badge>
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              {episode.title}
            </h1>
            <p className="mt-3 max-w-2xl text-ink-300">{episode.description}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Zap, label: 'Questions', value: String(stats?.questions ?? 0) },
                { icon: Clock, label: 'Time limit', value: `${minutes} min` },
                { icon: Users, label: 'Players', value: String(stats?.participants ?? 0) },
                { icon: Trophy, label: 'Top score', value: String(leaderboard?.[0]?.score ?? '—') },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                  <s.icon className="mb-2 h-4 w-4 text-violet-400" />
                  <p className="font-display text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-ink-300">{s.label}</p>
                </div>
              ))}
            </div>

            {isOpen && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                {alreadyPlayed ? (
                  <Button variant="secondary" icon={Trophy} disabled>
                    You've played this episode
                  </Button>
                ) : (
                  <Link to={`/episodes/${episode.id}/quiz`} className="sm:w-auto w-full">
                    <Button className="w-full" size="lg" icon={Play}>
                      Start Quiz
                    </Button>
                  </Link>
                )}
                <div className="text-sm text-ink-300">
                  <p className="flex items-center gap-1.5 font-medium text-amber-300">
                    <ShieldAlert className="h-4 w-4" />
                    Once the quiz begins, the timer cannot be paused.
                  </p>
                  <p className="mt-1 text-xs text-ink-300">
                    {stats?.questions ?? 0} questions · {formatTime(episode.timeLimitSeconds)} on the clock ·
                    answers lock in instantly.
                  </p>
                </div>
              </div>
            )}

            {!isOpen && (
              <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {episode.status === 'draft'
                  ? 'This episode is still in the workshop — check back when it goes live.'
                  : 'This episode has been archived and is no longer accepting attempts.'}
              </div>
            )}

            <div className="mt-6 border-t border-white/5 pt-5">
              <ShareButtons episode={episode} />
            </div>
          </Card>
        </div>

        <section className="mt-12">
          <SectionHeading
            eyebrow="Episode leaderboard"
            title="Fastest minds, top scores"
            subtitle={`Live results for ${episode.title} — updated after every attempt.`}
          />
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-6">
              <Podium rows={leaderboard.slice(0, 3)} />
              <LeaderboardTable rows={leaderboard.slice(0, 10)} />
            </div>
          ) : (
            <Card className="p-10 text-center text-sm text-ink-300">
              No scores yet. Be the first to take the crown.
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
