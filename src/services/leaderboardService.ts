import { getDb } from '../db/database'
import type { Attempt, LeaderboardRow, Participant, RankingRow } from '../types'
import { compareAttempts } from './scoring'
import { listMonths } from './monthService'
import { listRoundsByMonth } from './roundService'

const VALID_STATUSES = new Set(['completed', 'expired'])

function isValidAttempt(a: Attempt): boolean {
  return VALID_STATUSES.has(a.status) && !a.isTestAttempt
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

export interface RankingOptions {
  currentParticipantId?: string | null
}

function aggregateRows(
  attempts: Attempt[],
  opts: RankingOptions,
): RankingRow[] {
  const byParticipant = new Map<string, Attempt[]>()
  for (const a of attempts) {
    const list = byParticipant.get(a.participantId) ?? []
    list.push(a)
    byParticipant.set(a.participantId, list)
  }
  const rows = [...byParticipant.entries()]
    .map(([pid, list]) => {
      const total = list.reduce((s, a) => s + a.finalScore, 0)
      const correct = list.reduce((s, a) => s + a.correctAnswers, 0)
      const avgTime = Math.round(
        list.reduce((s, a) => s + (a.timeTakenSeconds ?? 0), 0) / list.length,
      )
      const scores = list.map((a) => a.finalScore)
      return {
        participantId: pid,
        rounds: list.length,
        points: total,
        totalCorrect: correct,
        avgTimeSeconds: avgTime,
        bestScore: Math.max(...scores),
        worstScore: Math.min(...scores),
      }
    })
    .sort((a, b) => b.points - a.points || b.rounds - a.rounds)
  return rows.map((r, i) => ({
    rank: i + 1,
    participant: participantById(r.participantId),
    rounds: r.rounds,
    points: r.points,
    totalCorrect: r.totalCorrect,
    avgTimeSeconds: r.avgTimeSeconds,
    bestScore: r.bestScore,
    worstScore: r.worstScore,
    isCurrentUser: r.participantId === opts.currentParticipantId,
  }))
}

/** Level 1 — per-round leaderboard */
export function getRoundLeaderboard(
  roundId: string,
  opts: RankingOptions = {},
): LeaderboardRow[] {
  const db = getDb()
  const attempts = db.attempts
    .filter((a) => a.roundId === roundId && isValidAttempt(a))
    .sort(compareAttempts)
  const totalQuestions = db.questions.filter((q) => q.roundId === roundId).length
  return attempts.map((a, i) => ({
    rank: i + 1,
    participant: participantById(a.participantId),
    correctAnswers: a.correctAnswers,
    totalQuestions,
    timeTakenSeconds: a.timeTakenSeconds ?? 0,
    score: a.finalScore,
    completedAt: a.completedAt ?? a.createdAt,
    attemptId: a.id,
    isCurrentUser: a.participantId === opts.currentParticipantId,
  }))
}

/** Level 2 — monthly ranking (sum of round scores within the month) */
export function getMonthRanking(monthId: string, opts: RankingOptions = {}): RankingRow[] {
  const rounds = listRoundsByMonth(monthId).map((r) => r.id)
  const attempts = getDb().attempts.filter(
    (a) => rounds.includes(a.roundId) && isValidAttempt(a),
  )
  return aggregateRows(attempts, opts)
}

/** Level 3 — season overall ranking (sum across all months of the season) */
export function getSeasonRanking(seasonId: string, opts: RankingOptions = {}): RankingRow[] {
  const monthIds = listMonths(seasonId).map((m) => m.id)
  const roundIds = monthIds.flatMap((mid) => listRoundsByMonth(mid).map((r) => r.id))
  const attempts = getDb().attempts.filter(
    (a) => roundIds.includes(a.roundId) && isValidAttempt(a),
  )
  return aggregateRows(attempts, opts)
}

export function getOverallRanking(opts: RankingOptions = {}): RankingRow[] {
  const db = getDb()
  const seasonIds = db.seasons.map((s) => s.id)
  const rows = seasonIds.flatMap((sid) => getSeasonRanking(sid, opts))
  const byParticipant = new Map<string, RankingRow>()
  for (const r of rows) {
    const existing = byParticipant.get(r.participant.id)
    if (existing) {
      existing.rounds += r.rounds
      existing.points += r.points
      existing.totalCorrect += r.totalCorrect
      existing.avgTimeSeconds = Math.round(
        (existing.avgTimeSeconds + r.avgTimeSeconds) / 2,
      )
      existing.bestScore = Math.max(existing.bestScore, r.bestScore)
      existing.worstScore = Math.min(existing.worstScore, r.worstScore)
    } else {
      byParticipant.set(r.participant.id, { ...r })
    }
  }
  return [...byParticipant.values()]
    .sort((a, b) => b.points - a.points || b.rounds - a.rounds)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

export function getAttemptRank(attemptId: string): number {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) return 0
  return getRoundLeaderboard(attempt.roundId).find((r) => r.attemptId === attemptId)?.rank ?? 0
}
