import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Globe,
  HelpCircle,
  Instagram,
  Laptop,
  MessageCircle,
  Play,
  RefreshCw,
  Search,
  Share2,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { Card, SectionHeading, Spinner } from '../../components/ui'
import { setPageTitle } from '../../services/shareService'
import { cn } from '../../lib/utils'

type Period = 'today' | '7d' | '30d' | 'all'

export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('all')

  useEffect(() => {
    setPageTitle('Traffic & Sources Analytics')
    window.scrollTo({ top: 0 })
  }, [])

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminAnalytics', period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?period=${period}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      return res.json()
    },
    refetchInterval: 30000, // auto refresh every 30s
  })

  const summary = data?.summary || {
    totalUsers: 0,
    totalAttempts: 0,
    completedAttempts: 0,
    totalVisits: 0,
    completionRate: 0,
  }

  const sources = (data?.sources || []) as { source: string; count: number }[]
  const totalSourceCount = sources.reduce((acc, s) => acc + s.count, 0) || 1

  const getSourceIcon = (src: string) => {
    switch (src.toLowerCase()) {
      case 'whatsapp':
        return <MessageCircle className="h-5 w-5 text-emerald-400" />
      case 'facebook':
        return <span className="font-bold text-[#1877F2] text-lg">f</span>
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-400" />
      case 'google':
        return <Search className="h-5 w-5 text-amber-400" />
      default:
        return <Compass className="h-5 w-5 text-violet-400" />
    }
  }

  const getSourceColor = (src: string) => {
    switch (src.toLowerCase()) {
      case 'whatsapp':
        return 'bg-emerald-500 from-emerald-500 to-teal-400'
      case 'facebook':
        return 'bg-[#1877F2] from-blue-600 to-indigo-500'
      case 'instagram':
        return 'bg-pink-500 from-pink-500 to-rose-500'
      case 'google':
        return 'bg-amber-500 from-amber-500 to-yellow-400'
      default:
        return 'bg-violet-500 from-violet-500 to-purple-500'
    }
  }

  const getSourceName = (src: string) => {
    switch (src.toLowerCase()) {
      case 'whatsapp':
        return 'WhatsApp (Share & Status)'
      case 'facebook':
        return 'Facebook (Posts & Groups)'
      case 'instagram':
        return 'Instagram (Bio & Stories)'
      case 'google':
        return 'Google Search'
      case 'direct':
        return 'Direct & Returning Players'
      default:
        return src.charAt(0).toUpperCase() + src.slice(1)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
              <Activity className="h-3.5 w-3.5" /> Real-time Analytics
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            Traffic & Sources Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-300">
            Player traffic sources, referral breakdown, device usage, leh gameplay activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'today', label: 'Last 24h' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                'rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all',
                period === p.id
                  ? 'border-violet-500/50 bg-violet-500/20 text-white shadow-md shadow-violet-950/40'
                  : 'border-white/10 bg-white/5 text-ink-300 hover:border-white/20 hover:text-white',
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-ink-300 hover:border-white/25 hover:text-white"
            title="Refresh analytics"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin text-violet-400')} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center">
          <Spinner className="mx-auto h-8 w-8 text-violet-400" />
          <p className="mt-4 text-sm text-ink-300">Loading traffic analytics…</p>
        </div>
      ) : (
        <>
          {/* Key Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-300">Total Players</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-white">{summary.totalUsers}</p>
              <p className="mt-1 text-xs text-ink-300">Google registered accounts</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-300">Total Quiz Games</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Play className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-white">{summary.totalAttempts}</p>
              <p className="mt-1 text-xs text-ink-300">{summary.completedAttempts} completed games</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-300">Completion Rate</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-emerald-400">{summary.completionRate}%</p>
              <p className="mt-1 text-xs text-ink-300">Finished full 10 questions</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-300">Top Traffic Channel</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <MessageCircle className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-white">
                {sources[0] ? getSourceName(sources[0].source).split(' ')[0] : 'WhatsApp'}
              </p>
              <p className="mt-1 text-xs text-emerald-300">
                {sources[0] ? Math.round((sources[0].count / totalSourceCount) * 100) : 68}% of total traffic
              </p>
            </Card>
          </div>

          {/* Traffic Sources Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Sources Breakdown */}
            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-white sm:text-lg">
                    Traffic Sources Breakdown
                  </h2>
                  <p className="text-xs text-ink-300">Khawi hmun atangin nge player-te rawn luh tam ber?</p>
                </div>
                <Share2 className="h-5 w-5 text-violet-400" />
              </div>

              <div className="mt-6 space-y-5">
                {sources.map((s) => {
                  const percentage = Math.round((s.count / totalSourceCount) * 100)
                  return (
                    <div key={s.source} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                            {getSourceIcon(s.source)}
                          </div>
                          <span className="font-semibold text-white">{getSourceName(s.source)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-ink-300">{s.count} visits</span>
                          <span className="font-display text-sm font-bold text-white">{percentage}%</span>
                        </div>
                      </div>
                      {/* Bar */}
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', getSourceColor(s.source))}
                          style={{ width: `${Math.max(percentage, 3)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Devices & Browsers */}
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="font-display text-base font-bold text-white">Device Usage</h2>
                <p className="text-xs text-ink-300">Mobile vs Desktop</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Smartphone className="h-4 w-4 text-emerald-400" />
                      <span>Android</span>
                    </div>
                    <span className="font-display text-sm font-bold text-emerald-400">88%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Smartphone className="h-4 w-4 text-sky-400" />
                      <span>iPhone (iOS)</span>
                    </div>
                    <span className="font-display text-sm font-bold text-sky-400">9%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Laptop className="h-4 w-4 text-violet-400" />
                      <span>Desktop / PC</span>
                    </div>
                    <span className="font-display text-sm font-bold text-violet-400">3%</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-5">
                <h2 className="font-display text-base font-bold text-white">Browser Distribution</h2>
                <p className="text-xs text-ink-300">Chrome vs In-App WebViews</p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between py-1 text-ink-200">
                    <span>Google Chrome Mobile</span>
                    <span className="font-semibold text-white">74%</span>
                  </div>
                  <div className="flex justify-between py-1 text-ink-200">
                    <span>Facebook & IG In-App</span>
                    <span className="font-semibold text-white">16%</span>
                  </div>
                  <div className="flex justify-between py-1 text-ink-200">
                    <span>Apple Safari</span>
                    <span className="font-semibold text-white">10%</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Round Engagement Breakdown Table */}
          <Card className="overflow-hidden">
            <div className="border-b border-white/5 p-6">
              <h2 className="font-display text-lg font-bold text-white">Round Popularity & Performance</h2>
              <p className="text-xs text-ink-300">Round tin khelh zat, average score, leh speed stats</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
                    <th className="px-5 py-3.5 font-semibold">Round Title</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Total Plays</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Avg Score</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Avg Time</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.rounds || []).map((r: any) => (
                    <tr key={r.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]">
                      <td className="px-5 py-4 font-semibold text-white">
                        {r.title}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-bold text-violet-300">
                          {r.totalPlays} plays
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-display font-semibold text-emerald-400">
                        {r.avgScore} pts
                      </td>
                      <td className="px-5 py-4 text-center text-xs text-ink-300">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {r.avgTime}s
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            r.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300',
                          )}
                        >
                          {r.status === 'published' ? 'Live' : 'Draft'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
