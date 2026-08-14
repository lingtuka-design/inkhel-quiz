import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Calendar,
  CheckCircle2,
  Clapperboard,
  Edit,
  Eye,
  FileQuestion,
  HelpCircle,
  ListOrdered,
  Plus,
  Search,
  Timer,
  Trash2,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Input, Modal, toast } from '../../components/ui'
import { RoundBanner, roundStatusBadge } from '../../components/rounds'
import { deleteRound, setRoundStatus } from '../../services/roundService'
import { queryClient } from '../../lib/query'
import { formatDate } from '../../lib/utils'
import type { Round, RoundStatus } from '../../types'

export function AdminRoundsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data: rounds = [], isLoading, refetch } = useQuery<Round[]>({
    queryKey: ['adminRounds'],
    queryFn: async () => {
      const res = await fetch('/api/rounds')
      if (!res.ok) throw new Error('Failed to fetch rounds')
      return res.json()
    },
  })

  const { data: seasons = [] } = useQuery({
    queryKey: ['adminSeasons'],
    queryFn: async () => {
      const res = await fetch('/api/seasons')
      if (!res.ok) return []
      return res.json()
    },
  })

  const monthMap = useMemo(() => {
    const map = new Map<string, { monthName: string; seasonName: string }>()
    for (const s of seasons as any[]) {
      if (Array.isArray(s.months)) {
        for (const m of s.months) {
          map.set(m.id, {
            monthName: m.name || m.slug,
            seasonName: s.name,
          })
        }
      }
    }
    return map
  }, [seasons])

  const filtered = useMemo(() => {
    return rounds.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = r.title.toLowerCase().includes(q)
        const matchDesc = r.description?.toLowerCase().includes(q)
        return matchTitle || matchDesc
      }
      return true
    })
  }, [rounds, search, statusFilter])

  const stats = useMemo(() => {
    const total = rounds.length
    const published = rounds.filter((r) => r.status === 'published').length
    const draft = rounds.filter((r) => r.status === 'draft').length
    const totalQuestions = rounds.reduce((acc, r: any) => acc + (r.questionCount || 0), 0)
    return { total, published, draft, totalQuestions }
  }, [rounds])

  const handleToggleStatus = async (round: Round) => {
    const nextStatus: RoundStatus = round.status === 'published' ? 'draft' : 'published'
    setBusyId(round.id)
    try {
      await setRoundStatus(round.id, nextStatus)
      toast(`Round is now ${nextStatus}`, 'success')
      await refetch()
      await queryClient.invalidateQueries({ queryKey: ['rounds'] })
    } catch (err: any) {
      toast(err.message || 'Failed to update round status', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setBusyId(deletingId)
    try {
      await deleteRound(deletingId)
      toast('Round deleted successfully', 'success')
      setDeletingId(null)
      await refetch()
      await queryClient.invalidateQueries({ queryKey: ['rounds'] })
    } catch (err: any) {
      toast(err.message || 'Failed to delete round', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Quiz Rounds</h1>
          <p className="mt-1 text-sm text-ink-300">
            Overview and manage all quiz rounds across every season and month.
          </p>
        </div>
        <Link to="/admin/seasons">
          <Button icon={Plus}>Create via Season</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-ink-300">Total Rounds</p>
              <p className="font-display text-xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-ink-300">Published</p>
              <p className="font-display text-xl font-bold text-emerald-400">{stats.published}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-ink-300">Drafts</p>
              <p className="font-display text-xl font-bold text-amber-400">{stats.draft}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <FileQuestion className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-ink-300">Total Questions</p>
              <p className="font-display text-xl font-bold text-cyan-400">{stats.totalQuestions}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              type="text"
              placeholder="Search rounds by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'published', 'draft', 'scheduled', 'archived'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Rounds List */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-ink-300">Loading rounds...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Clapperboard className="mx-auto h-12 w-12 text-ink-400 opacity-40" />
          <h3 className="mt-3 font-display text-lg font-semibold text-white">No rounds found</h3>
          <p className="mt-1 text-sm text-ink-300">
            {search ? 'Try clearing your search query.' : 'Create a round inside a Season month to get started.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((round: any) => {
            const meta = monthMap.get(round.monthId)
            const badge = roundStatusBadge(round)
            return (
              <Card key={round.id} className="overflow-hidden p-5 transition-all hover:border-white/20">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left info */}
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10">
                      <RoundBanner round={round} className="h-full w-full" iconSize="h-8 w-8" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-white sm:text-lg">
                          {round.title}
                        </h3>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {meta && (
                          <span className="text-xs font-medium text-ink-300">
                            {meta.seasonName} · {meta.monthName}
                          </span>
                        )}
                      </div>

                      {round.description && (
                        <p className="line-clamp-2 text-xs text-ink-300 sm:text-sm">
                          {round.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-ink-400">
                        <span className="flex items-center gap-1">
                          <FileQuestion className="h-3.5 w-3.5 text-violet-400" />
                          <strong className="text-white">{round.questionCount || 0}</strong> questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-cyan-400" />
                          <strong className="text-white">{round.participantCount || 0}</strong> played
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-3.5 w-3.5 text-amber-400" />
                          {Math.round(round.timeLimitSeconds / 60)} mins limit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                    <Link to={`/admin/rounds/${round.id}/questions`}>
                      <Button variant="secondary" size="sm" icon={FileQuestion}>
                        Questions ({round.questionCount || 0})
                      </Button>
                    </Link>

                    <Link to={`/admin/rounds/${round.id}/leaderboard`}>
                      <Button variant="outline" size="sm" icon={Trophy}>
                        Leaderboard
                      </Button>
                    </Link>

                    <Link to={`/admin/rounds/${round.id}`}>
                      <Button variant="ghost" size="sm" icon={Edit}>
                        Edit
                      </Button>
                    </Link>

                    <Button
                      variant={round.status === 'published' ? 'outline' : 'primary'}
                      size="sm"
                      loading={busyId === round.id}
                      onClick={() => handleToggleStatus(round)}
                    >
                      {round.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setDeletingId(round.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Round"
      >
        <p className="text-sm text-ink-300">
          Are you sure you want to delete this round? All questions, options, and attempt scores for this round will be permanently removed.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-500"
            loading={busyId === deletingId}
            onClick={handleDelete}
          >
            Delete Round
          </Button>
        </div>
      </Modal>
    </div>
  )
}
