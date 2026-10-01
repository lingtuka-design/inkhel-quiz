import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  CalendarRange,
  Copy,
  Download,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { Avatar, Badge, Button, Card, toast } from '../../components/ui'
import { RankingTable } from '../../components/leaderboard'
import { getMonth } from '../../services/monthService'
import { getSeason } from '../../services/seasonService'
import { getMonthRanking } from '../../services/leaderboardService'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import type { RankingRow } from '../../types'

type RankFilter = 'top10' | 'top3' | 'all'

export function MonthStandingsPage() {
  const { seasonId, monthId } = useParams({ strict: false })
  const [rankFilter, setRankFilter] = useState<RankFilter>('top10')

  const { data: month } = useQuery({
    queryKey: ['month', monthId],
    queryFn: () => getMonth(monthId),
  })

  const { data: season } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => getSeason(seasonId),
  })

  const { data: monthRankings = [], isLoading } = useQuery<RankingRow[]>({
    queryKey: ['monthRankings', monthId],
    staleTime: 15000,
    queryFn: () => getMonthRanking(monthId!),
    enabled: !!monthId,
  })

  useEffect(() => {
    if (month) setPageTitle(`${month.name} — Tournament Standings`)
  }, [month])

  const displayRows = useMemo(() => {
    if (rankFilter === 'top3') return monthRankings.slice(0, 3)
    if (rankFilter === 'top10') return monthRankings.slice(0, 10)
    return monthRankings
  }, [monthRankings, rankFilter])

  const winner1 = monthRankings[0] || null
  const winner2 = monthRankings[1] || null
  const winner3 = monthRankings[2] || null

  const handleCopyContacts = (type: 'email' | 'phone') => {
    const targetRows = monthRankings.slice(0, 10)
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

  const handleExportCSV = () => {
    if (monthRankings.length === 0) return
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

    const csvData = monthRankings.map((r) => [
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
    link.setAttribute('download', `monthly-leaderboard-${month?.name?.toLowerCase().replace(/\s+/g, '-') || 'standings'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast('Monthly Leaderboard CSV download fel a ni e.', 'success')
  }

  if (!month || !season) return null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <BackLink to={`/admin/seasons/${seasonId}/months/${monthId}`} label={`${month.name} Rounds`} />
        
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-yellow-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-950/20">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl flex items-center gap-2.5">
                {month.name} Standings
                <span className="align-middle text-sm font-semibold text-ink-300">
                  Month {month.monthNumber} of {season.durationMonths}
                </span>
              </h1>
              <p className="mt-1 text-sm text-ink-300">
                {season.name} · {formatDate(month.startDate)} — {formatDate(month.endDate)}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          {monthRankings.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Phone}
                onClick={() => handleCopyContacts('phone')}
                title="Copy Top 10 Phone Numbers"
              >
                Copy Top 10 Phones
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Mail}
                onClick={() => handleCopyContacts('email')}
                title="Copy Top 10 Emails"
              >
                Copy Top 10 Emails
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

      {/* Prize payout reminder notice */}
      <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-200">Monthly Tournament Prize Distribution</p>
            <p className="text-ink-300 mt-0.5">
              Rank 1, 2, and 3 players qualify for the monthly cash prize. Phone numbers with 1-click WhatsApp links and Google emails are listed below for easy prize payout.
            </p>
          </div>
        </div>
      </Card>

      {/* Top 3 Prize Winners Spotlight Cards */}
      {monthRankings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h2 className="font-display text-base font-bold text-white">
                {month.name} Lawmman Dawng Tu Turte (Top 3 Prize Winners)
              </h2>
            </div>
            <Badge tone="amber">
              {monthRankings.length} Participants
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* 1st Prize */}
            {winner1 && (
              <Card className="relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/20 border border-yellow-400/40 px-3 py-1 text-xs font-bold text-yellow-300">
                    🥇 1st Prize Winner
                  </span>
                  <span className="font-display text-xl font-black text-yellow-400">
                    {winner1.points} <span className="text-xs font-normal text-yellow-300">pts</span>
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Avatar
                    name={winner1.participant.displayName}
                    gradient={winner1.participant.avatarGradient}
                    photoUrl={winner1.participant.photoUrl}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white text-base">
                      {winner1.participant.displayName}
                    </p>
                    <p className="text-xs text-ink-300 mt-0.5">
                      {winner1.rounds} rounds · {winner1.totalCorrect} dik
                    </p>
                  </div>
                </div>

                {/* Contact Buttons */}
                <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-3">
                  {winner1.participant.phoneNumber ? (
                    <a
                      href={`https://wa.me/${
                        winner1.participant.phoneNumber.replace(/\D/g, '').length === 10
                          ? '91' + winner1.participant.phoneNumber.replace(/\D/g, '')
                          : winner1.participant.phoneNumber.replace(/\D/g, '')
                      }?text=Chibai%20${encodeURIComponent(
                        winner1.participant.displayName
                      )},%20Inkhel%20Quiz%20${encodeURIComponent(
                        month.name
                      )}-ah%201st%20Prize%20i%20dawng%20e!%20Lawmman%20dawn%20dan%20tur%20kan%20lo%20hrilh%20dawn%20che%20nia.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: {winner1.participant.phoneNumber}
                    </a>
                  ) : (
                    <span className="text-xs text-ink-400 italic">Phone number a dah lo</span>
                  )}

                  {winner1.participant.email && (
                    <a
                      href={`mailto:${winner1.participant.email}?subject=Inkhel%20Quiz%20${encodeURIComponent(
                        month.name
                      )}%201st%20Prize`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 truncate"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{winner1.participant.email}</span>
                    </a>
                  )}
                </div>
              </Card>
            )}

            {/* 2nd Prize */}
            {winner2 && (
              <Card className="relative overflow-hidden border-slate-300/30 bg-gradient-to-br from-slate-400/10 via-slate-500/5 to-transparent p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-300/20 border border-slate-300/40 px-3 py-1 text-xs font-bold text-slate-200">
                    🥈 2nd Prize Winner
                  </span>
                  <span className="font-display text-xl font-black text-slate-200">
                    {winner2.points} <span className="text-xs font-normal text-slate-300">pts</span>
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Avatar
                    name={winner2.participant.displayName}
                    gradient={winner2.participant.avatarGradient}
                    photoUrl={winner2.participant.photoUrl}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white text-base">
                      {winner2.participant.displayName}
                    </p>
                    <p className="text-xs text-ink-300 mt-0.5">
                      {winner2.rounds} rounds · {winner2.totalCorrect} dik
                    </p>
                  </div>
                </div>

                {/* Contact Buttons */}
                <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-3">
                  {winner2.participant.phoneNumber ? (
                    <a
                      href={`https://wa.me/${
                        winner2.participant.phoneNumber.replace(/\D/g, '').length === 10
                          ? '91' + winner2.participant.phoneNumber.replace(/\D/g, '')
                          : winner2.participant.phoneNumber.replace(/\D/g, '')
                      }?text=Chibai%20${encodeURIComponent(
                        winner2.participant.displayName
                      )},%20Inkhel%20Quiz%20${encodeURIComponent(
                        month.name
                      )}-ah%202nd%20Prize%20i%20dawng%20e!%20Lawmman%20dawn%20dan%20tur%20kan%20lo%20hrilh%20dawn%20che%20nia.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: {winner2.participant.phoneNumber}
                    </a>
                  ) : (
                    <span className="text-xs text-ink-400 italic">Phone number a dah lo</span>
                  )}

                  {winner2.participant.email && (
                    <a
                      href={`mailto:${winner2.participant.email}?subject=Inkhel%20Quiz%20${encodeURIComponent(
                        month.name
                      )}%202nd%20Prize`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 truncate"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{winner2.participant.email}</span>
                    </a>
                  )}
                </div>
              </Card>
            )}

            {/* 3rd Prize */}
            {winner3 && (
              <Card className="relative overflow-hidden border-amber-600/30 bg-gradient-to-br from-amber-600/10 via-orange-600/5 to-transparent p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/20 border border-amber-600/40 px-3 py-1 text-xs font-bold text-amber-300">
                    🥉 3rd Prize Winner
                  </span>
                  <span className="font-display text-xl font-black text-amber-300">
                    {winner3.points} <span className="text-xs font-normal text-amber-400">pts</span>
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Avatar
                    name={winner3.participant.displayName}
                    gradient={winner3.participant.avatarGradient}
                    photoUrl={winner3.participant.photoUrl}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white text-base">
                      {winner3.participant.displayName}
                    </p>
                    <p className="text-xs text-ink-300 mt-0.5">
                      {winner3.rounds} rounds · {winner3.totalCorrect} dik
                    </p>
                  </div>
                </div>

                {/* Contact Buttons */}
                <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-3">
                  {winner3.participant.phoneNumber ? (
                    <a
                      href={`https://wa.me/${
                        winner3.participant.phoneNumber.replace(/\D/g, '').length === 10
                          ? '91' + winner3.participant.phoneNumber.replace(/\D/g, '')
                          : winner3.participant.phoneNumber.replace(/\D/g, '')
                      }?text=Chibai%20${encodeURIComponent(
                        winner3.participant.displayName
                      )},%20Inkhel%20Quiz%20${encodeURIComponent(
                        month.name
                      )}-ah%203rd%20Prize%20i%20dawng%20e!%20Lawmman%20dawn%20dan%20tur%20kan%20lo%20hrilh%20dawn%20che%20nia.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp: {winner3.participant.phoneNumber}
                    </a>
                  ) : (
                    <span className="text-xs text-ink-400 italic">Phone number a dah lo</span>
                  )}

                  {winner3.participant.email && (
                    <a
                      href={`mailto:${winner3.participant.email}?subject=Inkhel%20Quiz%20${encodeURIComponent(
                        month.name
                      )}%203rd%20Prize`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 truncate"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{winner3.participant.email}</span>
                    </a>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Standings table section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">
              {month.name} Standings Table
            </h2>
            <Badge tone="violet">
              {displayRows.length} of {monthRankings.length} shown
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
              Show All ({monthRankings.length})
            </button>
          </div>
        </div>

        {/* Standings table */}
        <RankingTable rows={displayRows} showPhone={true} />
      </div>

      {/* Tie-breaking rules */}
      <Card className="p-5 text-sm text-ink-300">
        <p className="font-semibold text-white">Monthly Ranking Rules</p>
        <p className="mt-1">
          Rankings are calculated by total points accumulated across all published rounds in {month.name}. Equal points are tie-broken by: total correct answers → faster average completion time.
        </p>
      </Card>
    </div>
  )
}
