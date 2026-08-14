import { getDb } from '../db/database'
import type { Attempt, LeaderboardRow, Participant, RankingRow } from '../types'
import { compareAttempts } from './scoring'

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

export interface EpisodeLeaderboardInput {
  currentParticipantId?: string | null
}

export function getEpisodeLeaderboard(
  episodeId: string,
  opts: EpisodeLeaderboardInput = {},
): LeaderboardRow[] {
  const db = getDb()
  const attempts = db.attempts
    .filter((a) => a.episodeId === episodeId && isValidAttempt(a))
    .sort(compareAttempts)
  const totalQuestions = db.questions.filter((q) => q.episodeId === episodeId).length
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

export function getSeasonRanking(
  seasonId: string,
  opts: EpisodeLeaderboardInput = {},
): RankingRow[] {
  const db = getDb()
  const episodes = db.episodes.filter((e) => e.seasonId === seasonId).map((e) => e.id)
  const attempts = db.attempts.filter((a) => episodes.includes(a.episodeId) && isValidAttempt(a))
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
      const avgTime = Math.round(list.reduce((s, a) => s + (a.timeTakenSeconds ?? 0), 0) / list.length)
      const scores = list.map((a) => a.finalScore)
      return {
        participantId: pid,
        episodes: list.length,
        points: total,
        totalCorrect: correct,
        avgTimeSeconds: avgTime,
        bestScore: Math.max(...scores),
        worstScore: Math.min(...scores),
      }
    })
    .sort((a, b) => b.points - a.points || b.episodes - a.episodes)
  return rows.map((r, i) => ({
    rank: i + 1,
    participant: participantById(r.participantId),
    episodes: r.episodes,
    points: r.points,
    totalCorrect: r.totalCorrect,
    avgTimeSeconds: r.avgTimeSeconds,
    bestScore: r.bestScore,
    worstScore: r.worstScore,
    isCurrentUser: r.participantId === opts.currentParticipantId,
  }))
}

export function getOverallRanking(opts: EpisodeLeaderboardInput = {}): RankingRow[] {
  const db = getDb()
  const seasons = db.seasons.map((s) => s.id)
  const rows = seasons.map((s) => getSeasonRanking(s, opts)).flat()
  const byParticipant = new Map<string, RankingRow>()
  for (const r of rows) {
    const existing = byParticipant.get(r.participant.id)
    if (existing) {
      existing.episodes += r.episodes
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
    .sort((a, b) => b.points - a.points || b.episodes - a.episodes)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

export function getAdminSeasonStats(seasonId: string): RankingRow[] {
  return getSeasonRanking(seasonId, {})
}

export function getAttemptRank(attemptId: string): number {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) return 0
  return getEpisodeLeaderboard(attempt.episodeId).find((r) => r.attemptId === attemptId)?.rank ?? 0
}
