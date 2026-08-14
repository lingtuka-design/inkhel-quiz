import { useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { LeaderboardTable } from '../../components/leaderboard'
import { Card, SectionHeading } from '../../components/ui'
import { getEpisode, countQuestions } from '../../services/episodeService'
import { getSeason } from '../../services/seasonService'
import { getEpisodeLeaderboard } from '../../services/leaderboardService'
import { setPageTitle } from '../../services/shareService'

export function AdminEpisodeLeaderboardPage() {
  const { episodeId } = useParams({ from: '/admin/episodes/$episodeId/leaderboard' })

  const { data: episode } = useQuery({
    queryKey: ['episode', episodeId],
    queryFn: () => getEpisode(episodeId),
  })

  const { data: season } = useQuery({
    queryKey: ['season', episode?.seasonId],
    queryFn: () => (episode ? getSeason(episode.seasonId) : null),
    enabled: !!episode,
  })

  const { data: rows } = useQuery({
    queryKey: ['leaderboard', episodeId],
    queryFn: () => getEpisodeLeaderboard(episodeId),
    enabled: !!episode,
  })

  const { data: totalQuestions } = useQuery({
    queryKey: ['questions', episodeId, 'count'],
    queryFn: () => countQuestions(episodeId),
    enabled: !!episode,
  })

  useEffect(() => {
    if (episode) setPageTitle(`Leaderboard — ${episode.title}`)
  }, [episode])

  if (!episode) return null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackLink to="/admin/episodes" label="Episodes" />
        <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
          {episode.title}
          <span className="ml-3 align-middle text-sm font-semibold text-ink-300">Leaderboard</span>
        </h1>
        <p className="mt-1 text-sm text-ink-300">
          {season?.name} · {totalQuestions ?? 0} questions · ranked by score, correct answers, then time.
        </p>
      </div>
      <LeaderboardTable rows={rows ?? []} />
      <Card className="p-5 text-sm text-ink-300">
        <p className="font-semibold text-white">Tie-breaking rules</p>
        <p className="mt-1">
          Equal scores are ordered by: more correct answers → faster completion time → earlier submission.
          Test attempts are excluded from public rankings.
        </p>
      </Card>
    </div>
  )
}
