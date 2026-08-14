import { getDb, saveDb, newId } from '../db/database'
import { nowIso } from '../lib/utils'
import type { Month, Season, SeasonInput, SeasonStatus } from '../types'

function monthName(year: number, month0: number): string {
  return new Date(Date.UTC(year, month0, 1)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export const DEFAULT_DURATION_MONTHS = 10

export function listSeasons(): Season[] {
  return getDb()
    .seasons.slice()
    .sort((a, b) => b.seasonNumber - a.seasonNumber)
}

export function getSeason(id: string | undefined): Season | null {
  if (!id) return null
  return getDb().seasons.find((s) => s.id === id) ?? null
}

export function getActiveSeason(): Season | null {
  return getDb().seasons.find((s) => s.status === 'active') ?? null
}

export function computeEndDate(startDate: string, durationMonths: number): string {
  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return new Date().toISOString()
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + durationMonths,
      0,
      23,
      59,
      59,
      999,
    ),
  )
  return end.toISOString()
}

export function validateSeason(input: SeasonInput): string[] {
  const errors: string[] = []
  if (!input.name.trim()) errors.push('Season name is required')
  if (!input.startDate) errors.push('Start date is required')
  if (!input.endDate) errors.push('End date is required')
  if (new Date(input.startDate) >= new Date(input.endDate)) {
    errors.push('End date must be after start date')
  }
  if (input.durationMonths < 1 || input.durationMonths > 12) {
    errors.push('Duration must be between 1 and 12 months')
  }
  return errors
}

export async function createSeason(input: SeasonInput): Promise<Season> {
  const errors = validateSeason(input)
  if (errors.length) throw new Error(errors[0])

  const token = localStorage.getItem('inkhel_admin_token')
  const seasonId = newId('season')

  // Send directly to Cloudflare D1
  const res = await fetch('/api/seasons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Admin-Token': token } : {}),
    },
    body: JSON.stringify({ action: 'create', ...input }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || 'Failed to create season in database')
  }

  const data = await res.json()
  const finalId = data.id || seasonId

  const db = getDb()
  const season: Season = {
    id: finalId,
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
  db.seasons = db.seasons.filter((s) => s.id !== finalId)
  db.seasons.push(season)
  generateMonths(season)
  saveDb()

  return season
}

export async function updateSeason(id: string, input: SeasonInput): Promise<Season> {
  const errors = validateSeason(input)
  if (errors.length) throw new Error(errors[0])

  const token = localStorage.getItem('inkhel_admin_token')
  const res = await fetch('/api/seasons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Admin-Token': token } : {}),
    },
    body: JSON.stringify({ action: 'update', id, ...input }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || 'Failed to update season in database')
  }

  const db = getDb()
  const season = db.seasons.find((s) => s.id === id)
  if (season) {
    season.name = input.name.trim()
    season.description = input.description.trim()
    season.seasonNumber = input.seasonNumber
    season.durationMonths = input.durationMonths
    season.startDate = new Date(input.startDate).toISOString()
    season.endDate = new Date(input.endDate).toISOString()
    season.status = input.status
    season.updatedAt = nowIso()
    if (input.status === 'active') deactivateOthers(db.seasons, id)
    generateMonths(season)
    saveDb()
    return season
  }

  return {
    id,
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
}

function deactivateOthers(seasons: Season[], exceptId?: string): void {
  for (const s of seasons) {
    if (s.id !== exceptId && s.status === 'active') s.status = 'completed'
  }
}

export function generateMonths(season: Season): Month[] {
  const db = getDb()
  db.months = db.months.filter((m) => m.seasonId !== season.id)
  const start = new Date(season.startDate)
  const months: Month[] = []
  for (let i = 0; i < season.durationMonths; i++) {
    const mStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
    const mEnd = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i + 1, 0, 23, 59, 59, 999),
    )
    const m: Month = {
      id: `${season.id}_m${i + 1}`,
      seasonId: season.id,
      monthNumber: i + 1,
      name: monthName(mStart.getUTCFullYear(), mStart.getUTCMonth()),
      startDate: mStart.toISOString(),
      endDate: mEnd.toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    months.push(m)
    db.months.push(m)
  }
  saveDb()
  return months
}

/** Deletes a season and everything beneath it: months, rounds, questions, attempts and answers. */
export async function deleteSeason(id: string): Promise<{ rounds: number; attempts: number }> {
  const token = localStorage.getItem('inkhel_admin_token')
  const res = await fetch('/api/seasons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Admin-Token': token } : {}),
    },
    body: JSON.stringify({ action: 'delete', id }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || 'Failed to delete season in database')
  }

  const db = getDb()
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

  return { rounds: roundIds.length, attempts: attemptIds.length }
}

export async function setSeasonStatus(id: string, status: SeasonStatus): Promise<Season> {
  const season = getSeason(id)
  if (!season) throw new Error('Season not found')
  return updateSeason(id, { ...season, status })
}
