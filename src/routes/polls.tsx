import { useEffect, useState } from 'react'
import { BarChart3, Filter, Sparkles, Vote } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SectionHeading, Card, EmptyState, Badge } from '../components/ui'
import { PollCard } from '../components/pollCard'
import { listPolls } from '../services/pollService'
import { getParticipant } from '../services/authService'
import { setPageTitle } from '../services/shareService'
import { cn } from '../lib/utils'

export function PollsPage() {
  const participant = getParticipant()
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('active')

  useEffect(() => {
    setPageTitle('Opinion Polls — Inkhel Fan Voting')
  }, [])

  const { data: polls, isLoading, refetch } = useQuery({
    queryKey: ['polls', participant?.id, filter],
    queryFn: () => listPolls(participant?.id ?? null, filter),
    staleTime: 10000,
  })

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/25 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
              <Vote className="h-3.5 w-3.5" />
              Fan Voting Hub
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Opinion Polls
          </h1>
          <p className="mt-1 text-sm text-ink-300">
            Mizo football & sports fans-te ngaihdan lakna. Live percentages & results.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={cn(
              'rounded-lg px-3 py-1.5 font-semibold transition-all',
              filter === 'active'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-ink-300 hover:text-white',
            )}
          >
            Live Polls
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 font-semibold transition-all',
              filter === 'all'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-ink-300 hover:text-white',
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('closed')}
            className={cn(
              'rounded-lg px-3 py-1.5 font-semibold transition-all',
              filter === 'closed'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-ink-300 hover:text-white',
            )}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Polls List */}
      {isLoading ? (
        <Card className="p-12 text-center text-sm text-ink-300">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p>Loading opinion polls...</p>
        </Card>
      ) : !polls || polls.length === 0 ? (
        <EmptyState
          icon={Vote}
          title="Poll a awm rih lo e"
          description={
            filter === 'closed'
              ? 'Closed poll a la awm rih lo.'
              : 'Poll thar a lo awm thuai ang, lo nghak rawh le.'
          }
        />
      ) : (
        <div className="grid gap-6">
          {polls.map((poll, idx) => (
            <PollCard
              key={poll.id}
              poll={poll}
              featured={poll.featured || idx === 0}
              onVoted={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
