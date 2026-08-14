import { getDb } from '../db/database'
import { getD1Token, apiGet, apiPost } from './apiClient'
import type { Season } from '../types'

/**
 * One-time bootstrap: when the shared D1 database is empty (fresh deployment),
 * push the local store's seasons, months, rounds and questions into it so every
 * user sees the same content. Runs only while an admin D1 session is active and
 * only when D1 has no seasons yet.
 */
export async function bootstrapD1IfEmpty(): Promise<void> {
  if (!getD1Token()) return
  const existing = await apiGet<unknown[]>('/api/seasons')
  if (!existing || existing.length > 0) return

  const db = getDb()
  let pushedSeasons = 0
  let pushedRounds = 0
  let pushedQuestions = 0

  for (const season of db.seasons) {
    const created = await apiPost<{ success?: boolean; id?: string }>('/api/seasons', {
      action: 'create',
      id: season.id,
      name: season.name,
      description: season.description,
      durationMonths: season.durationMonths,
      startDate: season.startDate.slice(0, 10),
    })
    if (!created?.success) continue
    pushedSeasons++
    await apiPost('/api/seasons', {
      action: 'update',
      id: created.id,
      name: season.name,
      description: season.description,
      status: season.status,
    })

    const months = db.months.filter((m) => m.seasonId === season.id)
    for (const month of months) {
      for (const round of db.rounds.filter((r) => r.monthId === month.id)) {
        const rc = await apiPost<{ success?: boolean; id?: string }>('/api/rounds', {
          action: 'create',
          id: round.id,
          monthId: month.id,
          title: round.title,
          description: round.description,
          bannerGradient: round.bannerGradient,
          bannerIcon: round.bannerIcon,
          bannerUrl: round.bannerUrl,
          timeLimitSeconds: round.timeLimitSeconds,
        })
        if (!rc?.success || !rc.id) continue
        pushedRounds++
        if (round.status === 'published' || round.status === 'archived') {
          await apiPost('/api/rounds', {
            action: 'update',
            id: rc.id,
            status: round.status,
            title: round.title,
            description: round.description,
            timeLimitSeconds: round.timeLimitSeconds,
          })
        }
        const drafts = db.questions
          .filter((q) => q.roundId === round.id)
          .sort((a, b) => a.order - b.order)
          .map((q) => ({
            id: q.id,
            text: q.text,
            imageUrl: null,
            options: db.options
              .filter((o) => o.questionId === q.id)
              .sort((a, b) => a.optionKey.localeCompare(b.optionKey))
              .map((o) => ({ key: o.optionKey, text: o.text })),
            correctKey: db.options.find((o) => o.questionId === q.id && o.isCorrect)?.optionKey ?? 'A',
          }))
        if (drafts.length > 0) {
          const qs = await apiPost<{ success?: boolean }>('/api/questions', {
            roundId: rc.id,
            drafts,
          })
          if (qs?.success) pushedQuestions += drafts.length
        }
      }
    }
  }

  console.info(
    `[inkhel] D1 bootstrapped: ${pushedSeasons} seasons, ${pushedRounds} rounds, ${pushedQuestions} questions`,
  )
}
