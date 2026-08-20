import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Lock,
  MessageCircle,
  Play,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  Vote,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, toast } from './ui'
import { CategoryBadge } from './rounds'
import { getParticipant, loginWithGoogle } from '../services/authService'
import { votePoll } from '../services/pollService'
import { cn, formatDate } from '../lib/utils'
import type { Poll, PollOption } from '../types'

/* =========================================================================
   1. PollPreviewCard — Matching RoundCard Style for Homepage & Catalog
   ========================================================================= */

interface PollPreviewCardProps {
  poll: Poll
  className?: string
}

export function PollPreviewCard({ poll, className }: PollPreviewCardProps) {
  const hasVoted = poll.hasVoted || !!poll.userVotedOptionId
  const isClosed = poll.status === 'closed'

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        hasVoted
          ? 'border-emerald-500/20 bg-gradient-to-b from-emerald-950/10 to-transparent hover:border-emerald-500/40 hover:-translate-y-1'
          : !isClosed
          ? 'border-violet-500/40 bg-gradient-to-b from-white/[0.04] to-transparent shadow-lg shadow-violet-950/40 hover:-translate-y-1.5 hover:border-violet-400 hover:shadow-2xl hover:shadow-violet-600/25 ring-1 ring-violet-500/20'
          : 'hover:-translate-y-1 hover:border-white/20',
        className,
      )}
    >
      <div className="relative">
        {/* Banner Area */}
        {poll.bannerUrl ? (
          <div className="relative h-40 w-full overflow-hidden bg-slate-950">
            <img
              src={poll.bannerUrl}
              alt={poll.question}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
          </div>
        ) : (
          <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-700">
            <div className="dot-grid absolute inset-0 opacity-40" />
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/25 blur-2xl" />
            <Vote className="relative h-14 w-14 text-white/95 drop-shadow-lg" strokeWidth={1.8} />
          </div>
        )}

        {/* Top-Left Status Badge */}
        <div className="absolute left-3 top-3">
          {hasVoted ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-300 shadow-md backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Vote Thlak Tawh
            </span>
          ) : !isClosed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/50">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE VOTING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/80 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur">
              <Lock className="h-3 w-3" /> Closed
            </span>
          )}
        </div>

        {/* Top-Right Category Badge */}
        <div className="absolute right-3 top-3">
          <CategoryBadge category={poll.category} />
        </div>

        {/* Hover Overlay Button */}
        <Link
          to={`/polls/${poll.id}`}
          className="focus-ring absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
          aria-label={`Vote in ${poll.question}`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-2xl shadow-violet-500/50 transition transform group-hover:scale-110">
            <Vote className="h-6 w-6" />
          </span>
        </Link>
      </div>

      <div className="p-5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-400">
            <Vote className="h-3.5 w-3.5" /> Opinion Poll
          </p>
          {hasVoted && (
            <span className="text-[11px] font-bold text-emerald-400">
              Recorded ✨
            </span>
          )}
        </div>

        <h3 className="font-display text-lg font-bold leading-snug text-white line-clamp-2">
          {poll.question}
        </h3>

        {poll.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-ink-300">{poll.description}</p>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-ink-300">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <strong className="text-white">{poll.totalVotes.toLocaleString()}</strong> players voted
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {poll.options.length} options
          </span>
        </div>

        <div className="mt-5 border-t border-white/5 pt-4">
          <Link to={`/polls/${poll.id}`}>
            <Button
              className="w-full font-bold"
              variant={hasVoted ? 'secondary' : 'primary'}
            >
              {hasVoted ? 'View Live Results' : 'Vote Now'}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

/* =========================================================================
   2. PollCard — Full Interactive Voting & Animated Percentage Card
   ========================================================================= */

interface PollCardProps {
  poll: Poll
  onVoted?: () => void
  featured?: boolean
  className?: string
}

export function PollCard({ poll, onVoted, featured = false, className }: PollCardProps) {
  const queryClient = useQueryClient()
  const participant = getParticipant()
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Local state for instant optimistic UI animation
  const [optimisticPoll, setOptimisticPoll] = useState<Poll | null>(null)

  const activePoll = optimisticPoll || poll
  const hasVoted = activePoll.hasVoted || !!activePoll.userVotedOptionId
  const userChoiceId = activePoll.userVotedOptionId || selectedOptionId
  const isClosed = activePoll.status === 'closed'

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      if (!participant) {
        throw new Error('Please sign in with Google to cast your vote.')
      }
      return await votePoll(activePoll.id, participant.id, optionId)
    },
    onSuccess: (data) => {
      if (data.success && data.options) {
        setOptimisticPoll({
          ...activePoll,
          hasVoted: true,
          userVotedOptionId: data.userVotedOptionId || selectedOptionId,
          totalVotes: data.totalVotes || activePoll.totalVotes + 1,
          options: data.options,
        })
        toast('I vote a tluang e! Live percentage a in-update nghal e.', 'success')
        queryClient.invalidateQueries({ queryKey: ['polls'] })
        queryClient.invalidateQueries({ queryKey: ['poll', activePoll.id] })
        onVoted?.()
      } else {
        toast(data.message || 'Vote thlak a hlawhtling lo tlat mai', 'error')
      }
    },
    onError: (err: any) => {
      toast(err.message || 'Vote submitting failed', 'error')
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const handleOptionClick = async (optionId: string) => {
    if (isSubmitting || voteMutation.isPending) return

    if (!participant) {
      toast('Google account hmanga login a ngai e', 'info')
      await loginWithGoogle()
      return
    }

    setSelectedOptionId(optionId)
    setIsSubmitting(true)
    voteMutation.mutate(optionId)
  }

  const handleShareWhatsApp = () => {
    const text = `🗳️ *Inkhel Opinion Poll:*\n"${activePoll.question}"\n\nVote thlak ve la, mipui ngaihdan live-in en rawh le! 👇\nhttps://quiz.inkhel.com/polls/${activePoll.id}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        featured
          ? 'border-violet-500/30 bg-gradient-to-b from-violet-950/20 via-slate-900/40 to-slate-950/60 shadow-xl shadow-violet-950/20'
          : 'border-white/10 bg-slate-900/40 hover:border-white/20',
        className,
      )}
    >
      {/* Background glowing ambient light for featured poll */}
      {featured && (
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      )}

      {/* Optional Top Banner Image */}
      {activePoll.bannerUrl && (
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-950">
          <img
            src={activePoll.bannerUrl}
            alt={activePoll.question}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-5">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
              <Vote className="h-3.5 w-3.5" />
              Opinion Poll
            </span>
            {featured && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                <Sparkles className="h-3 w-3" />
                Featured
              </span>
            )}
            {isClosed ? (
              <span className="flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                <Lock className="h-3 w-3" /> Closed
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Voting
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-300">
            <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
            <span>{activePoll.totalVotes.toLocaleString()} Votes</span>
          </div>
        </div>

        {/* Question Title */}
        <div>
          <h3 className="font-display text-xl font-bold text-white sm:text-2xl leading-snug">
            {activePoll.question}
          </h3>
          {activePoll.description && (
            <p className="mt-2 text-sm text-ink-300 sm:text-base">
              {activePoll.description}
            </p>
          )}
        </div>

        {/* Options Area */}
        <div className="space-y-3">
          {hasVoted || isClosed ? (
            /* Results View (Animated Progress Bars & Dynamic Sorting) */
            activePoll.options.map((option, idx) => {
              const isUserPick = option.id === userChoiceId
              const isTop = idx === 0 && option.votes > 0

              return (
                <div
                  key={option.id}
                  className={cn(
                    'relative overflow-hidden rounded-xl border p-4 transition-all duration-500',
                    isUserPick
                      ? 'border-violet-500/60 bg-violet-950/20 shadow-md shadow-violet-950/30'
                      : 'border-white/10 bg-white/[0.02]',
                  )}
                >
                  {/* Progress Bar Fill Background */}
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 transition-all duration-1000 ease-out',
                      isTop
                        ? 'bg-gradient-to-r from-violet-600/30 via-fuchsia-600/20 to-violet-500/10'
                        : isUserPick
                        ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10'
                        : 'bg-white/[0.05]',
                    )}
                    style={{ width: `${Math.max(option.percentage, 2)}%` }}
                  />

                  {/* Content on top */}
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Optional Option Picture */}
                      {option.imageUrl ? (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.07] p-1.5 shadow-sm backdrop-blur-sm">
                          <img
                            src={option.imageUrl}
                            alt={option.text}
                            className="max-h-full max-w-full object-contain drop-shadow"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold shrink-0',
                            isTop
                              ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                              : 'border-white/10 bg-white/5 text-ink-300',
                          )}
                        >
                          {idx + 1}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'truncate text-sm sm:text-base font-semibold',
                              isUserPick ? 'text-violet-200' : 'text-white',
                            )}
                          >
                            {option.text}
                          </span>
                          {isUserPick && (
                            <span className="flex items-center gap-1 rounded-full bg-violet-500/30 border border-violet-400/40 px-2 py-0.5 text-[10px] font-bold text-violet-200 shrink-0">
                              <CheckCircle2 className="h-3 w-3 text-violet-300" />
                              I Vote
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-ink-300">
                          {option.votes.toLocaleString()} votes
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display text-lg font-bold text-white sm:text-xl">
                        {option.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            /* Instant 1-Tap Voting Selection View */
            activePoll.options.map((option, idx) => {
              const isCurrentlyVoting = isSubmitting && selectedOptionId === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleOptionClick(option.id)}
                  className={cn(
                    'group/opt w-full text-left flex items-center justify-between gap-3.5 rounded-xl border p-4 transition-all duration-200 focus:outline-none',
                    'border-white/10 bg-white/[0.03] hover:border-violet-500/60 hover:bg-violet-600/10 hover:shadow-lg hover:shadow-violet-950/30 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer',
                    isCurrentlyVoting && 'border-violet-500 bg-violet-600/20 shadow-md',
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Option Picture or Number */}
                    {option.imageUrl ? (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.07] p-1.5 shadow-sm backdrop-blur-sm group-hover/opt:border-violet-500/40">
                        <img
                          src={option.imageUrl}
                          alt={option.text}
                          className="max-h-full max-w-full object-contain drop-shadow transition-transform duration-200 group-hover/opt:scale-105"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-xs font-bold text-ink-300 group-hover/opt:border-violet-500/50 group-hover/opt:bg-violet-500/20 group-hover/opt:text-violet-200 shrink-0 transition-colors">
                        {idx + 1}
                      </div>
                    )}
                    <span className="text-sm sm:text-base font-semibold text-ink-100 group-hover/opt:text-white truncate">
                      {option.text}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {isCurrentlyVoting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                    ) : (
                      <span className="text-xs font-bold text-violet-400 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                        Vote →
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          {hasVoted || isClosed ? (
            <div className="w-full flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs text-ink-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {hasVoted ? 'I vote a tluang thlap tawh e' : 'Voting closed'}
              </span>

              <Button
                variant="secondary"
                size="sm"
                icon={MessageCircle}
                onClick={handleShareWhatsApp}
                className="bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20"
              >
                Share on WhatsApp
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-2 text-xs text-ink-400">
              <span>
                {!participant
                  ? '💡 Vote thlak nan Google account-a login a ngai e.'
                  : '💡 I duh ber option zawn kha click tawp la, a in-vote nghal ang.'}
              </span>
              <span className="font-semibold text-violet-400 shrink-0">1-Tap Vote</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
