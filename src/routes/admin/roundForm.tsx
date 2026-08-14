import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { ListChecks } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { RoundForm } from '../../components/admin/RoundForm'
import { Button, Card, toast } from '../../components/ui'
import { createRound, getRound, updateRound } from '../../services/roundService'
import { listMonths, isMonthOpen } from '../../services/monthService'
import { listSeasons } from '../../services/seasonService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'

export function RoundFormPage() {
  const { roundId } = useParams({ strict: false })
  const search = useSearch({ strict: false }) as { monthId?: string }
  const isNew = roundId === 'new'
  const navigate = useNavigate()

  useEffect(() => setPageTitle(isNew ? 'New Round' : 'Edit Round'), [isNew])

  const { data: round } = useQuery({
    queryKey: ['round', roundId],
    queryFn: () => (isNew ? null : getRound(roundId)),
    enabled: !isNew,
  })

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: listSeasons,
  })

  const months = (seasons ?? []).flatMap((s) =>
    listMonths(s.id).map((m) => ({
      id: m.id,
      label: `${m.name}`,
      seasonName: `${s.name} (S${s.seasonNumber})`,
      open: isMonthOpen(m),
    })),
  )

  const defaultMonthId = search.monthId ?? round?.monthId ?? months.find((m) => m.open)?.id ?? months[0]?.id ?? ''

  const handleSave = (input: Parameters<typeof createRound>[0]) => {
    if (isNew) {
      const created = createRound(input)
      queryClient.invalidateQueries({ queryKey: ['rounds'] })
      toast('Round created', 'success')
      navigate({ to: `/admin/rounds/${created.id}/questions` })
    } else {
      updateRound(roundId, input)
      queryClient.invalidateQueries({ queryKey: ['rounds'] })
      toast('Round updated', 'success')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackLink to="/admin/seasons" label="Seasons" />
        <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
          {isNew ? 'Create Round' : 'Edit Round'}
        </h1>
        <p className="mt-1 text-sm text-ink-300">
          {isNew
            ? 'Pick the month, set the basics — questions come next.'
            : 'Update round details. Content locks once participants start playing.'}
        </p>
      </div>
      <Card className="p-6 sm:p-8">
        <RoundForm
          initial={round}
          months={months}
          defaultMonthId={defaultMonthId}
          submitLabel={isNew ? 'Create & Add Questions' : 'Save Changes'}
          onSave={handleSave}
        />
      </Card>
      {!isNew && round && (
        <div className="flex justify-end">
          <Link to={`/admin/rounds/${round.id}/questions`}>
            <Button variant="secondary" icon={ListChecks}>
              Manage Questions
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
