import { useEffect, useMemo } from 'react'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  Home,
  ListChecks,
  Medal,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ShareButtons } from '../components/rounds'
import { AnswerOption } from '../components/quiz'
import { Badge, Button, Card, SectionHeading, Spinner } from '../components/ui'
import { getAttemptReview } from '../services/attemptService'
import { getRound } from '../services/roundService'
import { getMonth } from '../services/monthService'
import { getSeason } from '../services/seasonService'
import { getParticipant } from '../services/authService'
import { setPageTitle } from '../services/shareService'
import { formatTime } from '../lib/utils'
import { cn } from '../lib/utils'
import type { RoundReviewQuestion } from '../types'

export function ResultPage() {
  const { roundId } = useParams({ strict: false })
  const { attemptId } = useSearch({ strict: false }) as { attemptId?: string }
  const participant = getParticipant()

  const { data: review } = useQuery({
    queryKey: ['attemptReview', attemptId],
    queryFn: () => {
      if (!participant || !attemptId) return null
      return getAttemptReview(attemptId, participant.id)
    },
    enabled: !!participant && !!attemptId,
  })

  const { data: round } = useQuery({
    queryKey: ['round', roundId],
    queryFn: () => getRound(roundId),
    enabled: !!review,
  })

  const { data: month } = useQuery({
    queryKey: ['month', round?.monthId],
    queryFn: () => (round ? getMonth(round.monthId) : null),
    enabled: !!round,
  })

  const { data: season } = useQuery({
    queryKey: ['season', month?.seasonId],
    queryFn: () => (month ? getSeason(month.seasonId) : null),
    enabled: !!month,
  })

  useEffect(() => {
    if (round) setPageTitle(`Result — ${round.title}`)
  }, [round])

  const summary = useMemo(() => {
    if (!review) return null
    const answered = review.questions.filter((q) => q.answered).length
    const correct = review.questions.filter((q) => q.isCorrect).length
    const wrong = answered - correct
    const unanswered = review.questions.length - answered
    return { answered, correct, wrong, unanswered }
  }, [review])

  if (!attemptId) {
    return (
      <div className="mx-auto max-w-md px-4 py-32 text-center sm:px-6">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-4 font-display text-xl font-bold text-white">No result to show</h1>
        <p className="mt-2 text-sm text-ink-300">Complete a round to see your results here.</p>
        <Link to="/rounds" className="mt-6 inline-block">
          <Button variant="secondary">Browse rounds</Button>
        </Link>
      </div>
    )
  }

  if (!review || !round) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-32 text-center sm:px-6">
        <Spinner />
        <p className="mt-4 text-sm text-ink-300">Loading results…</p>
        <Link to="/rounds" className="mt-6 inline-block text-violet-400 hover:text-violet-300">
          Browse rounds
        </Link>
      </div>
    )
  }

  const { attempt, questions, rank } = review
  const isTop3 = rank > 0 && rank <= 3
  const scorePercent = Math.round((attempt.finalScore / (questions.length * 10 + 20)) * 100)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="animate-fade-up text-center">
        <Badge tone="violet" className="mb-4 px-4 py-1.5">
          {round.title} · {month?.name} · {season?.name}
        </Badge>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Round <span className="text-gradient">Complete</span>
        </h1>
        <p className="mt-2 text-sm text-ink-300">
          {attempt.status === 'expired'
            ? 'Time expired — your attempt was auto-submitted.'
            : 'All questions answered. Nice pace.'}
        </p>
      </div>

      <Card className="animate-fade-up [animation-delay:100ms] relative mt-8 overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <div className="flex items-center gap-6">
            <div
              className={cn(
                'flex h-28 w-28 flex-col items-center justify-center rounded-3xl border sm:h-32 sm:w-32',
                isTop3
                  ? 'border-yellow-400/40 bg-gradient-to-br from-yellow-400/15 to-amber-600/10'
                  : 'border-white/10 bg-white/[0.04]',
              )}
            >
              <span className="font-display text-5xl font-bold text-white sm:text-6xl">
                {attempt.finalScore}
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-ink-300">
                points
              </span>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-widest text-ink-300">Your rank</p>
              </div>
              <p className="mt-1 font-display text-5xl font-bold text-gradient">
                {rank > 0 ? `#${rank}` : '—'}
              </p>
              <p className="mt-1 text-sm text-ink-300">
                {isTop3 ? 'On the podium! Incredible.' : rank > 0 ? 'On the round leaderboard.' : 'Rank pending.'}
              </p>
            </div>
          </div>

          <div className="w-full max-w-xs">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-ink-300">Score efficiency</span>
              <span className="font-semibold text-white">{scorePercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                style={{ width: `${Math.min(100, scorePercent)}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: CheckCircle2, label: 'Correct', value: summary!.correct, cls: 'text-emerald-400' },
                { icon: XCircle, label: 'Wrong', value: summary!.wrong, cls: 'text-red-400' },
                { icon: AlertTriangle, label: 'Skipped', value: summary!.unanswered, cls: 'text-amber-400' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3">
                  <s.icon className={cn('mx-auto h-4 w-4', s.cls)} />
                  <p className="mt-1 font-display text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-ink-300">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-8 grid gap-3 border-t border-white/5 pt-6 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <ListChecks className="h-5 w-5 text-violet-400" />
            <div>
              <p className="text-xs text-ink-300">Correct answers</p>
              <p className="font-semibold text-white">{attempt.baseScore} pts</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <Gauge className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-ink-300">Speed bonus</p>
              <p className="font-semibold text-white">+{attempt.speedBonus} pts</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <Clock className="h-5 w-5 text-sky-400" />
            <div>
              <p className="text-xs text-ink-300">Time taken</p>
              <p className="font-semibold text-white">{formatTime(attempt.timeTakenSeconds ?? 0)}</p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-3 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-300">
            {summary!.correct} × 10 = {attempt.baseScore} + speed bonus +{attempt.speedBonus} ={' '}
            <span className="font-bold text-white">{attempt.finalScore} total</span>
          </p>
          <ShareButtons round={round} />
        </div>
      </Card>

      {summary!.wrong + summary!.unanswered > 0 && (
        <section className="mt-12">
          <SectionHeading
            eyebrow="Review"
            title="Questions you missed"
            subtitle="Answers are revealed now that the attempt is complete."
          />
          <div className="space-y-5">
            {questions
              .filter((q) => !q.isCorrect)
              .map((q) => (
                <ReviewCard key={q.id} question={q} />
              ))}
          </div>
        </section>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <Link to={`/rounds/${round.id}`}>
          <Button icon={Trophy}>Round Leaderboard</Button>
        </Link>
        <Link to="/leaderboard">
          <Button variant="outline" icon={Medal}>
            Monthly & Season Ranking
          </Button>
        </Link>
        <Link to="/rounds">
          <Button variant="ghost" icon={Home}>
            More Rounds
          </Button>
        </Link>
      </div>
    </div>
  )
}

function ReviewCard({ question }: { question: RoundReviewQuestion }) {
  return (
    <Card className="animate-fade-up p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-white">
          {question.order}. {question.text}
        </h3>
        {question.answered ? (
          <Badge tone="red">
            <XCircle className="h-3.5 w-3.5" /> Incorrect
          </Badge>
        ) : (
          <Badge tone="amber">
            <AlertTriangle className="h-3.5 w-3.5" /> Not answered
          </Badge>
        )}
      </div>
      {question.imageUrl && (
        <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          <img src={question.imageUrl} alt="Question clue" className="max-h-52 w-full object-contain p-2" />
        </div>
      )}
      <div className="grid gap-2.5">
        {question.options.map((opt, i) => {
          const isSelected = question.selectedKey === opt.key
          const state = opt.isCorrect
            ? 'reveal-correct'
            : isSelected
              ? 'wrong'
              : 'disabled'
          return (
            <AnswerOption
              key={opt.key}
              letter={opt.key}
              index={i}
              text={opt.text}
              state={state}
            />
          )
        })}
      </div>
      {!question.answered && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-300">
          <Clock className="h-3.5 w-3.5" /> Time ran out before you could answer.
        </p>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-300">
        <ArrowRight className="h-3.5 w-3.5" /> Correct answer:{' '}
        <span className="font-semibold">{question.options.find((o) => o.isCorrect)?.text}</span>
      </div>
    </Card>
  )
}
