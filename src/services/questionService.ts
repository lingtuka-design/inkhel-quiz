import { getDb, saveDb, newId } from '../db/database'
import { nowIso } from '../lib/utils'
import type { Question, QuestionDraft, QuestionOption, QuizQuestion, OptionKey } from '../types'
import { MIN_QUESTIONS_PER_ROUND } from './roundService'

export interface QuestionWithOptions extends Question {
  options: QuestionOption[]
}

export function getQuestionsWithOptions(roundId: string): QuestionWithOptions[] {
  const db = getDb()
  return db.questions
    .filter((q) => q.roundId === roundId)
    .sort((a, b) => a.order - b.order)
    .map((q) => ({
      ...q,
      options: db.options
        .filter((o) => o.questionId === q.id)
        .sort((a, b) => a.optionKey.localeCompare(b.optionKey)),
    }))
}

export function canEditQuestions(roundId: string): { ok: boolean; message: string } {
  const db = getDb()
  const round = db.rounds.find((r) => r.id === roundId)
  if (!round) return { ok: false, message: 'Round not found' }
  return { ok: true, message: '' }
}

export function saveQuestions(roundId: string, drafts: QuestionDraft[]): QuestionWithOptions[] {
  const lock = canEditQuestions(roundId)
  if (!lock.ok) throw new Error(lock.message)

  const cleaned = drafts.filter((d) => d.text.trim() || d.options.some((o) => o.text.trim()))
  for (const d of cleaned) {
    if (!d.text.trim()) throw new Error('Every question must have text')
    if (d.options.some((o) => !o.text.trim())) throw new Error('Every option must have text')
    const filled = d.options.filter((o) => o.text.trim()).length
    if (filled !== 4) throw new Error('Every question must have exactly four options')
  }
  if (cleaned.length < MIN_QUESTIONS_PER_ROUND) {
    throw new Error(
      `A round must contain at least ${MIN_QUESTIONS_PER_ROUND} questions before publishing (currently ${cleaned.length})`,
    )
  }

  const db = getDb()
  const existingQuestions = db.questions.filter((q) => q.roundId === roundId)
  const existingIds = new Set(existingQuestions.map((q) => q.id))
  for (const q of existingQuestions) {
    db.options = db.options.filter((o) => o.questionId !== q.id)
  }
  db.questions = db.questions.filter((q) => !existingIds.has(q.id))

  const created: QuestionWithOptions[] = cleaned.map((draft, index) => {
    const question: Question = {
      id: draft.id ?? newId('q'),
      roundId,
      text: draft.text.trim(),
      order: index + 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    const options: QuestionOption[] = (['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => {
      const src = draft.options.find((o) => o.key === key)
      return {
        id: newId('opt'),
        questionId: question.id,
        optionKey: key,
        text: (src?.text ?? '').trim(),
        isCorrect: key === draft.correctKey,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
    })
    db.questions.push(question)
    db.options.push(...options)
    return { ...question, options }
  })

  saveDb()
  return created
}

export function getQuizQuestions(roundId: string): QuizQuestion[] {
  const db = getDb()
  return db.questions
    .filter((q) => q.roundId === roundId)
    .sort((a, b) => a.order - b.order)
    .map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      options: db.options
        .filter((o) => o.questionId === q.id)
        .sort((a, b) => a.optionKey.localeCompare(b.optionKey))
        .map((o) => ({ key: o.optionKey, text: o.text })),
    }))
}
