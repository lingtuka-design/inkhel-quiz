import { useEffect } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Eye, Rocket, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { QuestionEditor } from '../../components/admin/QuestionEditor'
import { Badge, Button, Card, toast } from '../../components/ui'
import { getEpisode, setEpisodeStatus, validatePublishedContent } from '../../services/episodeService'
import { getQuestionsWithOptions, saveQuestions } from '../../services/questionService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'
import type { QuestionDraft } from '../../types'

export function AdminQuestionsPage() {
  const { episodeId } = useParams({ from: '/admin/episodes/$episodeId/questions' })
  const navigate = useNavigate()

  const { data: episode } = useQuery({
    queryKey: ['episode', episodeId],
    queryFn: () => getEpisode(episodeId),
  })

  const { data: questions } = useQuery({
    queryKey: ['questions', episodeId],
    queryFn: () => getQuestionsWithOptions(episodeId),
    enabled: !!episode,
  })

  useEffect(() => {
    if (episode) setPageTitle(`Questions — ${episode.title}`)
  }, [episode])

  if (!episode) return null

  const initialDrafts: QuestionDraft[] = (questions ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    order: q.order,
    options: q.options.map((o) => ({ key: o.optionKey, text: o.text })),
    correctKey: q.options.find((o) => o.isCorrect)?.optionKey ?? 'A',
  }))

  const handleSave = (drafts: QuestionDraft[]) => {
    saveQuestions(episodeId, drafts)
    queryClient.invalidateQueries({ queryKey: ['questions', episodeId] })
    queryClient.invalidateQueries({ queryKey: ['episodes'] })
  }

  const handlePublish = () => {
    try {
      setEpisodeStatus(episodeId, 'published')
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      toast('Episode published — it is now live for players', 'success')
      navigate({ to: '/admin/episodes' })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Publish failed', 'error')
    }
  }

  const errors = validatePublishedContent(episodeId)
  const validationCount = (questions ?? []).length

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackLink to="/admin/episodes" label="Episodes" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {episode.title}
              <span className="ml-3 align-middle text-sm font-semibold text-ink-300">Questions</span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={episode.status === 'published' ? 'green' : episode.status === 'archived' ? 'amber' : 'slate'}>
                {episode.status === 'published' ? 'Live' : episode.status === 'archived' ? 'Archived' : 'Draft'}
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
            <Link to={`/episodes/${episodeId}/quiz`}>
              <Button variant="secondary" size="sm" icon={Eye}>
                Preview Quiz
              </Button>
            </Link>
            {episode.status !== 'published' && (
              <Button size="sm" icon={Rocket} onClick={handlePublish}>
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      <QuestionEditor episodeId={episodeId} initial={initialDrafts} onSave={handleSave} />

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
