import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Eye, Rocket, Search } from 'lucide-react'
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

  const { data: round } = useQuery({
    queryKey: ['round', roundId],
    queryFn: () => getRound(roundId),
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
      toast('Questions saved', 'success')
    } catch (err: any) {
      toast(err.message || 'Failed to save questions', 'error')
    }
  }

  const handlePublish = async () => {
    try {
      await setRoundStatus(roundId, 'published')
      await queryClient.invalidateQueries({ queryKey: ['rounds'] })
      toast('Round published — it is now live for players', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Publish failed', 'error')
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  round.status === 'published' ? 'green' : round.status === 'archived' ? 'amber' : 'slate'
                }
              >
                {round.status === 'published'
                  ? 'Live'
                  : round.status === 'archived'
                    ? 'Archived'
                    : 'Draft'}
              </Badge>
              <Badge tone={validationCount > 0 ? 'violet' : 'slate'}>{validationCount} questions</Badge>
              {errors.length > 0 ? (
                <Badge tone="amber">
                  <Search className="h-3 w-3" /> Publish blocked: {errors[0]}
                </Badge>
              ) : (
                <Badge tone="green">Ready to publish</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/rounds/${roundId}/quiz`}>
              <Button variant="secondary" size="sm" icon={Eye}>
                Preview Round
              </Button>
            </Link>
            {round.status !== 'published' && (
              <Button size="sm" icon={Rocket} onClick={handlePublish}>
                Publish
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
