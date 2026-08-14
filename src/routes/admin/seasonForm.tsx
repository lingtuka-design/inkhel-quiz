import { useEffect } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { SeasonForm } from '../../components/admin/SeasonForm'
import { Card, toast } from '../../components/ui'
import { createSeason, getSeason, updateSeason } from '../../services/seasonService'
import { queryClient } from '../../lib/query'
import { setPageTitle } from '../../services/shareService'

export function SeasonFormPage() {
  const { seasonId } = useParams({ strict: false })
  const isNew = window.location.pathname.endsWith('/admin/seasons/new')
  const navigate = useNavigate()

  useEffect(() => setPageTitle(isNew ? 'New Season' : 'Edit Season'), [isNew])

  const { data: season } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: () => (isNew ? null : getSeason(seasonId)),
    enabled: !isNew,
  })

  const handleSave = async (input: Parameters<typeof createSeason>[0]) => {
    try {
      if (isNew) {
        await createSeason(input)
        await queryClient.invalidateQueries({ queryKey: ['seasons'] })
        await queryClient.invalidateQueries({ queryKey: ['months'] })
        toast('Season created — months generated', 'success')
        navigate({ to: '/admin/seasons' })
      } else {
        await updateSeason(seasonId!, input)
        await queryClient.invalidateQueries({ queryKey: ['seasons'] })
        await queryClient.invalidateQueries({ queryKey: ['months'] })
        toast('Season updated', 'success')
        navigate({ to: `/admin/seasons/${seasonId}` })
      }
    } catch (err: any) {
      toast(err.message || 'Failed to save season', 'error')
      throw err
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
            ? 'Name it, set the duration — the monthly periods are generated automatically.'
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
