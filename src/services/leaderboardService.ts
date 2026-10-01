import { getDb } from '../db/database'
import type { Attempt, LeaderboardRow, Participant, RankingRow } from '../types'
import { compareAttempts } from './scoring'
import { listMonths } from './monthService'
import { listRoundsByMonth } from './roundService'

export interface RankingOptions {
  currentParticipantId?: string | null
}

function participantById(id: string): Participant {
  const p = getDb().participants.find((x) => x.id === id)
  return (
    p ?? {
      id,
      displayName: 'Unknown Player',
      email: null,
      avatarGradient: 'from-slate-500 to-slate-700',
      provider: 'guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  )
}

/** Level 1 — per-round leaderboard (Live from Cloudflare D1 with local fallback) */
export async function getRoundLeaderboard(
  roundId: string,
  opts: RankingOptions = {},
): Promise<LeaderboardRow[]> {
  try {
    const res = await fetch(`/api/leaderboard?type=round&roundId=${encodeURIComponent(roundId)}`)
    if (res.ok) {
      const data: LeaderboardRow[] = await res.json()
      return data.map((r) => ({
        ...r,
        isCurrentUser: r.participant.id === opts.currentParticipantId,
      }))
    }
  } catch {
    // fallback
  }

  const db = getDb()
  const attempts = db.attempts
    .filter((a) => a.roundId === roundId && (a.status === 'completed' || a.status === 'expired') && !a.isTestAttempt)
    .sort(compareAttempts)
  const totalQuestions = db.questions.filter((q) => q.roundId === roundId).length
  return attempts.map((a, i) => {
    const roundsPlayed = new Set(
      db.attempts
        .filter((x) => x.participantId === a.participantId && (x.status === 'completed' || x.status === 'expired') && !x.isTestAttempt)
        .map((x) => x.roundId)
    ).size

    return {
      rank: i + 1,
      participant: participantById(a.participantId),
      correctAnswers: a.correctAnswers,
      totalQuestions,
      timeTakenSeconds: a.timeTakenSeconds ?? 0,
      score: a.finalScore,
      completedAt: a.completedAt ?? a.createdAt,
      attemptId: a.id,
      isCurrentUser: a.participantId === opts.currentParticipantId,
      roundsPlayed: roundsPlayed || 1,
    }
  })
}

/** Level 2 — monthly ranking (Live from Cloudflare D1) */
export async function getMonthRanking(
  monthId: string,
  opts: RankingOptions = {},
): Promise<RankingRow[]> {
  try {
    const res = await fetch(`/api/leaderboard?type=month&monthId=${encodeURIComponent(monthId)}`)
    if (res.ok) {
      const data: RankingRow[] = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data.map((r) => ({
          ...r,
          isCurrentUser: r.participant.id === opts.currentParticipantId,
        }))
      }
    }
  } catch {
    // fallback
  }

  // Fallback to local DB
  const db = getDb()
  const roundIds = db.rounds.filter((r) => r.monthId === monthId).map((r) => r.id)
  const attempts = db.attempts.filter(
    (a) => roundIds.includes(a.roundId) && (a.status === 'completed' || a.status === 'expired') && !a.isTestAttempt
  )

  const participantMap = new Map<string, {
    rounds: Set<string>
    points: number
    correct: number
    times: number[]
    best: number
    worst: number
  }>()

  for (const a of attempts) {
    let p = participantMap.get(a.participantId)
    if (!p) {
      p = { rounds: new Set(), points: 0, correct: 0, times: [], best: a.finalScore, worst: a.finalScore }
      participantMap.set(a.participantId, p)
    }
    p.rounds.add(a.roundId)
    p.points += a.finalScore
    p.correct += a.correctAnswers
    if (a.timeTakenSeconds) p.times.push(a.timeTakenSeconds)
    p.best = Math.max(p.best, a.finalScore)
    p.worst = Math.min(p.worst, a.finalScore)
  }

  const list: RankingRow[] = []
  for (const [pid, stats] of participantMap.entries()) {
    const avgTime = stats.times.length > 0 ? Math.round(stats.times.reduce((x, y) => x + y, 0) / stats.times.length) : 0
    list.push({
      rank: 0,
      participant: participantById(pid),
      rounds: stats.rounds.size,
      points: stats.points,
      totalCorrect: stats.correct,
      avgTimeSeconds: avgTime,
      bestScore: stats.best,
      worstScore: stats.worst,
      isCurrentUser: pid === opts.currentParticipantId,
    })
  }

  list.sort((a, b) => b.points - a.points || b.totalCorrect - a.totalCorrect || a.avgTimeSeconds - b.avgTimeSeconds)
  return list.map((r, i) => ({ ...r, rank: i + 1 }))
}

/** Level 3 — season ranking (Live from Cloudflare D1) */
export async function getSeasonRanking(
  seasonId: string,
  opts: RankingOptions = {},
): Promise<RankingRow[]> {
  try {
    const res = await fetch(`/api/leaderboard?type=season&seasonId=${encodeURIComponent(seasonId)}`)
    if (res.ok) {
      const data: RankingRow[] = await res.json()
      return data.map((r) => ({
        ...r,
        isCurrentUser: r.participant.id === opts.currentParticipantId,
      }))
    }
  } catch {
    // fallback
  }
  return []
}

/** Overall ranking across all seasons (Live from Cloudflare D1) */
export async function getOverallRanking(opts: RankingOptions = {}): Promise<RankingRow[]> {
  try {
    const res = await fetch('/api/leaderboard?type=overall')
    if (res.ok) {
      const data: RankingRow[] = await res.json()
      return data.map((r) => ({
        ...r,
        isCurrentUser: r.participant.id === opts.currentParticipantId,
      }))
    }
  } catch {
    // fallback
  }
  return []
}

export function getAttemptRank(attemptId: string): number {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) return 0
  return 1
}
