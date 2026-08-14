import { getDb, saveDb, newId } from '../db/database'
import { nowIso } from '../lib/utils'
import type { Month, MonthStatus, Season } from '../types'

export function monthStatus(month: Month): MonthStatus {
  const now = Date.now()
  const start = new Date(month.startDate).getTime()
  const end = new Date(month.endDate).getTime()
  if (now < start) return 'upcoming'
  if (now > end) return 'completed'
  return 'open'
}

export function isMonthOpen(month: Month): boolean {
  return monthStatus(month) === 'open'
}

export function getMonth(id: string): Month | null {
  return getDb().months.find((m) => m.id === id) ?? null
}

export function listMonths(seasonId: string): Month[] {
  return getDb()
    .months.filter((m) => m.seasonId === seasonId)
    .sort((a, b) => a.monthNumber - b.monthNumber)
}

export function listAllMonths(): Month[] {
  return [...getDb().months].sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export function getCurrentMonth(): Month | null {
  const open = getDb().months.filter((m) => isMonthOpen(m))
  return open.sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null
}

export function generateMonths(season: Season): Month[] {
  const db = getDb()
  const start = new Date(season.startDate)
  const existing = db.months
    .filter((m) => m.seasonId === season.id)
    .sort((a, b) => a.monthNumber - b.monthNumber)
  const created: Month[] = []
  for (let i = 0; i < season.durationMonths; i++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
    const name = date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const month: Month = {
      id: existing[i]?.id ?? newId('month'),
      seasonId: season.id,
      monthNumber: i + 1,
      name,
      startDate: date.toISOString(),
      endDate: end.toISOString(),
      createdAt: existing[i]?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    }
    created.push(month)
  }
  db.months = [...db.months.filter((m) => m.seasonId !== season.id), ...created]
  saveDb()
  return created
}
