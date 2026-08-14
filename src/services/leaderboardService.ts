import { getDb } from '../db/database'
import type { Attempt, LeaderboardRow, Participant, RankingRow } from '../types'
import { compareAttempts } from './scoring'
import { listMonths } from './monthService'
import { listRoundsByMonth } from './roundService'
import { apiGet } from './apiClient'

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

function normalizeRemoteParticipant(p: any): Participant {
  if (!p || typeof p !== 'object') return participantById('unknown')
  return {
    id: p.id ?? 'unknown',
    displayName: p.displayName ?? p.display_name ?? 'Unknown Player',
    email: p.email ?? null,
    avatarGradient: p.avatarGradient ?? p.avatar_gradient ?? 'from-violet-500 to-fuchsia-500',
    provider: p.provider ?? 'guest',
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  }
}

export interface RankingOptions {
  currentParticipantId?: string | null
}

function aggregateRows(attempts: Attempt[], opts: RankingOptions): RankingRow[] {
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

/** Level 1 — per-round leaderboard (sync, local only). */
export function computeRoundLeaderboardLocal(
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

function normalizeRemoteRoundRow(row: any, currentParticipantId?: string | null): LeaderboardRow {
  return {
    rank: row.rank,
    participant: normalizeRemoteParticipant(row.participant),
    correctAnswers: row.correctAnswers ?? 0,
    totalQuestions: row.totalQuestions ?? 0,
    timeTakenSeconds: row.timeTakenSeconds ?? 0,
    score: row.score ?? 0,
    completedAt: row.completedAt ?? new Date().toISOString(),
    attemptId: row.attemptId ?? '',
    isCurrentUser: row.participant?.id === currentParticipantId,
  }
}

/** Level 1 — per-round leaderboard (cloud-first, local fallback). */
export async function getRoundLeaderboard(
  roundId: string,
  opts: RankingOptions = {},
): Promise<LeaderboardRow[]> {
  const remote = await apiGet<LeaderboardRow[]>(
    `/api/leaderboard?type=round&roundId=${encodeURIComponent(roundId)}`,
  )
  if (remote && Array.isArray(remote) && remote.length > 0) {
    return remote.map((r) => normalizeRemoteRoundRow(r, opts.currentParticipantId))
  }
  return computeRoundLeaderboardLocal(roundId, opts)
}

/** Level 2 — monthly ranking (sync, local only). */
export function computeMonthRankingLocal(monthId: string, opts: RankingOptions = {}): RankingRow[] {
  const rounds = listRoundsByMonth(monthId).map((r) => r.id)
  const attempts = getDb().attempts.filter(
    (a) => rounds.includes(a.roundId) && isValidAttempt(a),
  )
  return aggregateRows(attempts, opts)
}

/** Level 2 — monthly ranking (cloud-first, local fallback). */
export async function getMonthRanking(
  monthId: string,
  opts: RankingOptions = {},
): Promise<RankingRow[]> {
  const remote = await apiGet<RankingRow[]>(
    `/api/leaderboard?type=month&monthId=${encodeURIComponent(monthId)}`,
  )
  if (remote && Array.isArray(remote) && remote.length > 0) {
    return remote.map((r) => ({
      ...r,
      participant: normalizeRemoteParticipant(r.participant),
      isCurrentUser: r.participant?.id === opts.currentParticipantId,
    }))
  }
  return computeMonthRankingLocal(monthId, opts)
}

/** Level 3 — season overall ranking (sync, local only). */
export function computeSeasonRankingLocal(seasonId: string, opts: RankingOptions = {}): RankingRow[] {
  const monthIds = listMonths(seasonId).map((m) => m.id)
  const roundIds = monthIds.flatMap((mid) => listRoundsByMonth(mid).map((r) => r.id))
  const attempts = getDb().attempts.filter(
    (a) => roundIds.includes(a.roundId) && isValidAttempt(a),
  )
  return aggregateRows(attempts, opts)
}

/** Level 3 — season overall ranking (cloud-first, local fallback). */
export async function getSeasonRanking(
  seasonId: string,
  opts: RankingOptions = {},
): Promise<RankingRow[]> {
  const remote = await apiGet<RankingRow[]>(
    `/api/leaderboard?type=season&seasonId=${encodeURIComponent(seasonId)}`,
  )
  if (remote && Array.isArray(remote) && remote.length > 0) {
    return remote.map((r) => ({
      ...r,
      participant: normalizeRemoteParticipant(r.participant),
      isCurrentUser: r.participant?.id === opts.currentParticipantId,
    }))
  }
  return computeSeasonRankingLocal(seasonId, opts)
}

export function computeOverallRankingLocal(opts: RankingOptions = {}): RankingRow[] {
  const db = getDb()
  const seasonIds = db.seasons.map((s) => s.id)
  const rows = seasonIds.flatMap((sid) => computeSeasonRankingLocal(sid, opts))
  const byParticipant = new Map<string, RankingRow>()
  for (const r of rows) {
    const existing = byParticipant.get(r.participant.id)
    if (existing) {
      existing.rounds += r.rounds
      existing.points += r.points
      existing.totalCorrect += r.totalCorrect
      existing.avgTimeSeconds = Math.round((existing.avgTimeSeconds + r.avgTimeSeconds) / 2)
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

export async function getOverallRanking(opts: RankingOptions = {}): Promise<RankingRow[]> {
  const remote = await apiGet<RankingRow[]>('/api/leaderboard?type=overall')
  if (remote && Array.isArray(remote) && remote.length > 0) {
    return remote.map((r) => ({
      ...r,
      participant: normalizeRemoteParticipant(r.participant),
      isCurrentUser: r.participant?.id === opts.currentParticipantId,
    }))
  }
  return computeOverallRankingLocal(opts)
}

export function getAttemptRank(attemptId: string): number {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) return 0
  return computeRoundLeaderboardLocal(attempt.roundId).find((r) => r.attemptId === attemptId)
    ?.rank ?? 0
}
