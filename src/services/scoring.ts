import type { Attempt, AttemptStatus } from '../types'

export const POINTS_PER_CORRECT = 10
export const MAX_SPEED_BONUS = 20

export interface ScoreInput {
  totalQuestions: number
  correctAnswers: number
  unansweredQuestions: number
  timeLimitSeconds: number
  timeTakenSeconds: number
  status: AttemptStatus
}

export interface ScoreResult {
  baseScore: number
  speedBonus: number
  finalScore: number
}

/**
 * Base = correct × 10.
 * Speed bonus = round(20 × remaining/total), only when the attempt
 * finished successfully before the deadline with no unanswered questions.
 * Correctness always dominates the score.
 */
export function calculateScore(input: ScoreInput): ScoreResult {
  const baseScore = input.correctAnswers * POINTS_PER_CORRECT
  let speedBonus = 0
  const finishedInTime =
    input.status === 'completed' && input.unansweredQuestions === 0
  if (finishedInTime && input.timeLimitSeconds > 0) {
    const remaining = Math.max(0, input.timeLimitSeconds - input.timeTakenSeconds)
    const efficiency = remaining / input.timeLimitSeconds
    speedBonus = Math.round(MAX_SPEED_BONUS * efficiency)
  }
  return { baseScore, speedBonus, finalScore: baseScore + speedBonus }
}

export type AttemptLike = Pick<
  Attempt,
  'finalScore' | 'correctAnswers' | 'timeTakenSeconds' | 'completedAt'
>

/**
 * Tie-breaking: score desc → correct desc → time asc → submitted earlier wins.
 */
export function compareAttempts(a: AttemptLike, b: AttemptLike): number {
  if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore
  if (a.correctAnswers !== b.correctAnswers) return b.correctAnswers - a.correctAnswers
  const at = a.timeTakenSeconds ?? Number.MAX_SAFE_INTEGER
  const bt = b.timeTakenSeconds ?? Number.MAX_SAFE_INTEGER
  if (at !== bt) return at - bt
  return new Date(a.completedAt ?? 0).getTime() - new Date(b.completedAt ?? 0).getTime()
}

export function validateAttempts(a: AttemptLike, b: AttemptLike): number {
  return compareAttempts(a, b)
}
