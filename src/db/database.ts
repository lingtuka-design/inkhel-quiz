import type {
  AdminUser,
  Attempt,
  AttemptAnswer,
  Month,
  Participant,
  Question,
  QuestionOption,
  Round,
  Season,
} from '../types'
import { buildSeed } from './seed'
import { uid } from '../lib/crypto'

const DB_KEY = 'inkhel_db_v4'

export interface DBShape {
  seasons: Season[]
  months: Month[]
  rounds: Round[]
  questions: Question[]
  options: QuestionOption[]
  participants: Participant[]
  attempts: Attempt[]
  answers: AttemptAnswer[]
  admins: AdminUser[]
}

let cache: DBShape | null = null

export async function initDb(): Promise<void> {
  if (!cache) {
    try {
      const raw = localStorage.getItem(DB_KEY)
      if (raw) {
        cache = JSON.parse(raw) as DBShape
      }
    } catch {
      cache = null
    }
  }

  if (!cache) {
    cache = await buildSeed()
    persist()
  }

  // Sync latest data from Cloudflare D1
  try {
    const [seasonsRes, roundsRes] = await Promise.all([
      fetch('/api/seasons'),
      fetch('/api/rounds?all=true'),
    ])

    if (seasonsRes.ok) {
      const remoteSeasons = await seasonsRes.json()
      if (Array.isArray(remoteSeasons) && remoteSeasons.length > 0) {
        cache.seasons = remoteSeasons.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          seasonNumber: s.seasonNumber,
          durationMonths: s.durationMonths,
          startDate: s.startDate,
          endDate: s.endDate,
          status: s.status,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }))
        const allMonths: Month[] = []
        for (const s of remoteSeasons) {
          if (s.months) allMonths.push(...s.months)
        }
        if (allMonths.length > 0) cache.months = allMonths
        persist()
      }
    }

    if (roundsRes.ok) {
      const remoteRounds = await roundsRes.json()
      if (Array.isArray(remoteRounds) && remoteRounds.length > 0) {
        cache.rounds = remoteRounds
        persist()
      }
    }
  } catch {
    // Offline or static fallback
  }
}

function persist(): void {
  if (!cache) return
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache))
  } catch {
    // storage full — keep in-memory state
  }
}

export function getDb(): DBShape {
  if (!cache) throw new Error('Database not initialised — call initDb() first')
  return cache
}

export function resetDb(): void {
  localStorage.removeItem(DB_KEY)
  cache = null
}

export function newId(prefix: string): string {
  return uid(prefix)
}

export function saveDb(): void {
  persist()
}
