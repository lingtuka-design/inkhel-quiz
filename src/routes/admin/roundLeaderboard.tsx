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
  MessageCircle,
  Phone,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { BackLink } from '../../components/layout'
import { LeaderboardTable } from '../../components/leaderboard'
import { Avatar, Badge, Button, Card, toast } from '../../components/ui'
import { countQuestions } from '../../services/roundService'
import { getRoundLeaderboard } from '../../services/leaderboardService'
import { setPageTitle } from '../../services/shareService'
import { formatTime, formatDate } from '../../lib/utils'
import type { Round } from '../../types'

export function AdminRoundLeaderboardPage() {
  const { roundId: routeRoundId } = useParams({ strict: false })
  const [selectedRoundId, setSelectedRoundId] = useState<string>(routeRoundId || '')
  const [selectedMonthId, setSelectedMonthId] = useState<string>('all')
  const [top10Only, setTop10Only] = useState<boolean>(true)

  // 1. Fetch all rounds
  const { data: rounds = [], isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: ['adminRounds'],
    queryFn: async () => {
      const res = await fetch('/api/rounds')
      if (!res.ok) throw new Error('Failed to fetch rounds')
      return res.json()
    },
  })

  // 2. Fetch all seasons/months for month grouping
  const { data: seasons = [] } = useQuery({
    queryKey: ['adminSeasons'],
    queryFn: async () => {
      const res = await fetch('/api/seasons')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Build months list
  const months = useMemo(() => {
    const list: { id: string; name: string; seasonName: string }[] = []
    for (const s of seasons as any[]) {
      if (Array.isArray(s.months)) {
        for (const m of s.months) {
          list.push({
            id: m.id,
            name: m.name || m.slug,
            seasonName: s.name,
          })
        }
      }
    }
    return list
  }, [seasons])

  // Sync routeRoundId or default to the first round
  useEffect(() => {
    if (routeRoundId) {
      setSelectedRoundId(routeRoundId)
    } else if (!selectedRoundId && rounds.length > 0) {
      // Pick first published round or first round
      const firstPublished = rounds.find((r) => r.status === 'published') || rounds[0]
      if (firstPublished) {
        setSelectedRoundId(firstPublished.id)
      }
    }
  }, [routeRoundId, rounds, selectedRoundId])

  // Find active round
  const currentRound = useMemo(() => {
    return rounds.find((r) => r.id === selectedRoundId) || null
  }, [rounds, selectedRoundId])

  // Update month filter if round changes and month filter is specific
  useEffect(() => {
    if (currentRound && selectedMonthId === 'all') {
      setSelectedMonthId(currentRound.monthId)
    }
  }, [currentRound])

  // Filtered rounds based on month selection
  const filteredRounds = useMemo(() => {
    if (selectedMonthId === 'all') return rounds
    return rounds.filter((r) => r.monthId === selectedMonthId)
  }, [rounds, selectedMonthId])

  // Month info for current round
  const currentMonth = useMemo(() => {
    return months.find((m) => m.id === currentRound?.monthId)
  }, [months, currentRound])

  // Leaderboard rows for selected round
  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ['leaderboard', selectedRoundId],
    queryFn: () => getRoundLeaderboard(selectedRoundId),
    enabled: !!selectedRoundId,
  })

  const { data: totalQuestions } = useQuery({
    queryKey: ['questions', selectedRoundId, 'count'],
    queryFn: () => countQuestions(selectedRoundId),
    enabled: !!selectedRoundId,
  })

  useEffect(() => {
    if (currentRound) {
      setPageTitle(`Admin Leaderboard — ${currentRound.title}`)
    } else {
      setPageTitle('Admin Round Leaderboards')
    }
  }, [currentRound])

  // Display rows (Top 10 vs All)
  const displayRows = useMemo(() => {
    if (top10Only) {
      return rows.slice(0, 10)
    }
    return rows
  }, [rows, top10Only])

  // Top 1 participant (Champion)
  const topWinner = rows[0] || null

  // Copy helper
  const handleCopyContacts = (type: 'email' | 'phone') => {
    const targetRows = rows.slice(0, 10)
    const list = targetRows
      .map((r) => (type === 'email' ? r.participant.email : r.participant.phoneNumber))
      .filter(Boolean) as string[]

    if (list.length === 0) {
      toast(`No ${type}s recorded in Top 10.`, 'error')
      return
    }

    navigator.clipboard.writeText(list.join(', '))
    toast(`Copied Top 10 ${type === 'email' ? 'Emails' : 'Phone Numbers'}!`, 'success')
  }

  // Export CSV
  const handleExportCSV = () => {
    if (rows.length === 0) return
    const headers = [
      'Rank',
      'Name',
      'Email',
      'Phone',
      'Correct Answers',
      'Total Questions',
      'Time (seconds)',
      'Score (Points)',
      'Total Rounds Played',
      'Completed At',
    ]

    const csvData = rows.map((r) => [
      r.rank,
      `"${r.participant.displayName.replace(/"/g, '""')}"`,
      `"${r.participant.email || ''}"`,
      `"${r.participant.phoneNumber || ''}"`,
      r.correctAnswers,
      r.totalQuestions,
      r.timeTakenSeconds,
      r.score,
      r.roundsPlayed ?? 1,
      `"${r.completedAt || ''}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvData.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `leaderboard-${currentRound?.slug || 'round'}-top.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast('Leaderboard CSV has been downloaded.', 'success')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <BackLink to="/admin/rounds" label="Manage Rounds" />
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Round Leaderboards
                </h1>
                <p className="text-sm text-ink-300">
                  Top 10 leaderboard, player emails, phone numbers, points hlawh zat leh round khelh zat.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Mail}
                onClick={() => handleCopyContacts('email')}
                title="Copy all Top 10 Emails"
              >
                Copy Top 10 Emails
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Phone}
                onClick={() => handleCopyContacts('phone')}
                title="Copy all Top 10 Phone numbers"
              >
                Copy Top 10 Phones
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={handleExportCSV}
                title="Download CSV"
              >
                Export CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Month & Round Selector Controls */}
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
                onClick={() => setSelectedMonthId('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedMonthId === 'all'
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

      {/* Selected Round Overview & Champion Card */}
      {currentRound && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Round Meta info */}
          <Card className="p-5 flex flex-col justify-between lg:col-span-1 border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={currentRound.status === 'published' ? 'green' : 'slate'}>
                  {currentRound.status}
                </Badge>
                {currentMonth && (
                  <span className="text-xs text-ink-300 font-medium">
                    {currentMonth.name}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-display text-xl font-bold text-white">
                {currentRound.title}
              </h2>
              {currentRound.description && (
                <p className="mt-1 line-clamp-2 text-xs text-ink-300">
                  {currentRound.description}
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3 text-xs text-ink-300">
              <div>
                <span className="text-ink-400">Total Questions:</span>{' '}
                <strong className="text-white font-semibold">{totalQuestions ?? 0}</strong>
              </div>
              <div>
                <span className="text-ink-400">Time Limit:</span>{' '}
                <strong className="text-white font-semibold">{Math.round(currentRound.timeLimitSeconds / 60)} mins</strong>
              </div>
              <div>
                <span className="text-ink-400">Participants:</span>{' '}
                <strong className="text-emerald-400 font-semibold">{rows.length} players</strong>
              </div>
              <div>
                <span className="text-ink-400">High Score:</span>{' '}
                <strong className="text-amber-400 font-semibold">{topWinner?.score ?? 0} pts</strong>
              </div>
            </div>
          </Card>

          {/* Top Winner Card (Rank #1) */}
          <Card className="p-5 lg:col-span-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <Trophy className="h-40 w-40 text-amber-400" />
            </div>

            {topWinner ? (
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-300">
                      <Sparkles className="h-3.5 w-3.5" /> 🥇 #1 Champion
                    </span>
                    <span className="font-display text-2xl font-black text-amber-400">
                      {topWinner.score} <span className="text-xs font-normal text-amber-300">points</span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <Avatar
                      name={topWinner.participant.displayName}
                      gradient={topWinner.participant.avatarGradient}
                      photoUrl={topWinner.participant.photoUrl}
                      size="lg"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {topWinner.participant.displayName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-300 mt-1">
                        <span>
                          Dik zat:{' '}
                          <strong className="text-emerald-400 font-semibold">
                            {topWinner.correctAnswers}/{topWinner.totalQuestions}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Hun hman:{' '}
                          <strong className="text-white font-semibold">
                            {formatTime(topWinner.timeTakenSeconds)}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Round khelh zat:{' '}
                          <strong className="text-violet-300 font-semibold">
                            {topWinner.roundsPlayed ?? 1} rounds
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Champion Contacts */}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
                  {topWinner.participant.email && (
                    <a
                      href={`mailto:${topWinner.participant.email}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20"
                    >
                      <Mail className="h-3.5 w-3.5" /> {topWinner.participant.email}
                    </a>
                  )}

                  {topWinner.participant.phoneNumber && (
                    <a
                      href={`https://wa.me/${
                        topWinner.participant.phoneNumber.replace(/\D/g, '').length === 10
                          ? '91' + topWinner.participant.phoneNumber.replace(/\D/g, '')
                          : topWinner.participant.phoneNumber.replace(/\D/g, '')
                      }?text=Hi%20${encodeURIComponent(
                        topWinner.participant.displayName
                      )},%20Inkhel%20Quiz%20Round%20champion%20i%20ni%20e!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: {topWinner.participant.phoneNumber}
                    </a>
                  )}

                  {!topWinner.participant.email && !topWinner.participant.phoneNumber && (
                    <span className="text-xs italic text-ink-400">
                      No direct contact recorded (Guest account)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center py-6 text-center text-sm text-ink-400">
                He round khel tu an la awm rih lo.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Leaderboard Table Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">
              {top10Only ? '🏆 Top 10 Participants' : `👥 All Participants (${rows.length})`}
            </h2>
            <Badge tone="violet">
              {displayRows.length} of {rows.length} shown
            </Badge>
          </div>

          {/* Toggle Top 10 vs All */}
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setTop10Only(true)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                top10Only
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-ink-300 hover:text-white'
              }`}
            >
              Top 10 Only
            </button>
            <button
              type="button"
              onClick={() => setTop10Only(false)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                !top10Only
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-ink-300 hover:text-white'
              }`}
            >
              Show All ({rows.length})
            </button>
          </div>
        </div>

        {/* Table */}
        <LeaderboardTable rows={displayRows} showAdminDetails={true} />
      </div>

      {/* Tie-breaking rule note */}
      <Card className="p-4 text-xs text-ink-300">
        <p className="font-semibold text-white">Ranking & Tie-breaking Rules:</p>
        <p className="mt-1">
          Equal points/scores are ordered by: 1) Dik zat tam (more correct answers) → 2) Hun hman tlem (faster completion time) → 3) Submission hmasa sa.
          Admin mode-ah hian participant email, phone number, round khelh zat, leh dik zat a lang nghal vek a ni.
        </p>
      </Card>
    </div>
  )
}
