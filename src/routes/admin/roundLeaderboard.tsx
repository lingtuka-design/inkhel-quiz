import { useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { LeaderboardTable } from '../../components/leaderboard'
import { Card, SectionHeading } from '../../components/ui'
import { getRound, countQuestions } from '../../services/roundService'
import { getMonth } from '../../services/monthService'
import { getRoundLeaderboard } from '../../services/leaderboardService'
import { setPageTitle } from '../../services/shareService'

export function AdminRoundLeaderboardPage() {
  const { roundId } = useParams({ strict: false })

  const { data: round } = useQuery({
    queryKey: ['round', roundId],
    queryFn: () => getRound(roundId),
  })

  const { data: month } = useQuery({
    queryKey: ['month', round?.monthId],
    queryFn: () => (round ? getMonth(round.monthId) : null),
    enabled: !!round,
  })

  const { data: rows } = useQuery({
    queryKey: ['leaderboard', roundId],
    queryFn: () => getRoundLeaderboard(roundId),
    enabled: !!round,
  })

  const { data: totalQuestions } = useQuery({
    queryKey: ['questions', roundId, 'count'],
    queryFn: () => countQuestions(roundId),
    enabled: !!round,
  })

  useEffect(() => {
    if (round) setPageTitle(`Leaderboard — ${round.title}`)
  }, [round])

  if (!round) return null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackLink to="/admin/seasons" label="Seasons" />
        <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
          {round.title}
          <span className="ml-3 align-middle text-sm font-semibold text-ink-300">Round Leaderboard</span>
        </h1>
        <p className="mt-1 text-sm text-ink-300">
          {month?.name} · {totalQuestions ?? 0} questions · ranked by score, correct answers, then
          time.
        </p>
      </div>
      <LeaderboardTable rows={rows ?? []} showPhone={true} />
      <Card className="p-5 text-sm text-ink-300">
        <p className="font-semibold text-white">Tie-breaking rules</p>
        <p className="mt-1">
          Equal scores are ordered by: more correct answers → faster completion time → earlier
          submission. Test attempts are excluded from public rankings.
        </p>
      </Card>
    </div>
  )
}
