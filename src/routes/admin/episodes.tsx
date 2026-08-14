import { Link } from '@tanstack/react-router'
import {
  Archive,
  BarChart3,
  Clapperboard,
  Eye,
  ListChecks,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, SectionHeading, toast } from '../../components/ui'
import {
  listEpisodes,
  countQuestions,
  countParticipants,
  countAttempts,
  setEpisodeStatus,
  deleteEpisode,
} from '../../services/episodeService'
import { getSeason } from '../../services/seasonService'
import { statusBadge } from '../../components/episodes'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import { useEffect } from 'react'

export function AdminEpisodesPage() {
  useEffect(() => setPageTitle('Episodes'), [])

  const { data: episodes } = useQuery({
    queryKey: ['episodes'],
    queryFn: listEpisodes,
  })

  const handleStatus = (id: string, status: 'published' | 'archived') => {
    try {
      setEpisodeStatus(id, status)
      toast(`Episode ${status === 'published' ? 'published' : 'archived'}`, 'success')
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      deleteEpisode(id)
      toast('Episode deleted', 'success')
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Episodes</h1>
          <p className="mt-1 text-sm text-ink-300">Create, edit, publish and archive quizzes.</p>
        </div>
        <Link to="/admin/episodes/new">
          <Button size="sm" icon={Plus}>
            New Episode
          </Button>
        </Link>
      </div>

      {!episodes || episodes.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="No episodes yet"
          description="Create your first quiz episode and add questions."
          action={
            <Link to="/admin/episodes/new">
              <Button icon={Plus}>Create Episode</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
                  <th className="px-4 py-3 font-semibold">Episode</th>
                  <th className="px-4 py-3 font-semibold">Season</th>
                  <th className="px-4 py-3 text-center font-semibold">Questions</th>
                  <th className="px-4 py-3 text-center font-semibold">Time</th>
                  <th className="px-4 py-3 text-center font-semibold">Players</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((ep) => {
                  const badge = statusBadge(ep.status)
                  const season = getSeason(ep.seasonId)
                  return (
                    <tr key={ep.id} className="border-b border-white/5 align-middle last:border-0 hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{ep.title}</p>
                        <p className="text-xs text-ink-300">{countAttempts(ep.id)} attempts</p>
                      </td>
                      <td className="px-4 py-3 text-ink-200">{season?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-ink-200">{countQuestions(ep.id)}</td>
                      <td className="px-4 py-3 text-center text-ink-200">
                        {Math.round(ep.timeLimitSeconds / 60)}m
                      </td>
                      <td className="px-4 py-3 text-center text-ink-200">{countParticipants(ep.id)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-200">{formatDate(ep.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/episodes/${ep.id}`}
                            className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/episodes/${ep.id}/questions`}
                            className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                            title="Questions"
                          >
                            <ListChecks className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/episodes/${ep.id}`}
                            className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/episodes/${ep.id}/leaderboard`}
                            className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                            title="Leaderboard"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                          {ep.status !== 'published' && (
                            <button
                              className="focus-ring rounded-lg p-1.5 text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-300"
                              title="Publish"
                              onClick={() => handleStatus(ep.id, 'published')}
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {ep.status === 'published' && (
                            <button
                              className="focus-ring rounded-lg p-1.5 text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300"
                              title="Archive"
                              onClick={() => handleStatus(ep.id, 'archived')}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          {ep.status === 'archived' && (
                            <button
                              className="focus-ring rounded-lg p-1.5 text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300"
                              title="Unarchive (set back to draft)"
                              onClick={() => handleStatus(ep.id, 'published')}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="focus-ring rounded-lg p-1.5 text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
                            title="Delete"
                            onClick={() => handleDelete(ep.id, ep.title)}
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
