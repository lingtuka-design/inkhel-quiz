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

export async function checkParticipantAttempt(participantId: string, roundId: string): Promise<Attempt | null> {
  try {
    const res = await fetch(
      `/api/attempts?participantId=${encodeURIComponent(participantId)}&roundId=${encodeURIComponent(roundId)}`
    )
    if (res.ok) {
      const data = await res.json()
      const db = getDb()
      if (data.attempt) {
        db.attempts = db.attempts.filter((a) => a.id !== data.attempt.id)
        db.attempts.push(data.attempt)
        saveDb()
        return data.attempt
      } else {
        // Clear any stale local attempt for this round
        db.attempts = db.attempts.filter((a) => !(a.participantId === participantId && a.roundId === roundId))
        saveDb()
        return null
      }
    }
  } catch {}
  return null
}

export async function hasCompletedRound(participantId: string, roundId: string): Promise<boolean> {
  const attempt = await checkParticipantAttempt(participantId, roundId)
  if (attempt) {
    return attempt.status === 'completed' || attempt.status === 'expired'
  }
  return false
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
      status: updated?.status === 'expired' ? 'expired' : 'finished',
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

  // Call Cloudflare D1
  const res = await fetch('/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start', participantId, roundId }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || 'Failed to start quiz')
  }

  const data = await res.json()
  const attempt: Attempt = data.attempt

  db.attempts = db.attempts.filter((a) => a.id !== attempt.id)
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

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  optionKey: OptionKey,
): Promise<AnswerResult> {
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

  const round = db.rounds.find((r) => r.id === attempt.roundId)
  const question = db.questions.find((q) => q.id === questionId && q.roundId === attempt.roundId)
  const options = db.options.filter((o) => o.questionId === questionId)
  const option = options.find((o) => o.optionKey === optionKey)

  const deadline = round ? getAttemptDeadline(attempt, round) : 0
  const now = Date.now()
  if (deadline && now > deadline + ATTEMPT_EXPIRY_GRACE_MS) {
    const finalized = await finalizeAttempt(attemptId)
    return {
      attempt: finalized,
      answeredCount: getAnsweredCount(attemptId),
      totalQuestions: db.questions.filter((q) => q.roundId === attempt.roundId).length || 10,
      finished: true,
      answer: getAnswers(attemptId).find((a) => a.questionId === questionId)!,
    }
  }

  const isCorrect = option?.isCorrect ?? false
  const elapsed = Math.round((now - new Date(attempt.startedAt).getTime()) / 1000)

  // Send answer to Cloudflare D1 synchronously
  await fetch('/api/attempts', {
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

  const answer: AttemptAnswer = {
    id: newId('ans'),
    attemptId,
    questionId,
    selectedOptionKey: optionKey,
    isCorrect,
    answeredAt: nowIso(),
    elapsedSeconds: elapsed,
  }
  db.answers = db.answers.filter((a) => !(a.attemptId === attemptId && a.questionId === questionId))
  db.answers.push(answer)

  const totalQuestions = db.questions.filter((q) => q.roundId === attempt.roundId).length || 10
  const answeredCount = getAnsweredCount(attemptId)
  const finished = answeredCount >= totalQuestions
  saveDb()

  let finalAttempt = attempt
  if (finished) {
    finalAttempt = await finalizeAttempt(attemptId)
  }

  return {
    attempt: finalAttempt,
    answeredCount,
    totalQuestions,
    finished,
    answer,
  }
}

export async function finalizeAttempt(attemptId: string): Promise<Attempt> {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)

  const res = await fetch('/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'finalize', attemptId }),
  })

  if (res.ok) {
    const data = await res.json()
    if (data.attempt) {
      db.attempts = db.attempts.filter((a) => a.id !== data.attempt.id)
      db.attempts.push(data.attempt)
      saveDb()
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['played'] })
      return data.attempt
    }
  }

  if (attempt) {
    const round = db.rounds.find((r) => r.id === attempt.roundId)
    const answers = db.answers.filter((a) => a.attemptId === attemptId)
    const correctAnswers = answers.filter((a) => a.isCorrect).length
    const totalQ = db.questions.filter((q) => q.roundId === attempt.roundId).length || 10
    const timeTaken = answers.length ? Math.max(...answers.map((a) => a.elapsedSeconds)) : 0
    const score = calculateScore({
      totalQuestions: totalQ,
      correctAnswers,
      unansweredQuestions: Math.max(0, totalQ - answers.length),
      timeLimitSeconds: round?.timeLimitSeconds ?? 180,
      timeTakenSeconds: timeTaken,
      status: 'completed',
    })

    attempt.completedAt = nowIso()
    attempt.status = 'completed'
    attempt.timeTakenSeconds = timeTaken
    attempt.correctAnswers = correctAnswers
    attempt.incorrectAnswers = answers.length - correctAnswers
    attempt.unansweredQuestions = Math.max(0, totalQ - answers.length)
    attempt.baseScore = score.baseScore
    attempt.speedBonus = score.speedBonus
    attempt.finalScore = score.finalScore
    saveDb()
  }

  queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
  queryClient.invalidateQueries({ queryKey: ['played'] })
  return attempt!
}

export interface AttemptReview {
  attempt: Attempt
  round: Round
  participant: any
  questions: RoundReviewQuestion[]
  rank: number
  score: {
    baseScore: number
    speedBonus: number
    finalScore: number
    correctAnswers: number
    incorrectAnswers: number
    unansweredQuestions: number
    timeTakenSeconds: number
  }
}

export async function getAttemptReview(attemptId: string, _participantId?: string): Promise<AttemptReview | null> {
  try {
    const res = await fetch(`/api/attempts?id=${encodeURIComponent(attemptId)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.attempt) {
        return {
          attempt: data.attempt,
          round: data.round,
          participant: data.participant,
          questions: data.reviewQuestions || [],
          rank: data.rank || 1,
          score: {
            baseScore: data.attempt.baseScore || 0,
            speedBonus: data.attempt.speedBonus || 0,
            finalScore: data.attempt.finalScore || 0,
            correctAnswers: data.attempt.correctAnswers || 0,
            incorrectAnswers: data.attempt.incorrectAnswers || 0,
            unansweredQuestions: data.attempt.unansweredQuestions || 0,
            timeTakenSeconds: data.attempt.timeTakenSeconds || 0,
          },
        }
      }
    }
  } catch {}

  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) return null
  const round = db.rounds.find((r) => r.id === attempt.roundId)
  const participant = db.participants.find((p) => p.id === attempt.participantId)
  const questions = getRoundReviewQuestions(attemptId)

  return {
    attempt,
    round: round!,
    participant,
    questions,
    rank: 1,
    score: {
      baseScore: attempt.baseScore,
      speedBonus: attempt.speedBonus,
      finalScore: attempt.finalScore,
      correctAnswers: attempt.correctAnswers,
      incorrectAnswers: attempt.incorrectAnswers,
      unansweredQuestions: attempt.unansweredQuestions,
      timeTakenSeconds: attempt.timeTakenSeconds ?? 0,
    },
  }
}

export function listUserAttempts(participantId: string): Attempt[] {
  return getDb()
    .attempts.filter(
      (a) => a.participantId === participantId && (a.status === 'completed' || a.status === 'expired'),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getRoundReviewQuestions(attemptId: string): RoundReviewQuestion[] {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) return []
  const questions = db.questions
    .filter((q) => q.roundId === attempt.roundId)
    .sort((a, b) => a.order - b.order)
  const answers = db.answers.filter((a) => a.attemptId === attemptId)
  const answerMap = new Map(answers.map((a) => [a.questionId, a]))

  return questions.map((q) => {
    const ans = answerMap.get(q.id)
    const options = db.options
      .filter((o) => o.questionId === q.id)
      .sort((a, b) => a.optionKey.localeCompare(b.optionKey))
      .map((o) => ({ key: o.optionKey, text: o.text, isCorrect: o.isCorrect }))
    return {
      id: q.id,
      text: q.text,
      order: q.order,
      options,
      selectedKey: ans?.selectedOptionKey ?? null,
      isCorrect: ans?.isCorrect ?? false,
      answered: !!ans,
    }
  })
}
