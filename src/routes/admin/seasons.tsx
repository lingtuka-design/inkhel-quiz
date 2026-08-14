import { Link } from '@tanstack/react-router'
import { Calendar, CalendarPlus, CalendarRange, ChevronRight, Clapperboard, Pencil, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, SectionHeading, toast } from '../../components/ui'
import { listSeasons, setSeasonStatus } from '../../services/seasonService'
import { listMonths, monthStatus } from '../../services/monthService'
import { listRoundsByMonth } from '../../services/roundService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import { useEffect } from 'react'
import { cn } from '../../lib/utils'

const STATUS_TONES = {
  active: { tone: 'green' as const, label: 'Active' },
  draft: { tone: 'slate' as const, label: 'Draft' },
  completed: { tone: 'violet' as const, label: 'Completed' },
  archived: { tone: 'amber' as const, label: 'Archived' },
}

export function AdminSeasonsPage() {
  useEffect(() => setPageTitle('Seasons'), [])

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: listSeasons,
  })

  const handleStatus = (id: string, status: 'active' | 'completed' | 'archived') => {
    try {
      setSeasonStatus(id, status)
      toast(`Season ${status}`, 'success')
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }

  if (!seasons || seasons.length === 0) {
    return (
      <div>
        <SectionHeading title="Seasons" />
        <EmptyState
          icon={Calendar}
          title="No seasons yet"
          description="Create your first season — its 10 months are generated automatically."
          action={
            <Link to="/admin/seasons/new">
              <Button icon={CalendarPlus}>Create Season</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Seasons</h1>
          <p className="mt-1 text-sm text-ink-300">
            Each season spans {seasons[0]?.durationMonths ?? 10} months, one competition period per month.
          </p>
        </div>
        <Link to="/admin/seasons/new">
          <Button size="sm" icon={CalendarPlus}>
            New Season
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {seasons.map((season) => {
          const st = STATUS_TONES[season.status]
          const months = listMonths(season.id)
          const openCount = months.filter((m) => monthStatus(m) === 'open').length
          const roundCount = months.reduce((s, m) => s + listRoundsByMonth(m.id).length, 0)
          return (
            <Card key={season.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 text-violet-300">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/seasons/${season.id}`} className="focus-ring rounded-lg">
                        <h2 className="font-display text-lg font-bold text-white hover:text-violet-300">
                          {season.name}{' '}
                          <span className="text-sm font-semibold text-ink-300">
                            · Season {season.seasonNumber}
                          </span>
                        </h2>
                      </Link>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-300">
                      {formatDate(season.startDate)} — {formatDate(season.endDate)} · {season.durationMonths}{' '}
                      months · {months.length} created · {roundCount} rounds
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {months.slice(0, 10).map((m) => {
                        const open = monthStatus(m) === 'open'
                        return (
                          <Link
                            key={m.id}
                            to={`/admin/seasons/${season.id}/months/${m.id}`}
                            className={cn(
                              'focus-ring rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                              open
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                                : 'border-white/10 bg-white/5 text-ink-300 hover:border-white/25 hover:text-white',
                            )}
                          >
                            {m.name}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStatus(season.id, 'active')}
                    disabled={season.status === 'active'}
                  >
                    Activate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatus(season.id, 'completed')}
                    disabled={season.status === 'completed'}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatus(season.id, 'archived')}
                    disabled={season.status === 'archived'}
                  >
                    Archive
                  </Button>
                  <Link to={`/admin/seasons/${season.id}`}>
                    <Button variant="ghost" size="sm" icon={Pencil}>
                      Edit
                    </Button>
                  </Link>
                  <Link to={`/admin/seasons/${season.id}`}>
                    <Button variant="secondary" size="sm" icon={CalendarRange}>
                      Months
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => toast('Use Archive instead of delete to preserve history', 'info')}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
