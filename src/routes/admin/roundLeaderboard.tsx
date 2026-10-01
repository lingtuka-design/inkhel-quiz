import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Mail,
  Medal,
  MessageCircle,
  Phone,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { BackLink } from '../../components/layout'
import { LeaderboardTable, RankingTable, RankBadge } from '../../components/leaderboard'
import { Avatar, Badge, Button, Card, toast } from '../../components/ui'
import { countQuestions, listRounds } from '../../services/roundService'
import { listAllMonths } from '../../services/monthService'
import { getMonthRanking, getRoundLeaderboard } from '../../services/leaderboardService'
import { setPageTitle } from '../../services/shareService'
import { formatTime, formatDate } from '../../lib/utils'
import type { Round, RankingRow } from '../../types'

type LeaderboardTab = 'monthly' | 'round'
type RankFilter = 'top10' | 'top3' | 'all'

export function AdminRoundLeaderboardPage() {
  const { roundId: routeRoundId } = useParams({ strict: false })

  // Active Tab: default to 'monthly' unless routeRoundId is explicitly given
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(routeRoundId ? 'round' : 'monthly')
  const [selectedRoundId, setSelectedRoundId] = useState<string>(routeRoundId || '')
  const [rankFilter, setRankFilter] = useState<RankFilter>('top10')

  const DEFAULT_ADMIN_MONTHS = [
    {
      id: 'season_1786731482471_m2',
      name: 'September 2026',
      seasonName: 'Inkhel Mega Quiz 2026-27',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.999Z',
    },
    {
      id: 'season_1786731482471_m3',
      name: 'October 2026',
      seasonName: 'Inkhel Mega Quiz 2026-27',
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.999Z',
    },
    {
      id: 'season_1786731482471_m1',
      name: 'August 2026',
      seasonName: 'Inkhel Mega Quiz 2026-27',
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-08-31T23:59:59.999Z',
    },
  ]

  // 1. Fetch all seasons/months with real D1 initialData
  const { data: dbMonths = [] } = useQuery({
    queryKey: ['adminMonthsList'],
    initialData: () => DEFAULT_ADMIN_MONTHS,
    queryFn: async () => {
      try {
        const res = await fetch('/api/seasons')
        if (res.ok) {
          const data = await res.json()
          const ms: any[] = []
          for (const s of data) {
            if (Array.isArray(s.months)) {
              for (const m of s.months) {
                ms.push({
                  id: m.id,
                  name: m.name || m.slug,
                  seasonName: s.name,
                  startDate: m.startDate,
                  endDate: m.endDate,
                })
              }
            }
          }
          if (ms.length > 0) return ms.sort((a, b) => a.startDate.localeCompare(b.startDate))
        }
      } catch {}
      return DEFAULT_ADMIN_MONTHS
    },
  })

  const months = useMemo(() => {
    if (Array.isArray(dbMonths) && dbMonths.length > 0) return dbMonths
    return DEFAULT_ADMIN_MONTHS
  }, [dbMonths])

  // September 2026 is the tournament month that just ended and where prize winners are!
  const septMonth = useMemo(() => {
    return months.find((m: any) => m.name.toLowerCase().includes('september')) || months[0]
  }, [months])

  const [selectedMonthId, setSelectedMonthId] = useState<string>('season_1786731482471_m2')

  // When dbMonths updates from API, ensure selectedMonthId is synced
  useEffect(() => {
    if (Array.isArray(dbMonths) && dbMonths.length > 0) {
      const exists = dbMonths.some((m: any) => m.id === selectedMonthId)
      if (!exists) {
        const sept = dbMonths.find((m: any) => m.name?.toLowerCase().includes('september'))
        if (sept) {
          setSelectedMonthId(sept.id)
        } else if (dbMonths[0]) {
          setSelectedMonthId(dbMonths[0].id)
        }
      }
    }
  }, [dbMonths, selectedMonthId])

  // 2. Fetch all rounds with initialData
  const { data: rounds = [] } = useQuery<Round[]>({
    queryKey: ['adminRounds'],
    initialData: () => listRounds(),
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) return data
        }
      } catch {}
      return listRounds()
    },
  })

  // Sync routeRoundId or pick default
  useEffect(() => {
    if (routeRoundId) {
      setSelectedRoundId(routeRoundId)
      setActiveTab('round')
    } else if (!selectedRoundId && rounds.length > 0) {
      const first = rounds.find((r) => r.status === 'published') || rounds[0]
      if (first) setSelectedRoundId(first.id)
    }
  }, [routeRoundId, rounds, selectedRoundId])

  const currentRound = useMemo(() => {
    return rounds.find((r) => r.id === selectedRoundId) || null
  }, [rounds, selectedRoundId])

  const currentMonth = useMemo(() => {
    return months.find((m) => m.id === selectedMonthId) || null
  }, [months, selectedMonthId])

  // Filtered rounds for round tab
  const filteredRounds = useMemo(() => {
    if (!selectedMonthId) return rounds
    return rounds.filter((r) => r.monthId === selectedMonthId)
  }, [rounds, selectedMonthId])

  // Monthly rankings data
  const { data: monthlyRows = [], isLoading: monthlyLoading } = useQuery<RankingRow[]>({
    queryKey: ['monthRankings', selectedMonthId],
    queryFn: () => getMonthRanking(selectedMonthId),
    enabled: !!selectedMonthId,
  })

  // Round leaderboard data
  const { data: roundRows = [], isLoading: roundLoading } = useQuery({
    queryKey: ['leaderboard', selectedRoundId],
    queryFn: () => getRoundLeaderboard(selectedRoundId),
    enabled: !!selectedRoundId && activeTab === 'round',
  })

  const { data: totalQuestions } = useQuery({
    queryKey: ['questions', selectedRoundId, 'count'],
    queryFn: () => countQuestions(selectedRoundId),
    enabled: !!selectedRoundId && activeTab === 'round',
  })

  useEffect(() => {
    if (activeTab === 'monthly') {
      setPageTitle(`Monthly Top 10 — ${currentMonth?.name || 'Tournament'}`)
    } else if (currentRound) {
      setPageTitle(`Leaderboard — ${currentRound.title}`)
    }
  }, [activeTab, currentMonth, currentRound])

  // Display rows for Monthly Leaderboard
  const displayMonthlyRows = useMemo(() => {
    if (rankFilter === 'top3') return monthlyRows.slice(0, 3)
    if (rankFilter === 'top10') return monthlyRows.slice(0, 10)
    return monthlyRows
  }, [monthlyRows, rankFilter])

  // Display rows for Round Leaderboard
  const displayRoundRows = useMemo(() => {
    if (rankFilter === 'top3') return roundRows.slice(0, 3)
    if (rankFilter === 'top10') return roundRows.slice(0, 10)
    return roundRows
  }, [roundRows, rankFilter])

  // Top 3 Winners in Monthly Tournament
  const monthlyWinner1 = monthlyRows[0] || null
  const monthlyWinner2 = monthlyRows[1] || null
  const monthlyWinner3 = monthlyRows[2] || null

  // Copy contacts for Monthly Leaderboard
  const handleCopyMonthlyContacts = (type: 'email' | 'phone') => {
    const targetRows = monthlyRows.slice(0, 10)
    const list = targetRows
      .map((r) => (type === 'email' ? r.participant.email : r.participant.phoneNumber))
      .filter(Boolean) as string[]

    if (list.length === 0) {
      toast(`Top 10 zingah ${type} record a awm lo.`, 'error')
      return
    }

    navigator.clipboard.writeText(list.join(', '))
    toast(`Top 10 ${type === 'email' ? 'Emails' : 'Phone Numbers'} copy a ni ta!`, 'success')
  }

  // Export Monthly CSV
  const handleExportMonthlyCSV = () => {
    if (monthlyRows.length === 0) return
    const headers = [
      'Rank',
      'Name',
      'Email',
      'Phone',
      'Rounds Played',
      'Total Correct Answers',
      'Average Time (seconds)',
      'Total Points',
    ]

    const csvData = monthlyRows.map((r) => [
      r.rank,
      `"${r.participant.displayName.replace(/"/g, '""')}"`,
      `"${r.participant.email || ''}"`,
      `"${r.participant.phoneNumber || ''}"`,
      r.rounds,
      r.totalCorrect,
      r.avgTimeSeconds,
      r.points,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvData.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `monthly-leaderboard-${currentMonth?.name?.toLowerCase().replace(/\s+/g, '-') || 'standings'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast('Monthly Leaderboard CSV download fel a ni e.', 'success')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <BackLink to="/admin" label="Dashboard" />
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-yellow-500/10 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-950/20">
              <Trophy className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Tournament Leaderboards
              </h1>
              <p className="text-sm text-ink-300">
                Thla tin Top 10 (Lawmman semna), player phone/email, points, round khelh zat, leh dik zat.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons for Active Tab */}
          {activeTab === 'monthly' && monthlyRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Phone}
                onClick={() => handleCopyMonthlyContacts('phone')}
                title="Copy Top 10 Phone Numbers"
              >
                Copy Top 10 Phones
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Mail}
                onClick={() => handleCopyMonthlyContacts('email')}
                title="Copy Top 10 Emails"
              >
                Copy Top 10 Emails
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={handleExportMonthlyCSV}
                title="Download CSV"
              >
                Export CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Mode Tabs: Monthly Tournament vs Round Leaderboard */}
      <div className="flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
            activeTab === 'monthly'
              ? 'border-amber-400 text-amber-300 bg-amber-500/10'
              : 'border-transparent text-ink-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Monthly Leaderboard (Thla tin Top 10 — Lawmman Semna)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('round')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-all ${
            activeTab === 'round'
              ? 'border-violet-500 text-violet-300 bg-violet-500/10'
              : 'border-transparent text-ink-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Round Leaderboard (Round tin)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: MONTHLY LEADERBOARD (PRIMARY) */}
      {/* ============================================================== */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Switcher Tabs */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Thlan Tur Thla (Tournament Month)
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {months.map((m) => {
                    const active = m.id === selectedMonthId
                    const isSept = m.name.toLowerCase().includes('september')
                    const isOct = m.name.toLowerCase().includes('october')
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMonthId(m.id)}
                        className={`rounded-xl px-4 py-2 text-sm font-bold transition-all flex items-center gap-2 ${
                          active
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-950/30 ring-2 ring-amber-400'
                            : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white border border-white/5'
                        }`}
                      >
                        <Calendar className="h-4 w-4" />
                        <span>{m.name}</span>
                        {isSept && (
                          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold">
                            🏆 Lawmman Semna
                          </span>
                        )}
                        {isOct && (
                          <span className="rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold">
                            ⚡ Live
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {currentMonth && (
                <div className="text-xs text-ink-400 sm:text-right">
                  <span className="font-semibold text-white">{currentMonth.seasonName}</span>
                  <div className="mt-0.5">
                    {formatDate(currentMonth.startDate)} — {formatDate(currentMonth.endDate)}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Top 3 Prize Winners Spotlight Cards (Lawmman dawng tu turte) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h2 className="font-display text-base font-bold text-white">
                  {currentMonth?.name} Lawmman Dawng Tu Turte (Top 3 Prize Winners)
                </h2>
              </div>
              <Badge tone="amber">
                {monthlyRows.length} Participants
              </Badge>
            </div>

            {monthlyLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 border-white/5 bg-white/5 animate-pulse">
                    <div className="h-5 w-24 bg-white/10 rounded mb-3" />
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-white/10" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-white/10 rounded" />
                        <div className="h-3 w-20 bg-white/10 rounded" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : monthlyRows.length === 0 ? (
              <Card className="p-8 text-center text-sm text-ink-300 border-amber-500/20 bg-amber-500/5">
                <p className="font-semibold text-white text-base">He thla ({currentMonth?.name}) ah hian participants an la awm rih lo.</p>
                <p className="mt-2 text-sm text-ink-300">
                  September 2026 thla tournament lawmman semna tur en duh chuan:
                </p>
                {septMonth && (
                  <Button
                    size="sm"
                    icon={Trophy}
                    onClick={() => setSelectedMonthId(septMonth.id)}
                    className="mt-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold"
                  >
                    September 2026 Leaderboard En Rawh
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* 1st Prize */}
                {monthlyWinner1 && (
                  <Card className="relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/20 border border-yellow-400/40 px-3 py-1 text-xs font-bold text-yellow-300">
                        🥇 1st Prize Winner
                      </span>
                      <span className="font-display text-xl font-black text-yellow-400">
                        {monthlyWinner1.points} <span className="text-xs font-normal text-yellow-300">pts</span>
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Avatar
                        name={monthlyWinner1.participant.displayName}
                        gradient={monthlyWinner1.participant.avatarGradient}
                        photoUrl={monthlyWinner1.participant.photoUrl}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white text-base">
                          {monthlyWinner1.participant.displayName}
                        </p>
                        <p className="text-xs text-ink-300 mt-0.5">
                          {monthlyWinner1.rounds} rounds · {monthlyWinner1.totalCorrect} dik
                        </p>
                      </div>
                    </div>

                    {/* Contact Buttons */}
                    <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-3">
                      {monthlyWinner1.participant.phoneNumber ? (
                        <a
                          href={`https://wa.me/${
                            monthlyWinner1.participant.phoneNumber.replace(/\D/g, '').length === 10
                              ? '91' + monthlyWinner1.participant.phoneNumber.replace(/\D/g, '')
                              : monthlyWinner1.participant.phoneNumber.replace(/\D/g, '')
                          }?text=Chibai%20${encodeURIComponent(
                            monthlyWinner1.participant.displayName
                          )},%20Inkhel%20Quiz%20${encodeURIComponent(
                            currentMonth?.name || 'Tournament'
                          )}-ah%201st%20Prize%20i%20dawng%20e!%20Lawmman%20dawn%20dan%20tur%20kan%20lo%20hrilh%20dawn%20che%20nia.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: {monthlyWinner1.participant.phoneNumber}
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400 italic">Phone number a dah lo</span>
                      )}

                      {monthlyWinner1.participant.email && (
                        <a
                          href={`mailto:${monthlyWinner1.participant.email}?subject=Inkhel%20Quiz%20${encodeURIComponent(
                            currentMonth?.name || ''
                          )}%201st%20Prize&body=Chibai%20${encodeURIComponent(
                            monthlyWinner1.participant.displayName
                          )},%20Inkhel%20Quiz%20lawmman%20dawng%20tu%20i%20ni%20e!`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 truncate"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{monthlyWinner1.participant.email}</span>
                        </a>
                      )}
                    </div>
                  </Card>
                )}

                {/* 2nd Prize */}
                {monthlyWinner2 && (
                  <Card className="relative overflow-hidden border-slate-300/30 bg-gradient-to-br from-slate-400/10 via-slate-500/5 to-transparent p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-300/20 border border-slate-300/40 px-3 py-1 text-xs font-bold text-slate-200">
                        🥈 2nd Prize Winner
                      </span>
                      <span className="font-display text-xl font-black text-slate-200">
                        {monthlyWinner2.points} <span className="text-xs font-normal text-slate-300">pts</span>
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Avatar
                        name={monthlyWinner2.participant.displayName}
                        gradient={monthlyWinner2.participant.avatarGradient}
                        photoUrl={monthlyWinner2.participant.photoUrl}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white text-base">
                          {monthlyWinner2.participant.displayName}
                        </p>
                        <p className="text-xs text-ink-300 mt-0.5">
                          {monthlyWinner2.rounds} rounds · {monthlyWinner2.totalCorrect} dik
                        </p>
                      </div>
                    </div>

                    {/* Contact Buttons */}
                    <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-3">
                      {monthlyWinner2.participant.phoneNumber ? (
                        <a
                          href={`https://wa.me/${
                            monthlyWinner2.participant.phoneNumber.replace(/\D/g, '').length === 10
                              ? '91' + monthlyWinner2.participant.phoneNumber.replace(/\D/g, '')
                              : monthlyWinner2.participant.phoneNumber.replace(/\D/g, '')
                          }?text=Chibai%20${encodeURIComponent(
                            monthlyWinner2.participant.displayName
                          )},%20Inkhel%20Quiz%20${encodeURIComponent(
                            currentMonth?.name || 'Tournament'
                          )}-ah%202nd%20Prize%20i%20dawng%20e!%20Lawmman%20dawn%20dan%20tur%20kan%20lo%20hrilh%20dawn%20che%20nia.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: {monthlyWinner2.participant.phoneNumber}
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400 italic">Phone number a dah lo</span>
                      )}

                      {monthlyWinner2.participant.email && (
                        <a
                          href={`mailto:${monthlyWinner2.participant.email}?subject=Inkhel%20Quiz%20${encodeURIComponent(
                            currentMonth?.name || ''
                          )}%202nd%20Prize`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 truncate"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{monthlyWinner2.participant.email}</span>
                        </a>
                      )}
                    </div>
                  </Card>
                )}

                {/* 3rd Prize */}
                {monthlyWinner3 && (
                  <Card className="relative overflow-hidden border-amber-600/30 bg-gradient-to-br from-amber-600/10 via-orange-600/5 to-transparent p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/20 border border-amber-600/40 px-3 py-1 text-xs font-bold text-amber-300">
                        🥉 3rd Prize Winner
                      </span>
                      <span className="font-display text-xl font-black text-amber-300">
                        {monthlyWinner3.points} <span className="text-xs font-normal text-amber-400">pts</span>
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Avatar
                        name={monthlyWinner3.participant.displayName}
                        gradient={monthlyWinner3.participant.avatarGradient}
                        photoUrl={monthlyWinner3.participant.photoUrl}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white text-base">
                          {monthlyWinner3.participant.displayName}
                        </p>
                        <p className="text-xs text-ink-300 mt-0.5">
                          {monthlyWinner3.rounds} rounds · {monthlyWinner3.totalCorrect} dik
                        </p>
                      </div>
                    </div>

                    {/* Contact Buttons */}
                    <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-3">
                      {monthlyWinner3.participant.phoneNumber ? (
                        <a
                          href={`https://wa.me/${
                            monthlyWinner3.participant.phoneNumber.replace(/\D/g, '').length === 10
                              ? '91' + monthlyWinner3.participant.phoneNumber.replace(/\D/g, '')
                              : monthlyWinner3.participant.phoneNumber.replace(/\D/g, '')
                          }?text=Chibai%20${encodeURIComponent(
                            monthlyWinner3.participant.displayName
                          )},%20Inkhel%20Quiz%20${encodeURIComponent(
                            currentMonth?.name || 'Tournament'
                          )}-ah%203rd%20Prize%20i%20dawng%20e!%20Lawmman%20dawn%20dan%20tur%20kan%20lo%20hrilh%20dawn%20che%20nia.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: {monthlyWinner3.participant.phoneNumber}
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400 italic">Phone number a dah lo</span>
                      )}

                      {monthlyWinner3.participant.email && (
                        <a
                          href={`mailto:${monthlyWinner3.participant.email}?subject=Inkhel%20Quiz%20${encodeURIComponent(
                            currentMonth?.name || ''
                          )}%203rd%20Prize`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 truncate"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{monthlyWinner3.participant.email}</span>
                        </a>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Monthly Leaderboard Table Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-white">
                  {currentMonth?.name} Standings Table
                </h2>
                <Badge tone="violet">
                  {displayMonthlyRows.length} of {monthlyRows.length} shown
                </Badge>
              </div>

              {/* Filter Tabs: Top 10, Top 3, All */}
              <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setRankFilter('top10')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    rankFilter === 'top10'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-ink-300 hover:text-white'
                  }`}
                >
                  🏆 Top 10 Only
                </button>
                <button
                  type="button"
                  onClick={() => setRankFilter('top3')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    rankFilter === 'top3'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-ink-300 hover:text-white'
                  }`}
                >
                  🥇 Top 3 (Prize)
                </button>
                <button
                  type="button"
                  onClick={() => setRankFilter('all')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    rankFilter === 'all'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-ink-300 hover:text-white'
                  }`}
                >
                  Show All ({monthlyRows.length})
                </button>
              </div>
            </div>

            {/* Ranking Table or Loading / Empty */}
            {monthlyLoading ? (
              <Card className="p-12 text-center text-sm text-ink-300">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                  <p className="font-semibold text-white">Leaderboard data lak mek a ni...</p>
                  <p className="text-xs text-ink-400">Khawngaihin lo nghak lawk rawh.</p>
                </div>
              </Card>
            ) : monthlyRows.length === 0 ? (
              <Card className="p-10 text-center text-ink-300">
                <Trophy className="mx-auto h-10 w-10 text-ink-400/40 mb-3" />
                <p className="font-bold text-white text-base">
                  {currentMonth?.name || 'He thla'}-ah hian tournament ranking a la awm rih lo.
                </p>
                <p className="text-xs text-ink-400 mt-1 max-w-md mx-auto">
                  September 2026 thla tournament-ah player 1,760+ an tel a, lawmman dawngtu (Top 10) an awm e. A hnuaia button hi hmet la September en rawh le:
                </p>
                {septMonth && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    icon={Trophy}
                    onClick={() => setSelectedMonthId(septMonth.id)}
                  >
                    September 2026 Top 10 En Rawh
                  </Button>
                )}
              </Card>
            ) : (
              <RankingTable rows={displayMonthlyRows} showPhone={true} />
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ROUND LEADERBOARD */}
      {/* ============================================================== */}
      {activeTab === 'round' && (
        <div className="space-y-6">
          {/* Round Switcher Card */}
          <Card className="p-5 space-y-4">
            {/* Month Filter Tabs */}
            {months.length > 0 && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Tournament Month
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMonthId('')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      !selectedMonthId
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    All Months
                  </button>
                  {months.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMonthId(m.id)
                        const roundInMonth = rounds.find((r) => r.monthId === m.id)
                        if (roundInMonth) setSelectedRoundId(roundInMonth.id)
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        selectedMonthId === m.id
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Round Switcher Dropdown & Pills */}
            <div className="pt-2 border-t border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Select Round ({filteredRounds.length})
                </label>
                <div className="relative min-w-[260px] sm:w-80">
                  <select
                    aria-label="Select Round"
                    value={selectedRoundId}
                    onChange={(e) => setSelectedRoundId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3.5 pr-10 text-sm font-semibold text-white transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {filteredRounds.map((r) => (
                      <option key={r.id} value={r.id} className="bg-ink-900 text-white">
                        {r.title} ({r.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-ink-400" />
                </div>
              </div>

              {/* Quick Round Pills */}
              <div className="mt-3 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredRounds.map((r) => {
                  const active = r.id === selectedRoundId
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoundId(r.id)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                        active
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm font-semibold'
                          : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {r.title}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Round Header & Table */}
          {currentRound && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                    {currentRound.title}
                    <Badge tone={currentRound.status === 'published' ? 'green' : 'slate'}>
                      {currentRound.status}
                    </Badge>
                  </h2>
                  <p className="text-xs text-ink-300 mt-1">
                    {totalQuestions ?? 0} questions · {roundRows.length} participants completed
                  </p>
                </div>

                <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setRankFilter('top10')}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      rankFilter === 'top10'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-ink-300 hover:text-white'
                    }`}
                  >
                    Top 10 Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setRankFilter('all')}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      rankFilter === 'all'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-ink-300 hover:text-white'
                    }`}
                  >
                    Show All ({roundRows.length})
                  </button>
                </div>
              </div>

              <LeaderboardTable rows={displayRoundRows} showAdminDetails={true} />
            </div>
          )}
        </div>
      )}

      {/* Tie-breaking rule note */}
      <Card className="p-4 text-xs text-ink-300">
        <p className="font-semibold text-white">Monthly Ranking & Prize Rules:</p>
        <p className="mt-1">
          1) Thla khat chhunga total points hlawhchhuah tam dan indawta rank a ni. 2) Points inangah chuan: chhan dik zat tam (total correct) → hun hman chawhrual tlem (avg completion time) hmanga tie-break a ni.
          Lawmman sem nan Top 3 leh Top 10 te phone number leh email a lang vek a, WhatsApp chat direct link a awm nghal e.
        </p>
      </Card>
    </div>
  )
}
