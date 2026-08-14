import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { CalendarPlus, CalendarRange, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { Badge, Button, Card, SectionHeading, toast } from '../../components/ui'
import { getSeason, updateSeason, deleteSeason } from '../../services/seasonService'
import { listMonths, monthStatus } from '../../services/monthService'
import { listRoundsByMonth, countQuestions } from '../../services/roundService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'
import { useNavigate } from '@tanstack/react-router'

export function SeasonDetailPage() {
  const { seasonId } = useParams({ strict: false })
  const navigate = useNavigate()

  const { data: season } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => getSeason(seasonId),
  })

  const { data: months } = useQuery({
    queryKey: ['months', seasonId],
    queryFn: () => listMonths(seasonId),
    enabled: !!season,
  })

  useEffect(() => {
    if (season) setPageTitle(`${season.name} — Months`)
  }, [season])

  const handleComplete = () => {
    if (!season) return
    updateSeason(seasonId, { ...season, status: 'completed' })
    window.location.reload()
  }

  const handleDelete = () => {
    if (!season) return
    const roundsCount = (months ?? []).reduce(
      (s, m) => s + listRoundsByMonth(m.id).length,
      0,
    )
    if (
      !window.confirm(
        `Delete "${season.name}"?\n\nThis permanently removes the season, its ${season.durationMonths} months, all rounds, questions, attempts and leaderboard entries. This cannot be undone.`,
      )
    )
      return
    try {
      const result = deleteSeason(seasonId)
      toast(`Season deleted (${result.rounds} rounds, ${result.attempts} attempts removed)`, 'success')
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      queryClient.invalidateQueries({ queryKey: ['months'] })
      queryClient.invalidateQueries({ queryKey: ['rounds'] })
      navigate({ to: '/admin/seasons' })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  if (!season) return null

  return (
    <div className="space-y-8">
      <div>
        <BackLink to="/admin/seasons" label="Seasons" />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {season.name}
              <span className="ml-3 align-middle text-base font-semibold text-ink-300">
                Season {season.seasonNumber}
              </span>
            </h1>
            <p className="mt-1 text-sm text-ink-300">
              {formatDate(season.startDate)} — {formatDate(season.endDate)} · {season.durationMonths} months ·{' '}
              {season.description}
            </p>
          </div>
          <div className="flex gap-2">
            {season.status !== 'completed' && (
              <Button variant="secondary" size="sm" onClick={handleComplete}>
                <CheckCircle2 className="h-4 w-4" /> Mark Completed
              </Button>
            )}
            <Link to={`/admin/seasons/${season.id}/edit`}>
              <Button variant="ghost" size="sm">
                Edit Season
              </Button>
            </Link>
            <Button variant="danger" size="sm" icon={Trash2} onClick={handleDelete}>
              Delete Season
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months?.map((m) => {
          const st = monthStatus(m)
          const rounds = listRoundsByMonth(m.id)
          const published = rounds.filter((r) => r.status === 'published').length
          return (
            <Link key={m.id} to={`/admin/seasons/${seasonId}/months/${m.id}`} className="focus-ring rounded-2xl">
              <Card
                className={cn(
                  'group h-full p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/40',
                  st === 'open' && 'border-emerald-500/30',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 text-sky-300">
                    <CalendarRange className="h-5 w-5" />
                  </div>
                  <Badge
                    tone={st === 'open' ? 'green' : st === 'upcoming' ? 'slate' : 'amber'}
                  >
                    {st === 'open' ? 'Open' : st === 'upcoming' ? 'Upcoming' : 'Closed'}
                  </Badge>
                </div>
                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-ink-300">
                  Month {m.monthNumber}
                </p>
                <h3 className="font-display text-lg font-bold text-white">{m.name}</h3>
                <p className="mt-1 text-xs text-ink-300">
                  {formatDate(m.startDate)} — {formatDate(m.endDate)}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs font-medium text-ink-300">
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> {rounds.length} rounds
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {published} live
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-violet-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Manage rounds →
                </p>
              </Card>
            </Link>
          )
        })}
      </div>

      <SectionHeading
        eyebrow="Quick start"
        title="Add a round"
        action={
          <Button
            size="sm"
            icon={CalendarPlus}
            onClick={() => navigate({ to: `/admin/rounds/new?monthId=${months?.find((m) => monthStatus(m) === 'open')?.id ?? months?.[0]?.id ?? ''}` })}
          >
            New Round
          </Button>
        }
      />
      <Card className="p-5 text-sm text-ink-300">
        Rounds belong to months. Any number of rounds can be created inside a month — all of them
        stay playable until the month ends, then close automatically. Each round needs at least 10
        questions before it can be published.
      </Card>
    </div>
  )
}
