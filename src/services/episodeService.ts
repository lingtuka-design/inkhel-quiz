import { getDb, saveDb, newId } from '../db/database'
import { nowIso, slugify } from '../lib/utils'
import type { Episode, EpisodeStatus } from '../types'
import { getSeason } from './seasonService'

export interface EpisodeInput {
  title: string
  description: string
  seasonId: string
  timeLimitSeconds: number
  status: EpisodeStatus
  bannerGradient: string
  bannerIcon: string
  bannerUrl: string | null
}

export function listEpisodes(): Episode[] {
  return [...getDb().episodes].sort((a, b) =>
    (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt),
  )
}

export function listPublishedEpisodes(): Episode[] {
  return listEpisodes().filter((e) => e.status !== 'draft')
}

export function getEpisode(id: string): Episode | null {
  return getDb().episodes.find((e) => e.id === id) ?? null
}

export function getEpisodeBySlug(slug: string): Episode | null {
  return getDb().episodes.find((e) => e.slug === slug) ?? null
}

export function listEpisodesBySeason(seasonId: string): Episode[] {
  return listEpisodes().filter((e) => e.seasonId === seasonId)
}

export function uniqueSlug(title: string, excludeId?: string): string {
  const base = slugify(title) || 'episode'
  let slug = base
  let i = 2
  while (getDb().episodes.some((e) => e.slug === slug && e.id !== excludeId)) {
    slug = `${base}-${i++}`
  }
  return slug
}

export function validateEpisode(input: EpisodeInput): string[] {
  const errors: string[] = []
  if (!input.title.trim()) errors.push('Episode title is required')
  if (!input.seasonId) errors.push('An episode must belong to a season')
  else if (!getSeason(input.seasonId)) errors.push('Selected season does not exist')
  if (!Number.isFinite(input.timeLimitSeconds) || input.timeLimitSeconds <= 0) {
    errors.push('Time limit must be greater than zero')
  }
  if (input.timeLimitSeconds > 3600) errors.push('Time limit cannot exceed 60 minutes')
  if (input.status === 'published') errors.push(...validateEpisodeForPublishing(input.title, input.seasonId, input.timeLimitSeconds))
  return errors
}

export function validateEpisodeForPublishing(
  title: string,
  seasonId: string,
  timeLimitSeconds: number,
): string[] {
  const errors: string[] = []
  if (!title.trim()) errors.push('Episode must have a title')
  if (!seasonId) errors.push('Episode must have a season')
  if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds <= 0) {
    errors.push('Episode must have a valid time limit')
  }
  return errors
}

export function createEpisode(input: EpisodeInput): Episode {
  const errors = validateEpisode(input)
  if (errors.length) throw new Error(errors[0])
  const db = getDb()
  const episode: Episode = {
    id: newId('ep'),
    seasonId: input.seasonId,
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
  db.episodes.push(episode)
  saveDb()
  return episode
}

export function updateEpisode(id: string, input: EpisodeInput): Episode {
  const errors = validateEpisode(input)
  if (errors.length) throw new Error(errors[0])
  const db = getDb()
  const episode = db.episodes.find((e) => e.id === id)
  if (!episode) throw new Error('Episode not found')
  const hadPublishedAttempts = hasPublishedAttempts(id)
  if (hadPublishedAttempts && episode.status === 'published') {
    throw new Error('This episode has participant attempts and is locked. Unpublish it first to edit content.')
  }
  episode.title = input.title.trim()
  episode.description = input.description.trim()
  episode.seasonId = input.seasonId
  episode.timeLimitSeconds = input.timeLimitSeconds
  episode.bannerGradient = input.bannerGradient
  episode.bannerIcon = input.bannerIcon
  episode.bannerUrl = input.bannerUrl
  if (input.status === 'published' && !episode.publishedAt) episode.publishedAt = nowIso()
  if (input.status !== 'published' && episode.publishedAt) episode.publishedAt = null
  episode.status = input.status
  episode.slug = uniqueSlug(episode.title, id)
  episode.updatedAt = nowIso()
  saveDb()
  return episode
}

export function setEpisodeStatus(id: string, status: EpisodeStatus): Episode {
  const db = getDb()
  const episode = db.episodes.find((e) => e.id === id)
  if (!episode) throw new Error('Episode not found')
  if (status === 'published') {
    const contentErrors = validatePublishedContent(id)
    if (contentErrors.length) throw new Error(contentErrors[0])
  }
  episode.status = status
  episode.publishedAt = status === 'published' ? nowIso() : null
  episode.updatedAt = nowIso()
  saveDb()
  return episode
}

export function validatePublishedContent(episodeId: string): string[] {
  const db = getDb()
  const episode = db.episodes.find((e) => e.id === episodeId)
  if (!episode) return ['Episode not found']
  const errors = validateEpisodeForPublishing(episode.title, episode.seasonId, episode.timeLimitSeconds)
  const qs = db.questions.filter((q) => q.episodeId === episodeId)
  if (qs.length === 0) errors.push('Episode must contain at least one question')
  for (const q of qs) {
    if (!q.text.trim()) errors.push('Every question must have text')
    const opts = db.options.filter((o) => o.questionId === q.id)
    if (opts.length !== 4) errors.push('Every question must have exactly four options')
    for (const o of opts) if (!o.text.trim()) errors.push('Every option must have text')
    if (opts.filter((o) => o.isCorrect).length !== 1) errors.push('Every question must have exactly one correct answer')
  }
  return errors
}

export function deleteEpisode(id: string): void {
  const db = getDb()
  const episode = db.episodes.find((e) => e.id === id)
  if (!episode) throw new Error('Episode not found')
  if (episode.status === 'published' && hasPublishedAttempts(id)) {
    throw new Error('Published episodes with attempts cannot be deleted. Archive instead.')
  }
  const qs = db.questions.filter((q) => q.episodeId === id)
  const qIds = new Set(qs.map((q) => q.id))
  db.questions = db.questions.filter((q) => !qIds.has(q.id))
  db.options = db.options.filter((o) => !qIds.has(o.questionId))
  db.episodes = db.episodes.filter((e) => e.id !== id)
  saveDb()
}

export function hasPublishedAttempts(episodeId: string): boolean {
  const db = getDb()
  return db.attempts.some(
    (a) => a.episodeId === episodeId && (a.status === 'completed' || a.status === 'expired') && !a.isTestAttempt,
  )
}

export function countAttempts(episodeId: string): number {
  return getDb().attempts.filter((a) => a.episodeId === episodeId && a.status !== 'abandoned').length
}

export function countParticipants(episodeId: string): number {
  const db = getDb()
  return new Set(
    db.attempts
      .filter((a) => a.episodeId === episodeId && a.status !== 'abandoned')
      .map((a) => a.participantId),
  ).size
}

export function countQuestions(episodeId: string): number {
  return getDb().questions.filter((q) => q.episodeId === episodeId).length
}
