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

const DB_KEY = 'inkhel_db_v3'

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
  if (cache) return
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      cache = JSON.parse(raw) as DBShape
      return
    }
  } catch {
    cache = null
  }
  cache = await buildSeed()
  persist()
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
