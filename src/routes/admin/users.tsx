import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GoogleIcon } from '../../components/layout'
import {
  Calendar,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
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
      const res = await fetch('/api/participants?list=true')
      if (!res.ok) throw new Error('Failed to fetch participants')
      return res.json()
    },
  })

  const participants = (usersData?.participants || []) as any[]
  const total = usersData?.total ?? participants.length
  const googleCount = usersData?.googleCount ?? participants.filter((p) => p.provider === 'google').length

  const filtered = participants.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.displayName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phoneNumber?.includes(q)
    )
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Registered Users</h1>
        <p className="mt-1 text-sm text-ink-300">
          All registered participants, contact phone numbers, and overall gameplay statistics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Players"
          value={total}
          accent="sky"
          icon={Users}
        />
        <StatCard
          label="Google Verified"
          value={googleCount}
          accent="emerald"
          icon={UserCheck}
        />
        <StatCard
          label="With Phone Number"
          value={participants.filter((p) => p.phoneNumber).length}
          accent="violet"
          icon={Phone}
        />
      </div>

      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading
            title="All Players"
            subtitle={`${filtered.length} of ${total} players`}
          />
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone…"
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-ink-300">Loading registered users...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-ink-300">
            {search ? 'No users matching your search.' : 'No users registered yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone / WhatsApp</th>
                  <th className="px-4 py-3 text-center font-semibold">Provider</th>
                  <th className="px-4 py-3 text-center font-semibold">Rounds Played</th>
                  <th className="px-4 py-3 text-center font-semibold">Total Points</th>
                  <th className="px-4 py-3 text-center font-semibold">Best Score</th>
                  <th className="px-4 py-3 text-right font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => {
                  const phone = p.phoneNumber
                  const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
                  const waUrl = cleanPhone
                    ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=Hi%20${encodeURIComponent(p.displayName)},%20Inkhel%20Quiz%20atanga%20rawn%20be%20che%20kan%20ni%20e.`
                    : null

                  return (
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
                      <td className="px-4 py-3">
                        {phone && waUrl ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-emerald-400">{phone}</span>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-emerald-500/20 p-1 text-emerald-400 hover:bg-emerald-500/30 hover:text-white"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs italic text-ink-500">—</span>
                        )}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
