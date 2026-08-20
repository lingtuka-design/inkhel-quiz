import { useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowRight, BarChart3, Vote } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BackLink } from '../components/layout'
import { Card, SectionHeading } from '../components/ui'
import { PollCard, PollPreviewCard } from '../components/pollCard'
import { getPoll, listPolls } from '../services/pollService'
import { getParticipant } from '../services/authService'
import { setPageTitle } from '../services/shareService'

export function PollDetailPage() {
  const { pollId } = useParams({ strict: false })
  const participant = getParticipant()

  const { data: poll, isLoading, refetch } = useQuery({
    queryKey: ['poll', pollId, participant?.id],
    queryFn: () => getPoll(pollId!, participant?.id ?? null),
    enabled: !!pollId,
    staleTime: 10000,
  })

  const { data: otherPolls } = useQuery({
    queryKey: ['polls', participant?.id, 'active'],
    queryFn: () => listPolls(participant?.id ?? null, 'active'),
    staleTime: 20000,
  })

  useEffect(() => {
    if (poll) {
      setPageTitle(`Poll — ${poll.question}`)
    }
  }, [poll])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card className="p-12 text-center text-sm text-ink-300">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p>Loading opinion poll...</p>
        </Card>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Poll not found</h1>
        <p className="mt-2 text-sm text-ink-300">This poll might have been removed or does not exist.</p>
        <Link to="/polls" className="mt-6 inline-block">
          <button className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
            View All Polls
          </button>
        </Link>
      </div>
    )
  }

  const related = (otherPolls || []).filter((p) => p.id !== poll.id).slice(0, 2)

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div>
        <BackLink to="/polls" label="All Opinion Polls" />
      </div>

      {/* Main Interactive Poll Card */}
      <PollCard poll={poll} featured={true} onVoted={() => refetch()} />

      {/* Other Live Polls */}
      {related.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-white/5">
          <SectionHeading
            eyebrow="More Voting"
            title="Other Active Polls"
            subtitle="Explore and vote in other active fan discussions."
            action={
              <Link
                to="/polls"
                className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300"
              >
                All polls <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />

          <div className="grid gap-5 sm:grid-cols-2">
            {related.map((p) => (
              <PollPreviewCard key={p.id} poll={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
