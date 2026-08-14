import { useEffect } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ListChecks } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { EpisodeForm } from '../../components/admin/EpisodeForm'
import { Button, Card, toast } from '../../components/ui'
import { createEpisode, getEpisode, updateEpisode } from '../../services/episodeService'
import { listSeasons } from '../../services/seasonService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'

export function EpisodeFormPage() {
  const { episodeId } = useParams({ from: '/admin/episodes/$episodeId' })
  const isNew = episodeId === 'new'
  const navigate = useNavigate()

  useEffect(() => setPageTitle(isNew ? 'New Episode' : 'Edit Episode'), [isNew])

  const { data: episode } = useQuery({
    queryKey: ['episode', episodeId],
    queryFn: () => (isNew ? null : getEpisode(episodeId)),
    enabled: !isNew,
  })

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: listSeasons,
  })

  const handleSave = (input: Parameters<typeof createEpisode>[0]) => {
    if (isNew) {
      const created = createEpisode(input)
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      toast('Episode created', 'success')
      navigate({ to: `/admin/episodes/${created.id}/questions` })
    } else {
      updateEpisode(episodeId, input)
      queryClient.invalidateQueries({ queryKey: ['episodes'] })
      toast('Episode updated', 'success')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackLink to="/admin/episodes" label="Episodes" />
        <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
          {isNew ? 'Create Episode' : 'Edit Episode'}
        </h1>
        <p className="mt-1 text-sm text-ink-300">
          {isNew
            ? 'Set up the basics — questions come next.'
            : 'Update episode details. Content locks once participants start playing.'}
        </p>
      </div>
      <Card className="p-6 sm:p-8">
        <EpisodeForm
          initial={episode}
          seasons={(seasons ?? []).map((s) => ({ id: s.id, name: s.name }))}
          submitLabel={isNew ? 'Create & Add Questions' : 'Save Changes'}
          onSave={handleSave}
        />
      </Card>
      {!isNew && episode && (
        <div className="flex justify-end">
          <Link to={`/admin/episodes/${episode.id}/questions`}>
            <Button variant="secondary" icon={ListChecks}>
              Manage Questions
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
