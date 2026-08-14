import { Crown, Medal, Timer, Trophy } from 'lucide-react'
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
            <Avatar name={row.participant.displayName} gradient={row.participant.avatarGradient} size={isFirst ? 'xl' : 'lg'} />
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

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
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
              <th className="px-4 py-3 text-center font-semibold">Correct</th>
              <th className="px-4 py-3 text-center font-semibold">Time</th>
              <th className="px-4 py-3 text-right font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
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
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.participant.displayName} gradient={row.participant.avatarGradient} size="sm" />
                    <span className="font-semibold text-white">
                      {row.participant.displayName}
                      {row.isCurrentUser && (
                        <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                          You
                        </span>
                      )}
                    </span>
                  </div>
                </td>
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
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function RankingTable({ rows }: { rows: RankingRow[] }) {
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
              <th className="px-4 py-3 text-center font-semibold">Rounds</th>
              <th className="px-4 py-3 text-center font-semibold">Correct</th>
              <th className="px-4 py-3 text-center font-semibold">Avg Time</th>
              <th className="px-4 py-3 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
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
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.participant.displayName} gradient={row.participant.avatarGradient} size="sm" />
                    <span className="font-semibold text-white">
                      {row.participant.displayName}
                      {row.isCurrentUser && (
                        <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                          You
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-ink-200">{row.rounds}</td>
                <td className="px-4 py-3 text-center text-ink-200">{row.totalCorrect}</td>
                <td className="px-4 py-3 text-center text-ink-200">{formatTime(row.avgTimeSeconds)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-display text-base font-bold text-white">{row.points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
