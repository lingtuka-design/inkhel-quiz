import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  Archive,
  BarChart3,
  CalendarRange,
  Eye,
  ListChecks,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { Badge, Button, Card, EmptyState, toast } from '../../components/ui'
import { getMonth } from '../../services/monthService'
import { getSeason } from '../../services/seasonService'
import {
  listRoundsByMonth,
  countQuestions,
  countParticipants,
  countAttempts,
  setRoundStatus,
  deleteRound,
} from '../../services/roundService'
import { roundStatusBadge } from '../../components/rounds'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import { useNavigate } from '@tanstack/react-router'

export function MonthDetailPage() {
  const { seasonId, monthId } = useParams({ strict: false })
  const navigate = useNavigate()

  const { data: month } = useQuery({
    queryKey: ['month', monthId],
    queryFn: () => getMonth(monthId),
  })

  const { data: season } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => getSeason(seasonId),
  })

  const { data: rounds } = useQuery({
    queryKey: ['rounds', monthId],
    queryFn: () => listRoundsByMonth(monthId),
    enabled: !!month,
  })

  useEffect(() => {
    if (month) setPageTitle(`${month.name} — Rounds`)
  }, [month])

  const handleStatus = (id: string, status: 'published' | 'archived') => {
    try {
      setRoundStatus(id, status)
      toast(`Round ${status === 'published' ? 'published' : 'archived'}`, 'success')
      queryClient.invalidateQueries({ queryKey: ['rounds'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      deleteRound(id)
      toast('Round deleted', 'success')
      queryClient.invalidateQueries({ queryKey: ['rounds'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  if (!month || !season) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackLink to={`/admin/seasons/${seasonId}`} label={season.name} />
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 text-sky-300">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {month.name}
                <span className="ml-3 align-middle text-sm font-semibold text-ink-300">
                  Month {month.monthNumber} of {season.durationMonths}
                </span>
              </h1>
              <p className="mt-1 text-sm text-ink-300">
                {formatDate(month.startDate)} — {formatDate(month.endDate)} · rounds close when the
                month ends
              </p>
            </div>
          </div>
        </div>
        <Button size="sm" icon={Plus} onClick={() => navigate({ to: `/admin/rounds/new?monthId=${monthId}` })}>
          New Round
        </Button>
      </div>

      {!rounds || rounds.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No rounds in this month yet"
          description="Create rounds with 10+ questions each. They'll be playable until the month closes."
          action={
            <Button icon={Plus} onClick={() => navigate({ to: `/admin/rounds/new?monthId=${monthId}` })}>
              Create Round
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
                  <th className="px-4 py-3 font-semibold">Round</th>
                  <th className="px-4 py-3 text-center font-semibold">Questions</th>
                  <th className="px-4 py-3 text-center font-semibold">Time</th>
                  <th className="px-4 py-3 text-center font-semibold">Players</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) => {
                  const badge = roundStatusBadge(round)
                  return (
                    <tr key={round.id} className="border-b border-white/5 align-middle last:border-0 hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{round.title}</p>
                        <p className="text-xs text-ink-300">{countAttempts(round.id)} attempts</p>
                      </td>
                      <td className="px-4 py-3 text-center text-ink-200">{countQuestions(round.id)}</td>
                      <td className="px-4 py-3 text-center text-ink-200">
                        {Math.round(round.timeLimitSeconds / 60)}m
                      </td>
                      <td className="px-4 py-3 text-center text-ink-200">{countParticipants(round.id)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/rounds/${round.id}`}
                            className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/rounds/${round.id}/questions`}
                            className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                            title="Questions"
                          >
                            <ListChecks className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/rounds/${round.id}`}
                            className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/rounds/${round.id}/leaderboard`}
                            className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                            title="Leaderboard"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                          {round.status !== 'published' && (
                            <button
                              className="focus-ring rounded-lg p-1.5 text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-300"
                              title="Publish"
                              onClick={() => handleStatus(round.id, 'published')}
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {round.status === 'published' && (
                            <button
                              className="focus-ring rounded-lg p-1.5 text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300"
                              title="Archive"
                              onClick={() => handleStatus(round.id, 'archived')}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          {round.status === 'archived' && (
                            <button
                              className="focus-ring rounded-lg p-1.5 text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300"
                              title="Unarchive (set back to published)"
                              onClick={() => handleStatus(round.id, 'published')}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="focus-ring rounded-lg p-1.5 text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
                            title="Delete"
                            onClick={() => handleDelete(round.id, round.title)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
