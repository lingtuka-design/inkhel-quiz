import { useEffect, useState } from 'react'
import { Crown, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Podium, RankingTable } from '../components/leaderboard'
import { Card, Select, SectionHeading } from '../components/ui'
import { getSeason, listSeasons } from '../services/seasonService'
import { getOverallRanking, getSeasonRanking } from '../services/leaderboardService'
import { getParticipant } from '../services/authService'
import { setPageTitle } from '../services/shareService'

export function LeaderboardPage() {
  useEffect(() => setPageTitle('Leaderboard'), [])
  const participant = getParticipant()
  const [seasonId, setSeasonId] = useState<string>('overall')

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: listSeasons,
  })

  const { data: overall } = useQuery({
    queryKey: ['ranking', 'overall'],
    queryFn: () => getOverallRanking({ currentParticipantId: participant?.id ?? null }),
  })

  const { data: seasonal } = useQuery({
    queryKey: ['ranking', seasonId],
    queryFn: () =>
      seasonId === 'overall'
        ? overall ?? []
        : getSeasonRanking(seasonId, { currentParticipantId: participant?.id ?? null }),
    enabled: seasonId !== 'overall' || !!overall,
  })

  const rows = seasonId === 'overall' ? (overall ?? []) : (seasonal ?? [])
  const selectedSeason = seasonId === 'overall' ? null : getSeason(seasonId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Hall of fame"
        title="Overall Ranking"
        subtitle="Points are the sum of every valid episode score. Consistency wins seasons."
        action={
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <Select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className="w-56">
              <option value="overall" className="bg-ink-800">
                All seasons
              </option>
              {seasons?.map((s) => (
                <option key={s.id} value={s.id} className="bg-ink-800">
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {selectedSeason && (
        <Card className="mb-8 flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400/20 to-amber-600/10 text-yellow-300">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">
              {selectedSeason.name}{' '}
              <span className="text-sm font-semibold text-ink-300">· Season {selectedSeason.seasonNumber}</span>
            </p>
            <p className="text-sm text-ink-300">
              {new Date(selectedSeason.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {' — '}
              {new Date(selectedSeason.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              {rows[0] ? ` · Leader: ${rows[0].participant.displayName}` : ''}
            </p>
          </div>
        </Card>
      )}

      {rows.length > 0 ? (
        <div className="space-y-8">
          <Podium
            rows={rows.slice(0, 3).map((r) => ({
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
          <RankingTable rows={rows.slice(0, 20)} />
        </div>
      ) : (
        <Card className="p-12 text-center text-sm text-ink-300">
          No rankings yet in this period. Play an episode to claim the top spot.
        </Card>
      )}
    </div>
  )
}
