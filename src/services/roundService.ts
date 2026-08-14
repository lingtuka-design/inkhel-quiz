import { getDb, saveDb, newId } from '../db/database'
import { nowIso, slugify } from '../lib/utils'
import type { Round, RoundStatus } from '../types'
import { getMonth, isMonthOpen } from './monthService'

export const MIN_QUESTIONS_PER_ROUND = 10

export interface RoundInput {
  title: string
  description: string
  monthId: string
  timeLimitSeconds: number
  status: RoundStatus
  bannerGradient: string
  bannerIcon: string
  bannerUrl: string | null
}

export function listRounds(): Round[] {
  return [...getDb().rounds].sort((a, b) =>
    (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt),
  )
}

export function listRoundsByMonth(monthId: string): Round[] {
  return listRounds().filter((r) => r.monthId === monthId)
}

export function listAllPlayableRounds(): Round[] {
  return listRounds().filter((r) => isRoundPlayable(r))
}

export function getRound(id: string): Round | null {
  return getDb().rounds.find((r) => r.id === id) ?? null
}

export function getRoundBySlug(slug: string): Round | null {
  return getDb().rounds.find((r) => r.slug === slug) ?? null
}

/** A round is playable when published AND its month window is currently open. */
export function isRoundPlayable(round: Round): boolean {
  if (round.status !== 'published') return false
  const month = getMonth(round.monthId)
  if (!month) return false
  return isMonthOpen(month)
}

export function roundAvailability(round: Round): {
  open: boolean
  reason: 'draft' | 'archived' | 'month-upcoming' | 'month-closed' | 'open'
} {
  if (round.status !== 'published') return { open: false, reason: round.status }
  const month = getMonth(round.monthId)
  if (!month) return { open: false, reason: 'draft' }
  if (!isMonthOpen(month)) {
    return { open: false, reason: new Date(month.startDate).getTime() > Date.now() ? 'month-upcoming' : 'month-closed' }
  }
  return { open: true, reason: 'open' }
}

export function uniqueSlug(title: string, excludeId?: string): string {
  const base = slugify(title) || 'round'
  let slug = base
  let i = 2
  while (getDb().rounds.some((r) => r.slug === slug && r.id !== excludeId)) {
    slug = `${base}-${i++}`
  }
  return slug
}

export function validateRound(input: RoundInput): string[] {
  const errors: string[] = []
  if (!input.title.trim()) errors.push('Round title is required')
  if (!input.monthId) errors.push('A round must belong to a month')
  else if (!getMonth(input.monthId)) errors.push('Selected month does not exist')
  if (!Number.isFinite(input.timeLimitSeconds) || input.timeLimitSeconds <= 0) {
    errors.push('Time limit must be greater than zero')
  }
  if (input.timeLimitSeconds > 3600) errors.push('Time limit cannot exceed 60 minutes')
  if (input.status === 'published') {
    errors.push(...validateRoundForPublishing(input.title, input.monthId, input.timeLimitSeconds))
  }
  return errors
}

export function validateRoundForPublishing(title: string, monthId: string, timeLimitSeconds: number): string[] {
  const errors: string[] = []
  if (!title.trim()) errors.push('Round must have a title')
  if (!monthId) errors.push('Round must belong to a month')
  if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds <= 0) {
    errors.push('Round must have a valid time limit')
  }
  return errors
}

export function createRound(input: RoundInput): Round {
  const errors = validateRound(input)
  if (errors.length) throw new Error(errors[0])
  const db = getDb()
  const round: Round = {
    id: newId('round'),
    monthId: input.monthId,
    title: input.title.trim(),
    slug: uniqueSlug(input.title),
    description: input.description.trim(),
    bannerGradient: input.bannerGradient,
    bannerIcon: input.bannerIcon,
    bannerUrl: input.bannerUrl,
    timeLimitSeconds: input.timeLimitSeconds,
    status: input.status,
    publishedAt: input.status === 'published' ? nowIso() : null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  db.rounds.push(round)
  saveDb()
  return round
}

export function updateRound(id: string, input: RoundInput): Round {
  const errors = validateRound(input)
  if (errors.length) throw new Error(errors[0])
  const db = getDb()
  const round = db.rounds.find((r) => r.id === id)
  if (!round) throw new Error('Round not found')
  round.title = input.title.trim()
  round.description = input.description.trim()
  round.monthId = input.monthId
  round.timeLimitSeconds = input.timeLimitSeconds
  round.bannerGradient = input.bannerGradient
  round.bannerIcon = input.bannerIcon
  round.bannerUrl = input.bannerUrl
  if (input.status === 'published' && !round.publishedAt) round.publishedAt = nowIso()
  if (input.status !== 'published' && round.publishedAt) round.publishedAt = null
  round.status = input.status
  round.slug = uniqueSlug(round.title, id)
  round.updatedAt = nowIso()
  saveDb()
  return round
}

export function setRoundStatus(id: string, status: RoundStatus): Round {
  const db = getDb()
  const round = db.rounds.find((r) => r.id === id)
  if (!round) throw new Error('Round not found')
  if (status === 'published') {
    const contentErrors = validatePublishedContent(id)
    if (contentErrors.length) throw new Error(contentErrors[0])
  }
  round.status = status
  round.publishedAt = status === 'published' ? nowIso() : null
  round.updatedAt = nowIso()
  saveDb()
  return round
}

export function validatePublishedContent(roundId: string): string[] {
  const db = getDb()
  const round = db.rounds.find((r) => r.id === roundId)
  if (!round) return ['Round not found']
  const errors = validateRoundForPublishing(round.title, round.monthId, round.timeLimitSeconds)
  const qs = db.questions.filter((q) => q.roundId === roundId)
  if (qs.length < MIN_QUESTIONS_PER_ROUND) {
    errors.push(`A round must contain at least ${MIN_QUESTIONS_PER_ROUND} questions before publishing (currently ${qs.length})`)
  }
  for (const q of qs) {
    if (!q.text.trim()) errors.push('Every question must have text')
    const opts = db.options.filter((o) => o.questionId === q.id)
    if (opts.length !== 4) errors.push('Every question must have exactly four options')
    for (const o of opts) if (!o.text.trim()) errors.push('Every option must have text')
    if (opts.filter((o) => o.isCorrect).length !== 1) errors.push('Every question must have exactly one correct answer')
  }
  return errors
}

/** Deletes a round and its questions, options, attempts and answers. */
export function deleteRound(id: string): { attempts: number } {
  const db = getDb()
  const round = db.rounds.find((r) => r.id === id)
  if (!round) throw new Error('Round not found')

  const questionIds = db.questions.filter((q) => q.roundId === id).map((q) => q.id)
  const attemptIds = db.attempts.filter((a) => a.roundId === id).map((a) => a.id)

  db.questions = db.questions.filter((q) => !questionIds.includes(q.id))
  db.options = db.options.filter((o) => !questionIds.includes(o.questionId))
  db.attempts = db.attempts.filter((a) => !attemptIds.includes(a.id))
  db.answers = db.answers.filter((a) => !attemptIds.includes(a.attemptId))
  db.rounds = db.rounds.filter((r) => r.id !== id)
  saveDb()
  return { attempts: attemptIds.length }
}

export function countAttempts(roundId: string): number {
  return getDb().attempts.filter((a) => a.roundId === roundId && a.status !== 'abandoned').length
}

export function countParticipants(roundId: string): number {
  const db = getDb()
  return new Set(
    db.attempts
      .filter((a) => a.roundId === roundId && a.status !== 'abandoned')
      .map((a) => a.participantId),
  ).size
}

export function countQuestions(roundId: string): number {
  return getDb().questions.filter((q) => q.roundId === roundId).length
}
