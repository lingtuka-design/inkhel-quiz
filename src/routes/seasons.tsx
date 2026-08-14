import { Link } from '@tanstack/react-router'
import { Archive, Calendar, CalendarCheck2, Clock, Crown, Plus, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, EmptyState, SectionHeading } from '../components/ui'
import { listSeasons, getActiveSeason } from '../services/seasonService'
import { listEpisodesBySeason } from '../services/episodeService'
import { getSeasonRanking } from '../services/leaderboardService'
import { setPageTitle } from '../services/shareService'
import { formatDate } from '../lib/utils'
import { useEffect } from 'react'
import { cn } from '../lib/utils'

const STATUS_TONES = {
  active: { tone: 'green' as const, label: 'Active', icon: CalendarCheck2 },
  draft: { tone: 'slate' as const, label: 'Draft', icon: Archive },
  completed: { tone: 'violet' as const, label: 'Completed', icon: Crown },
  archived: { tone: 'amber' as const, label: 'Archived', icon: Archive },
}

export function SeasonsPage() {
  useEffect(() => setPageTitle('Seasons'), [])

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: listSeasons,
  })

  if (!seasons || seasons.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Calendar}
          title="No seasons yet"
          description="The first season of Inkhel is being prepared."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Championships"
        title="Seasons"
        subtitle="Each season is its own championship. Points reset, glory accumulates."
      />
      <div className="space-y-6">
        {seasons.map((season) => {
          const status = STATUS_TONES[season.status]
          const episodes = listEpisodesBySeason(season.id)
          const leader = getSeasonRanking(season.id)[0]
          return (
            <Card
              key={season.id}
              className={cn(
                'overflow-hidden transition-all hover:border-white/20',
                season.status === 'active' && 'border-violet-500/30',
              )}
            >
              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/15 to-fuchsia-500/10 text-violet-300">
                    <Trophy className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-white">{season.name}</h2>
                      <Badge tone={status.tone}>
                        <status.icon className="h-3 w-3" /> {status.label}
                      </Badge>
                    </div>
                    <p className="mt-1.5 max-w-xl text-sm text-ink-300">{season.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-300">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(season.startDate)} — {formatDate(season.endDate)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {season.durationMonths} month{season.durationMonths === 1 ? '' : 's'}
                      </span>
                      <span>{episodes.length} episodes</span>
                    </div>
                    {leader && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-yellow-300">
                        <Crown className="h-3.5 w-3.5" /> Current leader: {leader.participant.displayName}
                        <span className="font-bold text-white">({leader.points} pts)</span>
                      </p>
                    )}
                  </div>
                </div>
                <Link to="/leaderboard" className="shrink-0">
                  <Badge tone="violet" className="px-4 py-2">
                    Season {season.seasonNumber} Ranking →
                  </Badge>
                </Link>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
