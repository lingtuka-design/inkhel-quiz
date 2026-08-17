import { Link } from '@tanstack/react-router'
import { Calendar, CalendarPlus, CalendarRange, ChevronRight, Clapperboard, Plus, Trophy, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, EmptyState, SectionHeading, toast } from '../../components/ui'
import { listSeasons } from '../../services/seasonService'
import { listMonths, monthStatus } from '../../services/monthService'
import { listRoundsByMonth } from '../../services/roundService'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import { useEffect } from 'react'
import { cn } from '../../lib/utils'

export function AdminSeasonsPage() {
  useEffect(() => setPageTitle('Monthly Tournaments'), [])

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: listSeasons,
  })

  const activeSeason = seasons?.find((s) => s.status === 'active') ?? seasons?.[0]
  const months = activeSeason ? listMonths(activeSeason.id) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Monthly Tournaments</h1>
          <p className="mt-1 text-sm text-ink-300">
            Thla tin tournament buatsaih la, Quiz Round-te dah lutin, Leaderboard leh thla tin lawmman sem dan enkawl rawh le.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/rounds/new">
            <Button size="sm" icon={Plus} className="bg-gradient-to-r from-violet-600 to-indigo-600 font-bold">
              New Quiz Round
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {months.map((m) => {
          const status = monthStatus(m)
          const isOpen = status === 'open'
          const rounds = listRoundsByMonth(m.id)

          return (
            <Card
              key={m.id}
              className={cn(
                'p-5 sm:p-6 transition-all border',
                isOpen
                  ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-ink-900 to-ink-900/90 shadow-lg shadow-emerald-950/20'
                  : 'border-white/10 bg-ink-900/60',
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                      isOpen
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/5 text-ink-300',
                    )}
                  >
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admin/seasons/${activeSeason?.id}/months/${m.id}`}
                        className="font-display text-lg font-bold text-white hover:text-violet-300 transition-colors"
                      >
                        {m.name} Tournament
                      </Link>
                      {isOpen ? (
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
                          🟢 Live Now
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-ink-300">
                          {status === 'upcoming' ? '⏳ Upcoming' : '🔒 Closed'}
                        </span>
                      )}
                      {m.name.includes('September') && (
                        <span className="rounded-full bg-yellow-500/20 border border-yellow-500/40 px-2.5 py-0.5 text-xs font-bold text-yellow-300">
                          🎁 ₹2,000 Prize Starts
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-300">
                      {formatDate(m.startDate)} — {formatDate(m.endDate)} ·{' '}
                      <span className="font-semibold text-white">{rounds.length} Quiz Rounds</span> awm mek
                    </p>

                    {rounds.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {rounds.slice(0, 8).map((r) => (
                          <Link
                            key={r.id}
                            to={`/admin/rounds/${r.id}`}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-ink-200 hover:border-violet-500/40 hover:text-white transition-colors"
                          >
                            ⚽ {r.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/seasons/${activeSeason?.id}/months/${m.id}`}>
                    <Button
                      variant={isOpen ? 'primary' : 'secondary'}
                      size="sm"
                      icon={Clapperboard}
                      className={isOpen ? 'bg-gradient-to-r from-emerald-600 to-teal-600 font-bold' : ''}
                    >
                      Manage Rounds ({rounds.length})
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                  <Link to="/leaderboard">
                    <Button variant="ghost" size="sm" icon={Trophy}>
                      Leaderboard
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
