import { Link, useParams } from '@tanstack/react-router'
import { Calendar, CalendarPlus, Clapperboard, Pencil, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, SectionHeading, toast } from '../../components/ui'
import { listSeasons, setSeasonStatus } from '../../services/seasonService'
import { listEpisodesBySeason } from '../../services/episodeService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import { useEffect } from 'react'

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
          description="Create your first season to start publishing episodes."
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
          <p className="mt-1 text-sm text-ink-300">Championships that group episodes into ranking periods.</p>
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
          const episodes = listEpisodesBySeason(season.id)
          return (
            <Card key={season.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 text-violet-300">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-white">
                        {season.name}{' '}
                        <span className="text-sm font-semibold text-ink-300">
                          · Season {season.seasonNumber}
                        </span>
                      </h2>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-300">
                      {formatDate(season.startDate)} — {formatDate(season.endDate)} ·{' '}
                      {season.durationMonths} month{season.durationMonths === 1 ? '' : 's'} ·{' '}
                      {episodes.length} episode{episodes.length === 1 ? '' : 's'}
                    </p>
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
                    onClick={() => handleStatus(season.id, season.status === 'completed' ? 'active' : 'completed')}
                    disabled={season.status === 'completed'}
                  >
                    Complete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleStatus(season.id, 'archived')} disabled={season.status === 'archived'}>
                    Archive
                  </Button>
                  <Link to={`/admin/seasons/${season.id}`}>
                    <Button variant="ghost" size="sm" icon={Pencil}>
                      Edit
                    </Button>
                  </Link>
                  <Link to={`/admin/episodes?season=${season.id}`}>
                    <Button variant="ghost" size="sm" icon={Clapperboard}>
                      Episodes
                    </Button>
                  </Link>
                  <Button variant="danger" size="sm" icon={Trash2} onClick={() => toast('Use Archive instead of delete to preserve history', 'info')}>
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
