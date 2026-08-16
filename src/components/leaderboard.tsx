import { Crown, Medal, MessageCircle, Phone, Timer, Trophy } from 'lucide-react'
import type { LeaderboardRow, RankingRow } from '../types'
import { Avatar, Card } from './ui'
import { formatTime } from '../lib/utils'
import { cn } from '../lib/utils'

const MEDAL_STYLES = [
  { ring: 'border-yellow-400/50 shadow-yellow-400/20', badge: 'bg-gradient-to-br from-yellow-300 to-amber-500', icon: Crown },
  { ring: 'border-slate-300/40 shadow-slate-300/20', badge: 'bg-gradient-to-br from-slate-300 to-slate-500', icon: Medal },
  { ring: 'border-amber-600/50 shadow-amber-600/20', badge: 'bg-gradient-to-br from-amber-500 to-orange-700', icon: Medal },
]

export function RankBadge({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' }) {
  if (rank <= 3) {
    const s = MEDAL_STYLES[rank - 1]!
    const Icon = s.icon
    return (
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border text-white shadow-lg',
          s.badge,
          s.ring,
          size === 'sm' && 'h-6 w-6',
        )}
        aria-label={`Rank ${rank}`}
      >
        <Icon className={cn('h-4 w-4', size === 'sm' && 'h-3 w-3')} />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 font-display text-sm font-bold text-ink-200',
        size === 'sm' && 'h-6 w-6 text-xs',
      )}
    >
      {rank}
    </span>
  )
}

export function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const top = rows.slice(0, 3)
  const order = [1, 0, 2].map((i) => top[i]).filter(Boolean)
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {order.map((row) => {
        const s = MEDAL_STYLES[row.rank - 1]!
        const isFirst = row.rank === 1
        return (
          <div
            key={row.attemptId}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border bg-white/[0.04] p-4 text-center backdrop-blur-xl',
              isFirst ? 'pb-8 pt-6 border-white/20' : 'pb-5 pt-4 opacity-90',
            )}
          >
            <Avatar
              name={row.participant.displayName}
              gradient={row.participant.avatarGradient}
              photoUrl={row.participant.photoUrl}
              size={isFirst ? 'xl' : 'lg'}
            />
            <div className="min-w-0">
              <p className={cn('truncate font-semibold text-white', isFirst ? 'text-base' : 'text-sm')}>
                {row.participant.displayName}
              </p>
              <p className="font-display text-xl font-bold text-gradient">{row.score}</p>
            </div>
            <RankBadge rank={row.rank} />
          </div>
        )
      })}
    </div>
  )
}

export function LeaderboardTable({ rows, showPhone = false }: { rows: LeaderboardRow[]; showPhone?: boolean }) {
  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-ink-300">
        No results yet — be the first to play and claim the top spot.
      </Card>
    )
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Player</th>
              {showPhone && <th className="px-4 py-3 font-semibold">Phone / WhatsApp</th>}
              <th className="px-4 py-3 text-center font-semibold">Correct</th>
              <th className="px-4 py-3 text-center font-semibold">Time</th>
              <th className="px-4 py-3 text-right font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const phone = row.participant.phoneNumber
              const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
              const waUrl = cleanPhone
                ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=Hi%20${encodeURIComponent(row.participant.displayName)},%20Inkhel%20Quiz%20atanga%20rawn%20be%20che%20kan%20ni%20e.`
                : null

              return (
                <tr
                  key={row.attemptId}
                  className={cn(
                    'border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]',
                    row.isCurrentUser && 'bg-gradient-to-r from-violet-500/15 to-fuchsia-500/5',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RankBadge rank={row.rank} size="sm" />
                      {row.rank === 1 && <Trophy className="h-4 w-4 text-yellow-400" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        name={row.participant.displayName}
                        gradient={row.participant.avatarGradient}
                        photoUrl={row.participant.photoUrl}
                        size="sm"
                      />
                      <span
                        className="truncate font-semibold text-white max-w-[130px] sm:max-w-[240px] md:max-w-none"
                        title={row.participant.displayName}
                      >
                        {row.participant.displayName}
                      </span>
                      {row.isCurrentUser && (
                        <span className="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  {showPhone && (
                    <td className="px-4 py-3">
                      {phone && waUrl ? (
                        <div className="flex items-center gap-1.5">
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
                        <span className="text-xs italic text-ink-300/50">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center text-ink-200">
                    {row.correctAnswers}/{row.totalQuestions}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-ink-200">
                      <Timer className="h-3.5 w-3.5" /> {formatTime(row.timeTakenSeconds)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-display text-base font-bold text-white">{row.score}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function RankingTable({ rows, showPhone = false }: { rows: RankingRow[]; showPhone?: boolean }) {
  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-ink-300">
        No rankings yet in this period.
      </Card>
    )
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Player</th>
              {showPhone && <th className="px-4 py-3 font-semibold">Phone / WhatsApp</th>}
              <th className="px-4 py-3 text-center font-semibold">Rounds</th>
              <th className="px-4 py-3 text-center font-semibold">Correct</th>
              <th className="px-4 py-3 text-center font-semibold">Avg Time</th>
              <th className="px-4 py-3 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const phone = row.participant.phoneNumber
              const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
              const waUrl = cleanPhone
                ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=Hi%20${encodeURIComponent(row.participant.displayName)},%20Inkhel%20Quiz%20atanga%20rawn%20be%20che%20kan%20ni%20e.`
                : null

              return (
                <tr
                  key={row.participant.id}
                  className={cn(
                    'border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]',
                    row.isCurrentUser && 'bg-gradient-to-r from-violet-500/15 to-fuchsia-500/5',
                  )}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={row.rank} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        name={row.participant.displayName}
                        gradient={row.participant.avatarGradient}
                        photoUrl={row.participant.photoUrl}
                        size="sm"
                      />
                      <span
                        className="truncate font-semibold text-white max-w-[130px] sm:max-w-[240px] md:max-w-none"
                        title={row.participant.displayName}
                      >
                        {row.participant.displayName}
                      </span>
                      {row.isCurrentUser && (
                        <span className="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  {showPhone && (
                    <td className="px-4 py-3">
                      {phone && waUrl ? (
                        <div className="flex items-center gap-1.5">
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
                        <span className="text-xs italic text-ink-300/50">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center text-ink-200">{row.rounds}</td>
                  <td className="px-4 py-3 text-center text-ink-200">{row.totalCorrect}</td>
                  <td className="px-4 py-3 text-center text-ink-200">{formatTime(row.avgTimeSeconds)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-display text-base font-bold text-white">{row.points}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
