import { getDb, saveDb, newId } from '../db/database'
import { nowIso } from '../lib/utils'
import type { Season, SeasonStatus } from '../types'
import { generateMonths } from './monthService'
import { apiPost, getD1Token } from './apiClient'

export const DEFAULT_DURATION_MONTHS = 10

export interface SeasonInput {
  name: string
  seasonNumber: number
  description: string
  durationMonths: number
  startDate: string
  endDate: string
  status: SeasonStatus
}

export function computeEndDate(startDate: string, durationMonths: number): string {
  const d = new Date(startDate)
  if (Number.isNaN(d.getTime())) return startDate
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + durationMonths, 0, 23, 59, 59, 999))
  return lastDay.toISOString()
}

export function listSeasons(): Season[] {
  return [...getDb().seasons].sort((a, b) => a.seasonNumber - b.seasonNumber)
}

export function getSeason(id: string): Season | null {
  return getDb().seasons.find((s) => s.id === id) ?? null
}

export function getActiveSeason(): Season | null {
  return (
    getDb().seasons.find((s) => s.status === 'active') ??
    getDb().seasons.find((s) => s.status === 'draft') ??
    null
  )
}

export function validateSeason(input: SeasonInput): string[] {
  const errors: string[] = []
  if (!input.name.trim()) errors.push('Season name is required')
  if (!Number.isFinite(input.seasonNumber) || input.seasonNumber < 1) errors.push('Season number must be at least 1')
  const start = new Date(input.startDate)
  const end = new Date(input.endDate)
  if (Number.isNaN(start.getTime())) errors.push('Start date is invalid')
  if (Number.isNaN(end.getTime())) errors.push('End date is invalid')
  if (start.getTime() >= end.getTime()) errors.push('End date must be after the start date')
  if (input.durationMonths < 1 || input.durationMonths > 12) errors.push('Duration must be between 1 and 12 months')
  return errors
}

export function createSeason(input: SeasonInput): Season {
  const errors = validateSeason(input)
  if (errors.length) throw new Error(errors[0])
  const db = getDb()
  const season: Season = {
    id: newId('season'),
    name: input.name.trim(),
    description: input.description.trim(),
    seasonNumber: input.seasonNumber,
    durationMonths: input.durationMonths,
    startDate: new Date(input.startDate).toISOString(),
    endDate: new Date(input.endDate).toISOString(),
    status: input.status,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  if (season.status === 'active') deactivateOthers(db.seasons)
  db.seasons.push(season)
  saveDb()
  generateMonths(season)
  // Best-effort mirror to the shared D1 backend (requires admin D1 session)
  if (getD1Token()) {
    void apiPost('/api/seasons', {
      action: 'create',
      id: season.id,
      name: season.name,
      description: season.description,
      durationMonths: season.durationMonths,
      startDate: season.startDate.slice(0, 10),
    })
  }
  return season
}

export function updateSeason(id: string, input: SeasonInput): Season {
  const errors = validateSeason(input)
  if (errors.length) throw new Error(errors[0])
  const db = getDb()
  const season = db.seasons.find((s) => s.id === id)
  if (!season) throw new Error('Season not found')
  season.name = input.name.trim()
  season.description = input.description.trim()
  season.seasonNumber = input.seasonNumber
  season.durationMonths = input.durationMonths
  season.startDate = new Date(input.startDate).toISOString()
  season.endDate = new Date(input.endDate).toISOString()
  season.status = input.status
  season.updatedAt = nowIso()
  if (input.status === 'active') deactivateOthers(db.seasons, id)
  saveDb()
  generateMonths(season)
  if (getD1Token()) {
    void apiPost('/api/seasons', {
      action: 'update',
      id: season.id,
      name: season.name,
      description: season.description,
      status: season.status,
    })
  }
  return season
}

function deactivateOthers(seasons: Season[], exceptId?: string): void {
  for (const s of seasons) {
    if (s.id !== exceptId && s.status === 'active') s.status = 'completed'
  }
}

/** Deletes a season and everything beneath it: months, rounds, questions, attempts and answers. */
export function deleteSeason(id: string): { rounds: number; attempts: number } {
  const db = getDb()
  const season = db.seasons.find((s) => s.id === id)
  if (!season) throw new Error('Season not found')

  const monthIds = db.months.filter((m) => m.seasonId === id).map((m) => m.id)
  const roundIds = db.rounds.filter((r) => monthIds.includes(r.monthId)).map((r) => r.id)
  const questionIds = db.questions
    .filter((q) => roundIds.includes(q.roundId))
    .map((q) => q.id)
  const attemptIds = db.attempts
    .filter((a) => roundIds.includes(a.roundId))
    .map((a) => a.id)

  db.months = db.months.filter((m) => !monthIds.includes(m.id))
  db.rounds = db.rounds.filter((r) => !roundIds.includes(r.id))
  db.questions = db.questions.filter((q) => !questionIds.includes(q.id))
  db.options = db.options.filter((o) => !questionIds.includes(o.questionId))
  db.attempts = db.attempts.filter((a) => !attemptIds.includes(a.id))
  db.answers = db.answers.filter((a) => !attemptIds.includes(a.attemptId))
  db.seasons = db.seasons.filter((s) => s.id !== id)
  saveDb()
  if (getD1Token()) {
    void apiPost('/api/seasons', { action: 'delete', id })
  }
  return { rounds: roundIds.length, attempts: attemptIds.length }
}

export function setSeasonStatus(id: string, status: SeasonStatus): Season {
  return updateSeason(id, { ...getSeason(id)!, status })
}
