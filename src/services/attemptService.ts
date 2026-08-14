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
import { roundAvailability } from './roundService'
import { queryClient } from '../lib/query'

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

export interface ResumeInfo {
  attempt: Attempt
  deadline: number
  answeredCount: number
  totalQuestions: number
  status: 'active' | 'expired' | 'finished'
}

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

export function startAttempt(participantId: string, roundId: string): Attempt {
  const db = getDb()
  const round = db.rounds.find((r) => r.id === roundId)
  if (!round) throw new Error('Round not found')

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

  // Sync to Cloudflare D1
  fetch('/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start', participantId, roundId }),
  }).catch(() => {})

  return attempt
}

export interface AnswerResult {
  attempt: Attempt
  answeredCount: number
  totalQuestions: number
  finished: boolean
  answer: AttemptAnswer
}

export function submitAnswer(
  attemptId: string,
  questionId: string,
  optionKey: OptionKey,
): AnswerResult {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) throw new Error('Attempt not found')
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
  const options = db.options.filter((o) => o.questionId === questionId)
  const option = options.find((o) => o.optionKey === optionKey)
  if (!option) throw new Error('Invalid option')

  const deadline = getAttemptDeadline(attempt, round)
  const now = Date.now()
  if (now > deadline + ATTEMPT_EXPIRY_GRACE_MS) {
    finalizeAttempt(attemptId)
    const updated = getAttempt(attemptId)!
    return {
      attempt: updated,
      answeredCount: getAnsweredCount(attemptId),
      totalQuestions: db.questions.filter((q) => q.roundId === attempt.roundId).length,
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
      totalQuestions: db.questions.filter((q) => q.roundId === attempt.roundId).length,
      finished:
        getAnsweredCount(attemptId) >=
        db.questions.filter((q) => q.roundId === attempt.roundId).length,
      answer: existing,
    }
  }

  const isCorrect = option.isCorrect
  const elapsed = Math.round((now - new Date(attempt.startedAt).getTime()) / 1000)
  const answer: AttemptAnswer = {
    id: newId('ans'),
    attemptId,
    questionId,
    selectedOptionKey: optionKey,
    isCorrect,
    answeredAt: nowIso(),
    elapsedSeconds: elapsed,
  }
  db.answers.push(answer)

  const totalQuestions = db.questions.filter((q) => q.roundId === attempt.roundId).length
  const answeredCount = getAnsweredCount(attemptId)
  const finished = answeredCount >= totalQuestions
  saveDb()

  // Sync answer to Cloudflare D1
  fetch('/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'answer',
      attemptId,
      questionId,
      selectedOptionKey: optionKey,
      elapsedSeconds: elapsed,
    }),
  }).catch(() => {})

  if (finished) finalizeAttempt(attemptId)

  const updated = getAttempt(attemptId)!
  return { attempt: updated, answeredCount, totalQuestions, finished, answer }
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
    expired
      ? 'expired'
      : answered >= allQuestions.length
        ? 'completed'
        : 'abandoned'
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

  // Finalize attempt in Cloudflare D1
  fetch('/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'finalize', attemptId, forceExpired: expired }),
  })
    .then(() => {
      // Invalidate queries so leaderboards and rankings reload live across all users
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['ranking'] })
    })
    .catch(() => {})

  return attempt
}

export function getAttemptReview(attemptId: string, participantId: string): {
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
        imageUrl: q.imageUrl || null,
        options: db.options
          .filter((o) => o.questionId === q.id)
          .sort((a, b) => a.optionKey.localeCompare(b.optionKey))
          .map((o) => ({ key: o.optionKey, text: o.text, isCorrect: o.isCorrect })),
        selectedKey: answer?.selectedOptionKey ?? null,
        isCorrect: answer?.isCorrect ?? false,
        answered: !!answer,
      }
    })
  return { attempt, questions, rank: 1 }
}
