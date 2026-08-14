import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GoogleIcon } from '../../components/layout'
import {
  Calendar,
  CheckCircle2,
  Mail,
  Search,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Badge, Card, Input, SectionHeading, StatCard } from '../../components/ui'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'

export function AdminUsersPage() {
  useEffect(() => setPageTitle('Registered Users'), [])

  const [search, setSearch] = useState('')

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsersList'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/participants?list=true')
        if (res.ok) return await res.json()
      } catch {}
      return { total: 0, googleCount: 0, guestCount: 0, participants: [] }
    },
  })

  const participants = usersData?.participants ?? []
  const filtered = participants.filter((p: any) => {
    const q = search.toLowerCase()
    return (
      (p.displayName && p.displayName.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.provider && p.provider.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Registered Users</h1>
          <p className="mt-1 text-sm text-ink-300">
            View and manage players registered through Google Sign-In and guest accounts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total Registered Users"
          value={usersData?.total ?? 0}
          accent="sky"
        />
        <StatCard
          icon={UserCheck}
          label="Google Verified Users"
          value={usersData?.googleCount ?? 0}
          accent="emerald"
        />
        <StatCard
          icon={Zap}
          label="Guest Accounts"
          value={usersData?.guestCount ?? 0}
          accent="violet"
        />
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <Input
            className="pl-10"
            placeholder="Search by name, email or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-ink-300">Loading registered users...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-300">
            {search ? 'No users matching search criteria.' : 'No users registered yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 text-center font-semibold">Provider</th>
                  <th className="px-4 py-3 text-center font-semibold">Rounds Played</th>
                  <th className="px-4 py-3 text-center font-semibold">Total Points</th>
                  <th className="px-4 py-3 text-center font-semibold">Best Score</th>
                  <th className="px-4 py-3 text-right font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          name={p.displayName}
                          gradient={p.avatarGradient}
                          photoUrl={p.photoUrl}
                          size="sm"
                        />
                        <span className="font-semibold text-white">{p.displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-300">
                      {p.email || <span className="italic text-ink-300/60">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.provider === 'google' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                          <GoogleIcon className="h-3 w-3" /> Google
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-ink-300">
                          Guest
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-white">{p.roundsPlayed || 0}</td>
                    <td className="px-4 py-3 text-center font-display font-bold text-gradient">
                      {p.totalPoints || 0}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-white">
                      {p.bestScore || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-ink-300">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
