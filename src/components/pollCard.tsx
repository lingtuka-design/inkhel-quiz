import { useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  Lock,
  MessageCircle,
  Share2,
  Sparkles,
  TrendingUp,
  Vote,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, toast } from './ui'
import { getParticipant, loginWithGoogle } from '../services/authService'
import { votePoll } from '../services/pollService'
import { cn } from '../lib/utils'
import type { Poll, PollOption } from '../types'

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

  const handleVoteSubmit = async () => {
    if (!participant) {
      toast('Google account hmanga login a ngai e', 'info')
      await loginWithGoogle()
      return
    }

    if (!selectedOptionId) {
      toast('Option pakhat tal thlang rawh le', 'error')
      return
    }

    setIsSubmitting(true)
    voteMutation.mutate(selectedOptionId)
  }

  const handleShareWhatsApp = () => {
    const text = `🗳️ *Inkhel Opinion Poll:*\n"${activePoll.question}"\n\nVote thlak ve la, mipui ngaihdan live-in en rawh le! 👇\nhttps://quiz.inkhel.com/polls`
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
          <h3 className="font-display text-lg font-bold text-white sm:text-xl leading-snug">
            {activePoll.question}
          </h3>
          {activePoll.description && (
            <p className="mt-1.5 text-xs text-ink-300 sm:text-sm">
              {activePoll.description}
            </p>
          )}
        </div>

        {/* Options Area */}
        <div className="space-y-2.5">
          {hasVoted || isClosed ? (
            /* Results View (Animated Progress Bars & Dynamic Sorting) */
            activePoll.options.map((option, idx) => {
              const isUserPick = option.id === userChoiceId
              const isTop = idx === 0 && option.votes > 0

              return (
                <div
                  key={option.id}
                  className={cn(
                    'relative overflow-hidden rounded-xl border p-3.5 transition-all duration-500',
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
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Optional Option Picture */}
                      {option.imageUrl ? (
                        <img
                          src={option.imageUrl}
                          alt={option.text}
                          className="h-9 w-9 rounded-lg object-cover border border-white/15 shrink-0"
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold shrink-0',
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
                              'truncate text-sm font-semibold',
                              isUserPick ? 'text-violet-200' : 'text-white',
                            )}
                          >
                            {option.text}
                          </span>
                          {isUserPick && (
                            <span className="flex items-center gap-1 rounded-full bg-violet-500/30 border border-violet-400/40 px-1.5 py-0.2 text-[10px] font-bold text-violet-200">
                              <CheckCircle2 className="h-2.5 w-2.5 text-violet-300" />
                              I Vote
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-ink-300">
                          {option.votes.toLocaleString()} votes
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display text-base font-bold text-white sm:text-lg">
                        {option.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            /* Voting Selection View */
            activePoll.options.map((option) => {
              const isSelected = selectedOptionId === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedOptionId(option.id)}
                  className={cn(
                    'w-full text-left flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all duration-200 focus:outline-none',
                    isSelected
                      ? 'border-violet-500 bg-violet-600/15 shadow-md shadow-violet-950/40'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Optional Option Picture */}
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt={option.text}
                        className="h-9 w-9 rounded-lg object-cover border border-white/15 shrink-0"
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border shrink-0 transition-colors',
                          isSelected
                            ? 'border-violet-500 bg-violet-500 text-white'
                            : 'border-white/20 bg-white/5',
                        )}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    )}
                    <span
                      className={cn(
                        'text-sm font-semibold truncate',
                        isSelected ? 'text-white' : 'text-ink-100',
                      )}
                    >
                      {option.text}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="text-xs font-semibold text-violet-400 shrink-0">
                      Selected
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
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
            <div className="w-full flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-ink-300">
                {!participant
                  ? 'Vote thlak nan Google login a ngai e'
                  : 'Option 1 thlang la, Vote hmet rawh le'}
              </span>

              <Button
                size="sm"
                icon={Vote}
                disabled={!selectedOptionId || isSubmitting}
                onClick={handleVoteSubmit}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/25"
              >
                {isSubmitting ? 'Submitting...' : 'Vote Now'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
