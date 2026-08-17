import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  CalendarRange,
  Phone,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { Badge, Button, Card } from '../../components/ui'
import { RankingTable } from '../../components/leaderboard'
import { getMonth } from '../../services/monthService'
import { getSeason } from '../../services/seasonService'
import { getMonthRanking } from '../../services/leaderboardService'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'

export function MonthStandingsPage() {
  const { seasonId, monthId } = useParams({ strict: false })

  const { data: month } = useQuery({
    queryKey: ['month', monthId],
    queryFn: () => getMonth(monthId),
  })

  const { data: season } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => getSeason(seasonId),
  })

  const { data: monthRankings, isLoading } = useQuery({
    queryKey: ['monthRankings', monthId],
    staleTime: 15000,
    queryFn: () => getMonthRanking(monthId!),
    enabled: !!monthId,
  })

  useEffect(() => {
    if (month) setPageTitle(`${month.name} — Tournament Standings`)
  }, [month])

  if (!month || !season) return null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <BackLink to={`/admin/seasons/${seasonId}/months/${monthId}`} label={`${month.name} Rounds`} />
        
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-yellow-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-950/20">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl flex items-center gap-2.5">
                {month.name} Standings
                <span className="align-middle text-sm font-semibold text-ink-300">
                  Month {month.monthNumber} of {season.durationMonths}
                </span>
              </h1>
              <p className="mt-1 text-sm text-ink-300">
                {season.name} · {formatDate(month.startDate)} — {formatDate(month.endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone="violet">
              {monthRankings?.length ?? 0} Ranked Players
            </Badge>
          </div>
        </div>
      </div>

      {/* Prize payout reminder notice */}
      <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-200">Monthly Tournament Prize Distribution</p>
            <p className="text-ink-300 mt-0.5">
              Rank 1, 2, and 3 players qualify for the monthly cash prize. Phone numbers with 1-click WhatsApp links are listed below for easy prize payout.
            </p>
          </div>
        </div>
      </Card>

      {/* Standings table */}
      <RankingTable rows={monthRankings ?? []} showPhone={true} />

      {/* Tie-breaking rules */}
      <Card className="p-5 text-sm text-ink-300">
        <p className="font-semibold text-white">Monthly Ranking Rules</p>
        <p className="mt-1">
          Rankings are calculated by total points accumulated across all published rounds in {month.name}. Equal points are tie-broken by: total correct answers → faster average completion time.
        </p>
      </Card>
    </div>
  )
}
