import { useEffect, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Calendar,
  CalendarRange,
  CheckCircle2,
  Clapperboard,
  FileEdit,
  Gauge,
  Globe,
  Pencil,
  Play,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Badge, Button, Card, SectionHeading, StatCard } from '../../components/ui'
import { listRounds, countQuestions, countParticipants, countAttempts as countRoundAttempts } from '../../services/roundService'
import { getActiveSeason, listSeasons } from '../../services/seasonService'
import { getCurrentMonth, listAllMonths, monthStatus } from '../../services/monthService'
import { getDb } from '../../db/database'
import { roundStatusBadge } from '../../components/rounds'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import { GoogleIcon } from '../../components/layout'

export function AdminDashboardPage() {
  useEffect(() => setPageTitle('Dashboard'), [])

  const { data: rounds = [] } = useQuery<any[]>({
    queryKey: ['adminDashboardRounds'],
    initialData: () => listRounds(),
    staleTime: 30000,
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) return await res.json()
      } catch {}
      return listRounds()
    },
  })

  const { data: seasons = [] } = useQuery<any[]>({
    queryKey: ['adminDashboardSeasons'],
    initialData: () => listSeasons(),
    staleTime: 30000,
    queryFn: async () => {
      try {
        const res = await fetch('/api/seasons')
        if (res.ok) return await res.json()
      } catch {}
      return listSeasons()
    },
  })

  const { data: usersData } = useQuery({
    queryKey: ['adminUsersSummary'],
    staleTime: 30000,
    queryFn: async () => {
      try {
        const res = await fetch('/api/participants?summary=true')
        if (res.ok) return await res.json()
      } catch {}
      return { total: 0, googleCount: 0, guestCount: 0 }
    },
  })

  const months = useMemo(() => {
    const allM: any[] = []
    for (const s of seasons) {
      if (Array.isArray(s.months)) allM.push(...s.months)
    }
    return allM.length > 0 ? allM : listAllMonths()
  }, [seasons])

  const activeSeason = useMemo(() => {
    return seasons.find((s: any) => s.status === 'active') ?? getActiveSeason()
  }, [seasons])

  const currentMonth = useMemo(() => {
    if (!months || months.length === 0) return getCurrentMonth()
    const now = Date.now()
    const open = months.filter((m: any) => {
      const start = new Date(m.startDate).getTime()
      const end = new Date(m.endDate).getTime()
      return now >= start && now <= end
    })
    return open.sort((a: any, b: any) => a.startDate.localeCompare(b.startDate))[0] ?? months[0] ?? null
  }, [months])

  const { data: stats } = useQuery({
    queryKey: ['adminStats', rounds.length],
    queryFn: () => {
      const total = rounds.length
      const published = rounds.filter((r) => r.status === 'published').length
      const drafts = rounds.filter((r) => r.status === 'draft').length
      const totalQuestions = rounds.reduce((acc, r: any) => acc + (r.questionCount || 0), 0)
      const totalParticipants = rounds.reduce((acc, r: any) => acc + (r.participantCount || 0), 0)
      return {
        total,
        published,
        drafts,
        attempts: totalParticipants,
        avg: 0,
        popular: rounds[0] ? { r: rounds[0], count: rounds[0].participantCount || 0 } : null,
      }
    },
  })

  const participantsList = usersData?.participants ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-300">
            {currentMonth
              ? `${currentMonth.name} is underway — rounds close ${formatDate(currentMonth.endDate)}`
              : activeSeason
                ? `${activeSeason.name} is active`
                : 'No active season — create one to publish rounds.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/seasons/new">
            <Button variant="secondary" size="sm" icon={Calendar}>
              New Season
            </Button>
          </Link>
          <Link to={`/admin/rounds/new?monthId=${currentMonth?.id ?? ''}`}>
            <Button size="sm" icon={Clapperboard}>
              New Round
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Registered Users"
          value={usersData?.total ?? 0}
          accent="sky"
        />
        <StatCard
          icon={UserCheck}
          label="Google Users"
          value={usersData?.googleCount ?? 0}
          accent="emerald"
        />
        <StatCard
          icon={Clapperboard}
          label="Total Rounds"
          value={stats?.total ?? '—'}
          accent="violet"
        />
        <StatCard
          icon={Play}
          label="Published Rounds"
          value={stats?.published ?? '—'}
          accent="emerald"
        />
        <StatCard
          icon={FileEdit}
          label="Draft Rounds"
          value={stats?.drafts ?? '—'}
          accent="amber"
        />
        <StatCard
          icon={Zap}
          label="Quiz Attempts"
          value={stats?.attempts ?? '—'}
          accent="rose"
        />
        <StatCard
          icon={CalendarRange}
          label="Current Month"
          value={currentMonth?.name ?? '—'}
          accent="violet"
        />
        <StatCard
          icon={Gauge}
          label="Average Score"
          value={stats?.avg ?? '—'}
          accent="amber"
        />
      </div>


      {/* Recent Rounds Section */}
      <section>
        <SectionHeading
          eyebrow="Activity"
          title="Recent rounds"
          action={
            <Link to="/admin/rounds" className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300">
              Manage all →
            </Link>
          }
        />
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
                  <th className="px-4 py-3 font-semibold">Round</th>
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 text-center font-semibold">Questions</th>
                  <th className="px-4 py-3 text-center font-semibold">Time</th>
                  <th className="px-4 py-3 text-center font-semibold">Players</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rounds?.slice(0, 8).map((round) => {
                  const badge = roundStatusBadge(round)
                  const month = months?.find((m) => m.id === round.monthId)
                  return (
                    <tr key={round.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-semibold text-white">{round.title}</td>
                      <td className="px-4 py-3 text-ink-200">{month?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-ink-200">
                        <span className="font-semibold text-white">{round.questionCount || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-ink-200">{Math.round(round.timeLimitSeconds / 60)}m</td>
                      <td className="px-4 py-3 text-center text-ink-200">
                        <span className="font-semibold text-white">{round.participantCount || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-200">{formatDate(round.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/rounds/${round.id}`}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-500/10"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading eyebrow="Quick actions" title="Jump right in" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/admin/seasons/new', icon: Calendar, label: 'Create Season', desc: '10 months, 10 battles' },
            {
              to: `/admin/rounds/new?monthId=${currentMonth?.id ?? ''}`,
              icon: Clapperboard,
              label: 'Create Round',
              desc: 'Build a fresh quiz for this month',
            },
            { to: '/admin/seasons', icon: FileEdit, label: 'Manage Seasons', desc: 'View months, edit, activate' },
            { to: '/leaderboard', icon: Trophy, label: 'View Leaderboard', desc: 'Round · month · season' },
          ].map((a) => (
            <Link key={a.to} to={a.to}>
              <Card className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:border-violet-500/30">
                <a.icon className="h-6 w-6 text-violet-400 transition-transform group-hover:scale-110" />
                <p className="mt-3 font-semibold text-white">{a.label}</p>
                <p className="mt-1 text-xs text-ink-300">{a.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
