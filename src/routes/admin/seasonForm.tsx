import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { SeasonForm } from '../../components/admin/SeasonForm'
import { Card } from '../../components/ui'
import { createSeason, getSeason, updateSeason } from '../../services/seasonService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'
import { toast } from '../../components/ui'

export function SeasonFormPage() {
  const { seasonId } = useParams({ from: '/admin/seasons/$seasonId' })
  const isNew = seasonId === 'new'
  const navigate = useNavigate()

  useEffect(() => setPageTitle(isNew ? 'New Season' : 'Edit Season'), [isNew])

  const { data: season } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => (isNew ? null : getSeason(seasonId)),
    enabled: !isNew,
  })

  const handleSave = (input: Parameters<typeof createSeason>[0]) => {
    if (isNew) {
      const created = createSeason(input)
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      toast('Season created', 'success')
      navigate({ to: '/admin/seasons' })
      void created
    } else {
      updateSeason(seasonId, input)
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      toast('Season updated', 'success')
      navigate({ to: '/admin/seasons' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <BackLink to="/admin/seasons" label="Seasons" />
        <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
          {isNew ? 'Create Season' : 'Edit Season'}
        </h1>
        <p className="mt-1 text-sm text-ink-300">
          {isNew
            ? 'Name it, set the duration, and define the championship window.'
            : 'Update the details of this season.'}
        </p>
      </div>
      <Card className="p-6 sm:p-8">
        <SeasonForm
          initial={season}
          submitLabel={isNew ? 'Create Season' : 'Save Changes'}
          onSave={handleSave}
        />
      </Card>
    </div>
  )
}
