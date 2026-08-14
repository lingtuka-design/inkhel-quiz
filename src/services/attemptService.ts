import { getDb, saveDb, newId } from '../db/database'
import { nowIso } from '../lib/utils'
import type {
  Attempt,
  AttemptAnswer,
  AttemptStatus,
  Episode,
  EpisodeReviewQuestion,
  OptionKey,
} from '../types'
import { calculateScore } from './scoring'
import { getEpisodeLeaderboard } from './leaderboardService'

const ATTEMPT_EXPIRY_GRACE_MS = 0

export function getAttempt(id: string): Attempt | null {
  return getDb().attempts.find((a) => a.id === id) ?? null
}

export function getAttemptDeadline(attempt: Attempt, episode: Episode): number {
  return new Date(attempt.startedAt).getTime() + episode.timeLimitSeconds * 1000
}

export function getAnsweredCount(attemptId: string): number {
  return getDb().answers.filter((a) => a.attemptId === attemptId).length
}

export function getAnswers(attemptId: string): AttemptAnswer[] {
  return getDb().answers.filter((a) => a.attemptId === attemptId)
}

export function hasCompletedEpisode(participantId: string, episodeId: string): boolean {
  return getDb().attempts.some(
    (a) =>
      a.participantId === participantId &&
      a.episodeId === episodeId &&
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

/**
 * The server holds the authoritative start time and deadline.
 * The browser only derives the visual countdown from the server deadline.
 */
export function resumeAttempt(participantId: string, episodeId: string): ResumeInfo | null {
  const db = getDb()
  const episode = db.episodes.find((e) => e.id === episodeId)
  if (!episode) return null
  const attempt = db.attempts.find(
    (a) => a.participantId === participantId && a.episodeId === episodeId && a.status === 'in_progress',
  )
  if (!attempt) return null
  const totalQuestions = db.questions.filter((q) => q.episodeId === episodeId).length
  const deadline = getAttemptDeadline(attempt, episode)
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

export function startAttempt(participantId: string, episodeId: string): Attempt {
  const db = getDb()
  const episode = db.episodes.find((e) => e.id === episodeId)
  if (!episode) throw new Error('Episode not found')
  if (episode.status !== 'published') throw new Error('This episode is not open for play')

  const existing = db.attempts.find(
    (a) => a.participantId === participantId && a.episodeId === episodeId,
  )
  if (existing && existing.status !== 'in_progress') {
    throw new Error('You have already completed this episode. One attempt per episode.')
  }
  if (existing && existing.status === 'in_progress') return existing

  const totalQuestions = db.questions.filter((q) => q.episodeId === episodeId).length
  const attempt: Attempt = {
    id: newId('att'),
    participantId,
    episodeId,
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

/**
 * Server-side answer submission. Idempotent per (attempt, question).
 * The server decides whether the answer arrived before the deadline.
 */
export function submitAnswer(
  attemptId: string,
  questionId: string,
  optionKey: OptionKey,
): AnswerResult {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) throw new Error('Attempt not found')
  if (attempt.status !== 'in_progress') {
    throw new Error(attempt.status === 'completed' || attempt.status === 'expired' ? 'ATTEMPT_FINISHED' : 'ATTEMPT_ABANDONED')
  }

  const episode = db.episodes.find((e) => e.id === attempt.episodeId)!
  const question = db.questions.find((q) => q.id === questionId && q.episodeId === attempt.episodeId)
  if (!question) throw new Error('Question not found')
  const options = db.options.filter((o) => o.questionId === questionId)
  const option = options.find((o) => o.optionKey === optionKey)
  if (!option) throw new Error('Invalid option')

  const deadline = getAttemptDeadline(attempt, episode)
  const now = Date.now()
  if (now > deadline + ATTEMPT_EXPIRY_GRACE_MS) {
    finalizeAttempt(attemptId)
    const updated = getAttempt(attemptId)!
    return {
      attempt: updated,
      answeredCount: getAnsweredCount(attemptId),
      totalQuestions: db.questions.filter((q) => q.episodeId === attempt.episodeId).length,
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
      totalQuestions: db.questions.filter((q) => q.episodeId === attempt.episodeId).length,
      finished: getAnsweredCount(attemptId) >= db.questions.filter((q) => q.episodeId === attempt.episodeId).length,
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

  const totalQuestions = db.questions.filter((q) => q.episodeId === attempt.episodeId).length
  const answeredCount = getAnsweredCount(attemptId)
  const finished = answeredCount >= totalQuestions
  saveDb()
  if (finished) finalizeAttempt(attemptId)

  const updated = getAttempt(attemptId)!
  return { attempt: updated, answeredCount, totalQuestions, finished, answer }
}

export function finalizeAttempt(attemptId: string): Attempt {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt) throw new Error('Attempt not found')
  if (attempt.status !== 'in_progress') return attempt

  const episode = db.episodes.find((e) => e.id === attempt.episodeId)!
  const allQuestions = db.questions.filter((q) => q.episodeId === attempt.episodeId)
  const answers = getAnswers(attemptId)
  const answeredQuestionIds = new Set(answers.map((a) => a.questionId))
  const correct = answers.filter((a) => a.isCorrect).length
  const answered = answers.length
  const unanswered = allQuestions.length - answered

  const deadline = getAttemptDeadline(attempt, episode)
  const now = Date.now()
  const expired = now >= deadline
  const timeTaken = expired ? episode.timeLimitSeconds : Math.max(1, Math.round((now - new Date(attempt.startedAt).getTime()) / 1000))

  const status: AttemptStatus = expired ? 'expired' : answered >= allQuestions.length ? 'completed' : 'abandoned'
  const score = calculateScore({
    totalQuestions: allQuestions.length,
    correctAnswers: correct,
    unansweredQuestions: unanswered,
    timeLimitSeconds: episode.timeLimitSeconds,
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

export function getAttemptReview(attemptId: string, participantId: string): {
  attempt: Attempt
  questions: EpisodeReviewQuestion[]
  rank: number
} | null {
  const db = getDb()
  const attempt = db.attempts.find((a) => a.id === attemptId)
  if (!attempt || attempt.participantId !== participantId) return null
  if (attempt.status === 'in_progress') return null
  const episode = db.episodes.find((e) => e.id === attempt.episodeId)!
  const answers = new Map(getAnswers(attemptId).map((a) => [a.questionId, a]))
  const questions: EpisodeReviewQuestion[] = db.questions
    .filter((q) => q.episodeId === episode.id)
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
  const rank = getEpisodeLeaderboard(episode.id).find((r) => r.attemptId === attemptId)?.rank ?? 0
  return { attempt, questions, rank }
}
