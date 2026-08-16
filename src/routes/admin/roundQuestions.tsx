import { useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { CheckCircle2, Eye, Flame, RotateCcw, Rocket, Search, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { QuestionEditor } from '../../components/admin/QuestionEditor'
import { Badge, Button, Card, toast } from '../../components/ui'
import { getDb, saveDb } from '../../db/database'
import { getRound, setRoundStatus, validatePublishedContent } from '../../services/roundService'
import { getQuestionsWithOptions, saveQuestions } from '../../services/questionService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'
import type { QuestionDraft } from '../../types'

export function AdminRoundQuestionsPage() {
  const { roundId } = useParams({ strict: false })
  const [publishing, setPublishing] = useState(false)

  const { data: round, refetch: refetchRound } = useQuery({
    queryKey: ['round', roundId],
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) {
          const rounds = await res.json()
          const found = rounds.find((r: any) => r.id === roundId)
          if (found) return found
        }
      } catch {}
      return getRound(roundId)
    },
    enabled: !!roundId,
  })

  const { data: questions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions', roundId],
    queryFn: async () => {
      const token = localStorage.getItem('inkhel_admin_token')
      const res = await fetch(`/api/questions?roundId=${roundId}`, {
        headers: token ? { 'X-Admin-Token': token } : {},
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const db = getDb()
          db.questions = db.questions.filter((q) => q.roundId !== roundId)
          for (const q of data) {
            db.questions.push({
              id: q.id,
              roundId: q.roundId,
              text: q.text,
              order: q.order,
              imageUrl: q.imageUrl,
              createdAt: q.createdAt || new Date().toISOString(),
              updatedAt: q.updatedAt || new Date().toISOString(),
            })
            db.options = db.options.filter((o) => o.questionId !== q.id)
            for (const opt of q.options || []) {
              db.options.push({
                id: opt.id,
                questionId: q.id,
                optionKey: opt.optionKey,
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            }
          }
          saveDb()
          return data
        }
      }
      return getQuestionsWithOptions(roundId!)
    },
    enabled: !!roundId,
  })

  useEffect(() => {
    if (round) setPageTitle(`Questions — ${round.title}`)
  }, [round])

  if (!round) return null

  const isPublished = round.status === 'published'

  const initialDrafts: QuestionDraft[] = (questions ?? []).map((q: any) => ({
    id: q.id,
    text: q.text,
    order: q.order,
    options: (q.options || []).map((o: any) => ({ key: o.optionKey, text: o.text })),
    correctKey: (q.options || []).find((o: any) => o.isCorrect)?.optionKey ?? 'A',
  }))

  const handleSave = async (drafts: QuestionDraft[]) => {
    try {
      await saveQuestions(roundId, drafts)
      await queryClient.invalidateQueries({ queryKey: ['questions', roundId] })
      await queryClient.invalidateQueries({ queryKey: ['rounds'] })
      await queryClient.invalidateQueries({ queryKey: ['round', roundId] })
      await queryClient.invalidateQueries({ queryKey: ['adminRounds'] })
      await refetchRound()
      toast('Questions saved successfully', 'success')
    } catch (err: any) {
      toast(err.message || 'Failed to save questions', 'error')
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await setRoundStatus(roundId, 'published')
      await queryClient.invalidateQueries({ queryKey: ['round', roundId] })
      await queryClient.invalidateQueries({ queryKey: ['rounds'] })
      await queryClient.invalidateQueries({ queryKey: ['adminRounds'] })
      await refetchRound()
      toast('🎉 Round is now PUBLISHED and live for players!', 'success')
    } catch (err: any) {
      toast(err.message || 'Publish failed', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    setPublishing(true)
    try {
      await setRoundStatus(roundId, 'draft')
      await queryClient.invalidateQueries({ queryKey: ['round', roundId] })
      await queryClient.invalidateQueries({ queryKey: ['rounds'] })
      await queryClient.invalidateQueries({ queryKey: ['adminRounds'] })
      await refetchRound()
      toast('Round moved back to Draft', 'info')
    } catch (err: any) {
      toast(err.message || 'Unpublish failed', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const errors = validatePublishedContent(roundId)
  const validationCount = (questions ?? []).length

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackLink to="/admin/seasons" label="Seasons" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {round.title}
              <span className="ml-3 align-middle text-sm font-semibold text-ink-300">Questions</span>
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {isPublished ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300 shadow-sm shadow-emerald-950/40">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> PUBLISHED (LIVE)
                </span>
              ) : round.status === 'archived' ? (
                <Badge tone="amber">Archived</Badge>
              ) : (
                <Badge tone="amber">Draft (Not Live)</Badge>
              )}

              <Badge tone={validationCount > 0 ? 'violet' : 'slate'}>{validationCount} questions</Badge>

              {!isPublished && (
                errors.length > 0 ? (
                  <Badge tone="amber">
                    <Search className="h-3 w-3" /> Publish blocked: {errors[0]}
                  </Badge>
                ) : (
                  <Badge tone="violet">Ready to publish</Badge>
                )
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/rounds/${roundId}/quiz`}>
              <Button variant="secondary" size="sm" icon={Eye}>
                Preview Round
              </Button>
            </Link>

            {isPublished ? (
              <Button
                size="sm"
                variant="outline"
                icon={RotateCcw}
                loading={publishing}
                onClick={handleUnpublish}
                className="border-white/20 text-ink-300 hover:border-amber-500/40 hover:text-amber-300"
              >
                Unpublish (Draft)
              </Button>
            ) : (
              <Button
                size="sm"
                icon={Rocket}
                loading={publishing}
                onClick={handlePublish}
                disabled={errors.length > 0}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-950/50 hover:from-emerald-500 hover:to-teal-500"
              >
                Publish Round Now 🚀
              </Button>
            )}
          </div>
        </div>
      </div>

      <QuestionEditor roundId={roundId} initial={initialDrafts} onSave={handleSave} />

      {errors.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/10 p-5">
          <p className="mb-2 text-sm font-semibold text-amber-300">Before publishing:</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-200/90">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
