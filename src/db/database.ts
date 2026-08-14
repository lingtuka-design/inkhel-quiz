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
import { uid } from '../lib/crypto'

const DB_KEY = 'inkhel_db_v5'

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
let storageWarned = false

function notifyStorageFailure(): void {
  if (storageWarned || typeof window === 'undefined') return
  storageWarned = true
  console.error('[inkhel] Failed to persist data to localStorage. Changes will be lost on refresh.')
}

const DEFAULT_ADMIN: AdminUser = {
  id: 'admin_1',
  username: 'admin',
  passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // sha-256 for 'admin'
  sessionToken: null,
  createdAt: new Date().toISOString(),
}

export function createEmptyDb(): DBShape {
  return {
    seasons: [],
    months: [],
    rounds: [],
    questions: [],
    options: [],
    participants: [],
    attempts: [],
    answers: [],
    admins: [DEFAULT_ADMIN],
  }
}

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
    cache = createEmptyDb()
    persist()
  }

  // Ensure default admin exists
  if (!cache.admins || cache.admins.length === 0) {
    cache.admins = [DEFAULT_ADMIN]
  }

  // Sync latest seasons & rounds directly from Cloudflare D1
  try {
    const token = localStorage.getItem('inkhel_admin_token')
    const headers: Record<string, string> = token ? { 'X-Admin-Token': token } : {}

    const [seasonsRes, roundsRes] = await Promise.all([
      fetch('/api/seasons', { headers }),
      fetch('/api/rounds?all=true', { headers }),
    ])

    if (seasonsRes.ok) {
      const remoteSeasons = await seasonsRes.json()
      if (Array.isArray(remoteSeasons)) {
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
        cache.months = allMonths
      }
    }

    if (roundsRes.ok) {
      const remoteRounds = await roundsRes.json()
      if (Array.isArray(remoteRounds)) {
        cache.rounds = remoteRounds
      }
    }

    // Sync questions from D1 for all rounds
    if (cache.rounds && cache.rounds.length > 0) {
      const qPromises = cache.rounds.map(async (r) => {
        try {
          const qRes = await fetch(`/api/questions?roundId=${encodeURIComponent(r.id)}`, { headers })
          if (qRes.ok) {
            const data = await qRes.json()
            return { roundId: r.id, questions: data.questions || [], options: data.options || [] }
          }
        } catch {}
        return null
      })

      const qResults = await Promise.all(qPromises)
      const allQuestions: Question[] = []
      const allOptions: QuestionOption[] = []

      for (const res of qResults) {
        if (res) {
          allQuestions.push(...res.questions)
          allOptions.push(...res.options)
        }
      }

      if (allQuestions.length > 0) {
        cache.questions = allQuestions
        cache.options = allOptions
      }
    }

    persist()
  } catch (err) {
    console.warn('[inkhel] D1 sync deferred/offline:', err)
  }
}

function persist(): void {
  if (!cache) return
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache))
  } catch {
    notifyStorageFailure()
  }
}

export function getDb(): DBShape {
  if (!cache) {
    cache = createEmptyDb()
  }
  return cache
}

export function resetDb(): void {
  localStorage.removeItem(DB_KEY)
  cache = null
}

export function clearCache(): void {
  cache = null
}

export function newId(prefix: string): string {
  return uid(prefix)
}

export function saveDb(): void {
  persist()
}
