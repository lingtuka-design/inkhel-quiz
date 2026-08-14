import { getDb, saveDb } from '../db/database'
import { apiGet } from './apiClient'
import type { Month, OptionKey, Question, QuestionOption, Round, Season } from '../types'

/**
 * Mirrors the shared Cloudflare D1 catalog (seasons, months, rounds, questions)
 * into the local store so every existing local read sees the same content that
 * other users see. Falls back silently when offline.
 */

let lastCatalogSync = 0
const lastQuestionsSync = new Map<string, number>()

export function needsCatalogSync(): boolean {
  return Date.now() - lastCatalogSync > 30_000
}

export async function ensureCloudCatalog(): Promise<void> {
  if (!needsCatalogSync()) return
  const db = getDb()

  const seasons = await apiGet<any[]>('/api/seasons')
  if (seasons && seasons.length > 0) {
    for (const s of seasons) upsertSeason(s)
    lastCatalogSync = Date.now()
  }

  const rounds = await apiGet<any[]>('/api/rounds')
  if (rounds && rounds.length > 0) {
    for (const r of rounds) upsertRound(r)
    lastCatalogSync = Date.now()
  }
}

export async function ensureCloudQuestions(roundId: string): Promise<void> {
  const last = lastQuestionsSync.get(roundId) ?? 0
  if (Date.now() - last < 30_000) return
  const questions = await apiGet<any[]>(`/api/questions?roundId=${encodeURIComponent(roundId)}`)
  if (questions && questions.length > 0) {
    upsertQuestions(roundId, questions)
    lastQuestionsSync.set(roundId, Date.now())
  }
}

function upsertSeason(remote: any): void {
  const db = getDb()
  const existing = db.seasons.find((s) => s.id === remote.id)
  const season: Season = {
    id: remote.id,
    name: remote.name ?? '',
    description: remote.description ?? '',
    seasonNumber: remote.seasonNumber ?? 1,
    durationMonths: remote.durationMonths ?? 10,
    startDate: remote.startDate,
    endDate: remote.endDate,
    status: remote.status ?? 'draft',
    createdAt: remote.createdAt ?? new Date().toISOString(),
    updatedAt: remote.updatedAt ?? new Date().toISOString(),
  }
  if (existing) {
    Object.assign(existing, season)
  } else {
    db.seasons.push(season)
  }
  if (Array.isArray(remote.months) && remote.months.length > 0) {
    const monthIds = new Set(remote.months.map((m: any) => m.id))
    db.months = db.months.filter((m) => !(m.seasonId === remote.id && !monthIds.has(m.id)))
    for (const m of remote.months) {
      const month: Month = {
        id: m.id,
        seasonId: remote.id,
        monthNumber: m.monthNumber,
        name: m.name,
        startDate: m.startDate,
        endDate: m.endDate,
        createdAt: m.createdAt ?? new Date().toISOString(),
        updatedAt: m.updatedAt ?? new Date().toISOString(),
      }
      const existingMonth = db.months.find((x) => x.id === m.id)
      if (existingMonth) Object.assign(existingMonth, month)
      else db.months.push(month)
    }
  }
  saveDb()
}

function upsertRound(remote: any): void {
  const db = getDb()
  const existing = db.rounds.find((r) => r.id === remote.id)
  const round: Round = {
    id: remote.id,
    monthId: remote.monthId,
    title: remote.title ?? '',
    slug: remote.slug ?? remote.id,
    description: remote.description ?? '',
    bannerGradient: remote.bannerGradient ?? 'aurora',
    bannerIcon: remote.bannerIcon ?? 'Zap',
    bannerUrl: remote.bannerUrl ?? null,
    timeLimitSeconds: remote.timeLimitSeconds ?? 300,
    status: remote.status ?? 'draft',
    publishedAt: remote.publishedAt ?? null,
    createdAt: remote.createdAt ?? new Date().toISOString(),
    updatedAt: remote.updatedAt ?? new Date().toISOString(),
    questionCount: remote.questionCount ?? remote.question_count ?? undefined,
  }
  if (existing) {
    Object.assign(existing, round)
  } else {
    db.rounds.push(round)
  }
  saveDb()
}

function upsertQuestions(roundId: string, remoteQuestions: any[]): void {
  const db = getDb()
  const localQIds = new Set(db.questions.filter((q) => q.roundId === roundId).map((q) => q.id))
  const remoteQIds = new Set(remoteQuestions.map((q) => q.id))
  db.questions = db.questions.filter(
    (q) => !(q.roundId === roundId && !remoteQIds.has(q.id)),
  )
  db.options = db.options.filter((o) => {
    const q = db.questions.find((x) => x.id === o.questionId)
    return q ? q.roundId !== roundId || remoteQIds.has(o.questionId) : true
  })
  for (const rq of remoteQuestions) {
    const existing = localQIds.has(rq.id)
    const question: Question = {
      id: rq.id,
      roundId,
      text: rq.text ?? '',
      order: rq.order ?? rq.questionOrder ?? 0,
      createdAt: rq.createdAt ?? new Date().toISOString(),
      updatedAt: rq.updatedAt ?? new Date().toISOString(),
    }
    if (existing) {
      const cur = db.questions.find((q) => q.id === rq.id)!
      Object.assign(cur, question)
    } else {
      db.questions.push(question)
    }
    for (const ro of rq.options ?? []) {
      const option: QuestionOption = {
        id: ro.id ?? `opt_${rq.id}_${ro.key}`,
        questionId: rq.id,
        optionKey: (ro.key ?? ro.optionKey ?? 'A') as OptionKey,
        text: ro.text ?? '',
        // The public API never exposes correctness — treat as unknown locally.
        // Cloud scoring stays authoritative; review is fetched from the API.
        isCorrect: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const cur = db.options.find((o) => o.questionId === rq.id && o.optionKey === option.optionKey)
      if (cur) Object.assign(cur, option)
      else db.options.push(option)
    }
  }
  saveDb()
}
