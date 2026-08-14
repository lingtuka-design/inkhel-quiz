import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { EpisodeCard } from '../components/episodes'
import { EmptyState, Input, Select, SectionHeading } from '../components/ui'
import { listEpisodes, countParticipants } from '../services/episodeService'
import { listSeasons, getSeason } from '../services/seasonService'
import { setPageTitle } from '../services/shareService'
import { useEffect } from 'react'

type Filter = 'all' | 'live' | 'archived'

export function EpisodesPage() {
  useEffect(() => setPageTitle('Episodes'), [])
  const [filter, setFilter] = useState<Filter>('all')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: episodes } = useQuery({
    queryKey: ['episodes'],
    queryFn: () =>
      listEpisodes()
        .filter((e) => e.status !== 'draft')
        .map((e) => ({ episode: e, participants: countParticipants(e.id) })),
  })

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: listSeasons,
  })

  const filtered = useMemo(() => {
    if (!episodes) return []
    return episodes.filter(({ episode }) => {
      if (filter === 'live' && episode.status !== 'published') return false
      if (filter === 'archived' && episode.status !== 'archived') return false
      if (seasonFilter !== 'all' && episode.seasonId !== seasonFilter) return false
      if (search && !episode.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [episodes, filter, seasonFilter, search])

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Quiz archive"
        title="Episodes"
        subtitle="Every live and archived episode of the season. Drafts stay private."
      />

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <Input
            className="pl-10"
            placeholder="Search episodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="sm:w-40">
          <option value="all" className="bg-ink-800">All</option>
          <option value="live" className="bg-ink-800">Live</option>
          <option value="archived" className="bg-ink-800">Archived</option>
        </Select>
        <Select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} className="sm:w-44">
          <option value="all" className="bg-ink-800">All seasons</option>
          {seasons?.map((s) => (
            <option key={s.id} value={s.id} className="bg-ink-800">
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No episodes found"
          description="Try a different filter or check back soon — new episodes drop regularly."
          action={
            <Link to="/episodes" className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300">
              Reset filters
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ episode, participants }) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              season={getSeason(episode.seasonId) ?? undefined}
              participantCount={participants}
            />
          ))}
        </div>
      )}
    </div>
  )
}
