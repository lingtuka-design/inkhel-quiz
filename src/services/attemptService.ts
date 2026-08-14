import { getDb, saveDb, newId } from '../db/database'
import { nowIso } from '../lib/utils'
import type {
  Attempt,
  AttemptAnswer,
  AttemptStatus,
  OptionKey,
  Round,
  RoundReviewQuestion,
} from '../types'
import { calculateScore } from './scoring'
import { computeRoundLeaderboardLocal } from './leaderboardService'
import { roundAvailability, countQuestions as countRoundQuestions } from './roundService'
import { apiPost, apiGet } from './apiClient'

const ATTEMPT_EXPIRY_GRACE_MS = 0

export function getAttempt(id: string): Attempt | null {
  return getDb().attempts.find((a) => a.id === id) ?? null
}

export function getAttemptDeadline(attempt: Attempt, round: Round): number {
  return new Date(attempt.startedAt).getTime() + round.timeLimitSeconds * 1000
}

export function getAnsweredCount(attemptId: string): number {
  return getDb().answers.filter((a) => a.attemptId === attemptId).length
}

export function getAnswers(attemptId: string): AttemptAnswer[] {
  return getDb().answers.filter((a) => a.attemptId === attemptId)
}

export function hasCompletedRound(participantId: string, roundId: string): boolean {
  return getDb().attempts.some(
    (a) =>
      a.participantId === participantId &&
      a.roundId === roundId &&
      (a.status === 'completed' || a.status === 'expired'),
  )
}

/** Mirrors an attempt returned by the Cloudflare D1 API into the local store. */
export function mirrorAttemptFromServer(server: Record<string, any>): Attempt {
  const db = getDb()
  const existing = db.attempts.find((a) => a.id === server.id)
  const totalQuestions = countRoundQuestions(server.roundId)
  const attempt: Attempt = {
    id: server.id,
    participantId: server.participantId,
    roundId: server.roundId,
    startedAt: server.startedAt,
    completedAt: server.completedAt ?? null,
    status: server.status ?? 'in_progress',
    timeTakenSeconds: server.timeTakenSeconds ?? null,
    correctAnswers: server.correctAnswers ?? 0,
    incorrectAnswers: server.incorrectAnswers ?? 0,
    unansweredQuestions:
      server.unansweredQuestions ??
      (server.status === 'in_progress' ? totalQuestions : 0),
    baseScore: server.baseScore ?? 0,
    speedBonus: server.speedBonus ?? 0,
    finalScore: server.finalScore ?? 0,
    isTestAttempt: Boolean(server.isTestAttempt),
    createdAt: server.createdAt ?? server.startedAt,
  }
  if (existing) {
    Object.assign(existing, attempt)
  } else {
    db.attempts.push(attempt)
  }
  saveDb()
  return attempt
}

export interface ResumeInfo {
  attempt: Attempt
  deadline: number
  answeredCount: number
  totalQuestions: number
  status: 'active' | 'expired' | 'finished'
}

/**
 * The server holds the authoritative start time and deadline.
 * The browser only derives the visual countdown from the server deadline.
 */
export function resumeAttempt(participantId: string, roundId: string): ResumeInfo | null {
  const db = getDb()
  const round = db.rounds.find((r) => r.id === roundId)
  if (!round) return null
  const attempt = db.attempts.find(
    (a) => a.participantId === participantId && a.roundId === roundId && a.status === 'in_progress',
  )
  if (!attempt) return null
  const totalQuestions = db.questions.filter((q) => q.roundId === roundId).length
  const deadline = getAttemptDeadline(attempt, round)
  if (Date.now() > deadline) {
    finalizeAttempt(attempt.id)
    const updated = getAttempt(attempt.id)!
    return {
      attempt: updated,
      deadline,
      answeredCount: getAnsweredCount(attempt.id),
      totalQuestions,
      status: updated.status === 'expired' ? 'expired' : 'finished',
    }
  }
  return {
    attempt,
    deadline,
    answeredCount: getAnsweredCount(attempt.id),
    totalQuestions,
    status: 'active',
  }
}

export async function startAttempt(participantId: string, roundId: string): Promise<Attempt> {
  const db = getDb()
  const round = db.rounds.find((r) => r.id === roundId)
  if (!round) throw new Error('Round not found')

  // Cloud-first: the server records the authoritative start time so the same
  // attempt is shared with every user's leaderboard.
  const remote = await apiPost<{ attempt?: Record<string, any> }>('/api/attempts', {
    action: 'start',
    roundId,
    participantId,
  })
  if (remote?.attempt) {
    if (remote.attempt.status !== 'in_progress') {
      throw new Error('You have already completed this round. One attempt per round.')
    }
    return mirrorAttemptFromServer(remote.attempt)
  }

  // Offline fallback
  const availability = roundAvailability(round)
  if (!availability.open) {
    if (availability.reason === 'month-closed') {
      throw new Error('This round belongs to a past month and is no longer playable')
    }
    if (availability.reason === 'month-upcoming') {
      throw new Error('This round belongs to a future month and is not open yet')
    }
    throw new Error('This round is not open for play')
  }

  const existing = db.attempts.find(
    (a) => a.participantId === participantId && a.roundId === roundId,
  )
  if (existing && existing.status !== 'in_progress') {
    throw new Error('You have already completed this round. One attempt per round.')
  }
  if (existing && existing.status === 'in_progress') return existing

  const totalQuestions = db.questions.filter((q) => q.roundId === roundId).length
  const attempt: Attempt = {
    id: newId('att'),
    participantId,
    roundId,
    startedAt: nowIso(),
    completedAt: null,
    status: 'in_progress',
    timeTakenSeconds: null,
    correctAnswers: 0,
    incorrectAnswers: 0,
    unansweredQuestions: totalQuestions,
    baseScore: 0,
    speedBonus: 0,
    finalScore: 0,
    isTestAttempt: false,
    createdAt: nowIso(),
  }
  db.attempts.push(attempt)
  saveDb()
  return attempt
}

export interface AnswerResult {
  attempt: Attempt
  answeredCount: number
  totalQuestions: number
  finished: boolean
  answer: AttemptAnswer
}

function recordAnswerLocally(
  attempt: Attempt,
  questionId: string,
  optionKey: OptionKey,
  isCorrect: boolean,
  elapsed: number,
): AttemptAnswer {
  const db = getDb()
  const existing = db.answers.find(
    (a) => a.attemptId === attempt.id && a.questionId === questionId,
  )
  if (existing) return existing
  const answer: AttemptAnswer = {
    id: newId('ans'),
    attemptId: attempt.id,
    questionId,
    selectedOptionKey: optionKey,
    isCorrect,
    answeredAt: nowIso(),
    elapsedSeconds: elapsed,
  }
  db.answers.push(answer)
  saveDb()
  return answer
}

/**
 * Server-side answer submission. Idempotent per (attempt, question).
 * The server decides whether the answer arrived before the deadline and
 * evaluates correctness; the local store mirrors it for offline review.
 */
export async function submitAnswer(
  attemptId: string,
  questionId: string,
  optionKey: OptionKey,
): Promise<AnswerResult> {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) throw new Error('Attempt not found')

  const totalQuestions = countRoundQuestions(attempt.roundId)

  // Cloud-first
  const elapsed = Math.max(
    1,
    Math.round((Date.now() - new Date(attempt.startedAt).getTime()) / 1000),
  )
  const remote = await apiPost<{ success?: boolean }>('/api/attempts', {
    action: 'answer',
    attemptId,
    questionId,
    selectedOptionKey: optionKey,
    elapsedSeconds: elapsed,
  })
  if (remote?.success) {
    const option = db.options.find(
      (o) => o.questionId === questionId && o.optionKey === optionKey,
    )
    const answer = recordAnswerLocally(attempt, questionId, optionKey, option?.isCorrect ?? false, elapsed)
    const answeredCount = getAnsweredCount(attemptId)
    if (answeredCount >= totalQuestions) {
      const fin = await apiPost<{ attempt?: Record<string, any> }>('/api/attempts', {
        action: 'finalize',
        attemptId,
      })
      if (fin?.attempt) {
        const finalized = mirrorAttemptFromServer(fin.attempt)
        return { attempt: finalized, answeredCount, totalQuestions, finished: true, answer }
      }
      finalizeAttempt(attemptId)
      return {
        attempt: getAttempt(attemptId)!,
        answeredCount,
        totalQuestions,
        finished: true,
        answer,
      }
    }
    return {
      attempt: getAttempt(attemptId)!,
      answeredCount,
      totalQuestions,
      finished: false,
      answer,
    }
  }

  // Offline fallback (server-authoritative rules, evaluated locally)
  if (attempt.status !== 'in_progress') {
    throw new Error(
      attempt.status === 'completed' || attempt.status === 'expired'
        ? 'ATTEMPT_FINISHED'
        : 'ATTEMPT_ABANDONED',
    )
  }
  const round = db.rounds.find((r) => r.id === attempt.roundId)!
  const question = db.questions.find((q) => q.id === questionId && q.roundId === attempt.roundId)
  if (!question) throw new Error('Question not found')
  const option = db.options.find((o) => o.questionId === questionId && o.optionKey === optionKey)
  if (!option) throw new Error('Invalid option')

  const deadline = getAttemptDeadline(attempt, round)
  const now = Date.now()
  if (now > deadline + ATTEMPT_EXPIRY_GRACE_MS) {
    finalizeAttempt(attemptId)
    const updated = getAttempt(attemptId)!
    return {
      attempt: updated,
      answeredCount: getAnsweredCount(attemptId),
      totalQuestions,
      finished: true,
      answer: getAnswers(attemptId).find((a) => a.questionId === questionId)!,
    }
  }

  const existing = db.answers.find(
    (a) => a.attemptId === attemptId && a.questionId === questionId,
  )
  if (existing) {
    return {
      attempt,
      answeredCount: getAnsweredCount(attemptId),
      totalQuestions,
      finished: getAnsweredCount(attemptId) >= totalQuestions,
      answer: existing,
    }
  }

  const answer = recordAnswerLocally(
    attempt,
    questionId,
    optionKey,
    option.isCorrect,
    Math.round((now - new Date(attempt.startedAt).getTime()) / 1000),
  )
  const answeredCount = getAnsweredCount(attemptId)
  const finished = answeredCount >= totalQuestions
  if (finished) finalizeAttempt(attemptId)

  const updated = getAttempt(attemptId)!
  return { attempt: updated, answeredCount, totalQuestions, finished, answer }
}

/** Cloud-first finalization (e.g. on timer expiry). Falls back to local scoring. */
export async function finalizeAttemptCloud(attemptId: string): Promise<Attempt> {
  const fin = await apiPost<{ attempt?: Record<string, any> }>('/api/attempts', {
    action: 'finalize',
    attemptId,
    forceExpired: true,
  })
  if (fin?.attempt) return mirrorAttemptFromServer(fin.attempt)
  return finalizeAttempt(attemptId)
}

export function finalizeAttempt(attemptId: string): Attempt {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) throw new Error('Attempt not found')
  if (attempt.status !== 'in_progress') return attempt

  const round = db.rounds.find((r) => r.id === attempt.roundId)!
  const allQuestions = db.questions.filter((q) => q.roundId === attempt.roundId)
  const answers = getAnswers(attemptId)
  const correct = answers.filter((a) => a.isCorrect).length
  const answered = answers.length
  const unanswered = allQuestions.length - answered

  const deadline = getAttemptDeadline(attempt, round)
  const now = Date.now()
  const expired = now >= deadline
  const timeTaken = expired
    ? round.timeLimitSeconds
    : Math.max(1, Math.round((now - new Date(attempt.startedAt).getTime()) / 1000))

  const status: AttemptStatus =
    expired ? 'expired' : answered >= allQuestions.length ? 'completed' : 'abandoned'
  const score = calculateScore({
    totalQuestions: allQuestions.length,
    correctAnswers: correct,
    unansweredQuestions: unanswered,
    timeLimitSeconds: round.timeLimitSeconds,
    timeTakenSeconds: timeTaken,
    status: status === 'completed' ? 'completed' : status === 'expired' ? 'expired' : 'abandoned',
  })

  attempt.completedAt = new Date(Math.min(now, deadline + 2000)).toISOString()
  attempt.status = status
  attempt.timeTakenSeconds = timeTaken
  attempt.correctAnswers = correct
  attempt.incorrectAnswers = answered - correct
  attempt.unansweredQuestions = unanswered
  attempt.baseScore = score.baseScore
  attempt.speedBonus = score.speedBonus
  attempt.finalScore = score.finalScore
  saveDb()
  return attempt
}

export function getAttemptReviewLocal(attemptId: string, participantId: string): {
  attempt: Attempt
  questions: RoundReviewQuestion[]
  rank: number
} | null {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt || attempt.participantId !== participantId) return null
  if (attempt.status === 'in_progress') return null
  const round = db.rounds.find((r) => r.id === attempt.roundId)!
  const answers = new Map(getAnswers(attemptId).map((a) => [a.questionId, a]))
  const questions: RoundReviewQuestion[] = db.questions
    .filter((q) => q.roundId === round.id)
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const answer = answers.get(q.id)
      return {
        id: q.id,
        text: q.text,
        order: q.order,
        options: db.options
          .filter((o) => o.questionId === q.id)
          .sort((a, b) => a.optionKey.localeCompare(b.optionKey))
          .map((o) => ({ key: o.optionKey, text: o.text, isCorrect: o.isCorrect })),
        selectedKey: answer?.selectedOptionKey ?? null,
        isCorrect: answer?.isCorrect ?? false,
        answered: !!answer,
      }
    })
  const rank =
    computeRoundLeaderboardLocal(round.id).find((r) => r.attemptId === attemptId)?.rank ?? 0
  return { attempt, questions, rank }
}

/**
 * Cloud-first attempt review: the D1 backend holds the authoritative attempt,
 * answers and (post-completion) correct answers. Falls back to the local mirror.
 */
export async function getAttemptReview(attemptId: string, participantId: string): Promise<{
  attempt: Attempt
  questions: RoundReviewQuestion[]
  rank: number
} | null> {
  const remote = await apiGet<{
    attempt?: Record<string, any>
    reviewQuestions?: any[]
  }>(`/api/attempts?id=${encodeURIComponent(attemptId)}`)
  if (remote?.attempt) {
    const server = remote.attempt
    if (server.status === 'in_progress') return null
    const attempt = mirrorAttemptFromServer(server)
    const questions: RoundReviewQuestion[] = (remote.reviewQuestions ?? []).map((q: any) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      options: q.options ?? [],
      selectedKey: q.selectedKey ?? null,
      isCorrect: Boolean(q.isCorrect),
      answered: Boolean(q.answered),
    }))
    const cloudRank = await apiGet<any[]>(
      `/api/leaderboard?type=round&roundId=${encodeURIComponent(attempt.roundId)}`,
    )
    const rank =
      cloudRank?.find((r) => r.attemptId === attemptId)?.rank ??
      computeRoundLeaderboardLocal(attempt.roundId).find((r) => r.attemptId === attemptId)
        ?.rank ??
      0
    return { attempt, questions, rank }
  }
  return getAttemptReviewLocal(attemptId, participantId)
}
