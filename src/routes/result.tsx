import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearch } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Gauge,
  Home,
  Link2,
  ListChecks,
  Medal,
  MessageCircle,
  Play,
  Share2,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { CategoryBadge, RoundCard, ShareButtons } from '../components/rounds'
import { AnswerOption } from '../components/quiz'
import { Badge, Button, Card, SectionHeading, Spinner, toast } from '../components/ui'
import { getAttemptReview } from '../services/attemptService'
import { getRound, listAllPlayableRounds, countParticipants, countQuestions } from '../services/roundService'
import { getMonth, listAllMonths } from '../services/monthService'
import { getSeason } from '../services/seasonService'
import { getParticipant } from '../services/authService'
import { copyToClipboard, setPageTitle } from '../services/shareService'
import { generateScoreCardBlob } from '../lib/scoreCardGenerator'
import { formatTime } from '../lib/utils'
import { cn } from '../lib/utils'
import { getDb } from '../db/database'
import type { RoundReviewQuestion } from '../types'

export function ResultPage() {
  const { roundId } = useParams({ strict: false })
  const { attemptId } = useSearch({ strict: false }) as { attemptId?: string }
  const participant = getParticipant()
  const [generatingImage, setGeneratingImage] = useState(false)

  const { data: userAttemptsMap } = useQuery({
    queryKey: ['userAttemptsMap', participant?.id, participant?.email, participant?.googleId],
    queryFn: async () => {
      if (!participant?.id && !participant?.email) return {}
      try {
        const params = new URLSearchParams()
        if (participant?.id) params.set('participantId', participant.id)
        if (participant?.email) params.set('email', participant.email)
        if (participant?.googleId) params.set('googleId', participant.googleId)

        const res = await fetch(`/api/attempts?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          const map: Record<string, any> = {}
          if (Array.isArray(data.attempts)) {
            for (const a of data.attempts) {
              map[a.roundId] = a
            }
          }
          return map
        }
      } catch {}
      return {}
    },
    enabled: !!(participant?.id || participant?.email),
  })

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

  const { data: allRounds } = useQuery({
    queryKey: ['allRounds'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/rounds')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            return data
              .filter((r: any) => r.status !== 'draft')
              .map((r: any) => ({
                round: r,
                participants: r.participantCount || 0,
                questions: r.questionCount || 10,
              }))
          }
        }
      } catch {}
      return listAllPlayableRounds().map((r) => ({
        round: r,
        participants: countParticipants(r.id),
        questions: countQuestions(r.id),
      }))
    },
  })

  const { data: allMonths } = useQuery({
    queryKey: ['allMonths'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/seasons')
        if (res.ok) {
          const data = await res.json()
          const ms: any[] = []
          for (const s of data) {
            if (Array.isArray(s.months)) ms.push(...s.months)
          }
          if (ms.length > 0) return ms
        }
      } catch {}
      return listAllMonths()
    },
  })

  const liveRounds = useMemo(() => {
    return (allRounds ?? []).filter((r) => r.round.status === 'published')
  }, [allRounds])

  const playedRoundIds = useMemo(() => {
    const s = new Set<string>()
    if (userAttemptsMap) {
      for (const k of Object.keys(userAttemptsMap)) s.add(k)
    }
    if (roundId) s.add(roundId)
    return s
  }, [userAttemptsMap, roundId])

  const nextUnplayedRound = useMemo(() => {
    const unplayed = liveRounds.filter((r) => !playedRoundIds.has(r.round.id))
    return unplayed[0] || null
  }, [liveRounds, playedRoundIds])

  const playedCount = playedRoundIds.size
  const totalRoundsCount = Math.max(liveRounds.length, 1)

  const otherRounds = useMemo(() => {
    if (!allRounds) return []
    return [...allRounds]
      .filter((r) => r.round.id !== roundId)
      .sort((a, b) => {
        const aPlayed = playedRoundIds.has(a.round.id) ? 1 : 0
        const bPlayed = playedRoundIds.has(b.round.id) ? 1 : 0
        if (aPlayed !== bPlayed) return aPlayed - bPlayed
        return new Date(b.round.createdAt || 0).getTime() - new Date(a.round.createdAt || 0).getTime()
      })
      .slice(0, 6)
  }, [allRounds, roundId, playedRoundIds])

  useEffect(() => {
    if (round) setPageTitle(`Result — ${round.title}`)
  }, [round])

  const summary = useMemo(() => {
    if (!review) return null
    const answered = review.questions.filter((q: RoundReviewQuestion) => q.answered).length
    const correct = review.questions.filter((q: RoundReviewQuestion) => q.isCorrect).length
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

        {/* WhatsApp Score Card Share Section */}
        <div className="relative mt-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-ink-900/40 to-violet-950/20 p-5 sm:p-6 shadow-xl shadow-black/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-display text-base font-bold text-white">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Share your score on WhatsApp
              </p>
              <p className="mt-1 text-xs text-ink-300">
                Share your official score card image & challenge your friends directly on WhatsApp.
              </p>
            </div>

            <div>
              <Button
                onClick={async () => {
                  try {
                    setGeneratingImage(true)
                    const blob = await generateScoreCardBlob({
                      roundTitle: round.title,
                      monthName: month?.name || 'Quiz Round',
                      seasonName: season?.name || 'Season',
                      playerName: participant?.displayName || 'Player',
                      score: attempt.finalScore,
                      rank: rank || 1,
                      correct: summary!.correct,
                      totalQuestions: questions.length,
                      wrong: summary!.wrong,
                      timeTaken: formatTime(attempt.timeTakenSeconds ?? 0),
                    })

                    const file = new File([blob], `inkhel-${round.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-result.png`, { type: 'image/png' })
                    const shareText = `⚡ Inkhel Quiz — ${round.title}\n🏆 Ka Score: *${attempt.finalScore} Points* (Rank #${rank > 0 ? rank : '—'})\n🎯 Correct: ${summary!.correct}/${questions.length} | ⏱️ Time: ${formatTime(attempt.timeTakenSeconds ?? 0)}\n🔥 Min khum thei in awm em? Han tum teh le!\n👉 https://quiz.inkhel.com/rounds/${round.id}`

                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({
                        files: [file],
                        title: `My score on ${round.title}`,
                        text: shareText,
                      })
                      toast('Score card shared to WhatsApp!', 'success')
                    } else {
                      // Desktop fallback: Download image & open WhatsApp web
                      const shareText = `⚡ Inkhel Quiz — ${round.title}\n🏆 Ka Score: *${attempt.finalScore} Points* (Rank #${rank > 0 ? rank : '—'})\n🎯 Correct: ${summary!.correct}/${questions.length} | ⏱️ Time: ${formatTime(attempt.timeTakenSeconds ?? 0)}\n🔥 Min khum thei in awm em? Han tum teh le!\n👉 https://quiz.inkhel.com/rounds/${round.id}`
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank')
                    }
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      const shareText = `⚡ Inkhel Quiz — ${round.title}\n🏆 Ka Score: *${attempt.finalScore} Points* (Rank #${rank > 0 ? rank : '—'})\n🎯 Correct: ${summary!.correct}/${questions.length} | ⏱️ Time: ${formatTime(attempt.timeTakenSeconds ?? 0)}\n🔥 Min khum thei in awm em? Han tum teh le!\n👉 https://quiz.inkhel.com/rounds/${round.id}`
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank')
                    }
                  } finally {
                    setGeneratingImage(false)
                  }
                }}
                loading={generatingImage}
                className="w-full sm:w-auto bg-[#25D366] text-black hover:bg-[#20bd5a] font-bold text-sm px-6 py-3 border-none shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02]"
                icon={MessageCircle}
              >
                {generatingImage ? 'Generating Score Card…' : 'Share on WhatsApp'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Up Next: Next Challenge Hero Banner (Video Game Flow) */}
      {nextUnplayedRound && (
        <div className="mt-8 animate-fade-up">
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/40 bg-gradient-to-r from-violet-950/90 via-indigo-950/80 to-purple-950/90 p-6 sm:p-8 shadow-2xl shadow-violet-950/60 ring-1 ring-violet-500/30">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-950/50 animate-pulse">
                    <Flame className="h-3.5 w-3.5" /> Next Challenge
                  </span>
                  <CategoryBadge category={nextUnplayedRound.round.category} />
                  <span className="text-xs font-semibold text-violet-300">
                    {playedCount} of {totalRoundsCount} Rounds Completed
                  </span>
                </div>

                <h3 className="font-display text-2xl font-black text-white sm:text-3xl">
                  {nextUnplayedRound.round.title}
                </h3>
                <p className="max-w-xl text-sm text-ink-200 leading-relaxed">
                  {nextUnplayedRound.round.description ||
                    'Khelh loh round i la nei e! Chhang chhunzawm la, Points hlawh belhin Leaderboard-ah i rank ti sang sauh rawh!'}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <div className="h-2.5 w-48 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-violet-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((playedCount / totalRoundsCount) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {Math.round((playedCount / totalRoundsCount) * 100)}% Campaign Done
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <Link to={`/rounds/${nextUnplayedRound.round.id}`}>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto font-black text-base px-8 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-xl shadow-violet-950/80 hover:scale-105 transition-all"
                    icon={Play}
                  >
                    Play Next Round ➔
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {summary!.wrong + summary!.unanswered > 0 && (
        <section className="mt-12">
          <SectionHeading
            eyebrow="Review"
            title="Questions you missed"
            subtitle="Answers are revealed now that the attempt is complete."
          />
          <div className="space-y-5">
            {questions
              .filter((q: RoundReviewQuestion) => !q.isCorrect)
              .map((q: RoundReviewQuestion) => (
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
            All Rounds
          </Button>
        </Link>
      </div>

      {otherRounds.length > 0 && (
        <section className="mt-16 border-t border-white/10 pt-12">
          <SectionHeading
            eyebrow="Keep playing"
            title="More rounds to play"
            subtitle="I la khelh loh leh round thar awmte chhang chhunzawm nghal rawh le."
            action={
              <Link
                to="/rounds"
                className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300"
              >
                All rounds <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {otherRounds.map(({ round: r, participants: pCount, questions: qCount }) => {
              const m = allMonths?.find((x) => x.id === r.monthId)
              return (
                <RoundCard
                  key={r.id}
                  round={r}
                  month={m}
                  participantCount={pCount}
                  questionCount={qCount}
                  userAttempt={userAttemptsMap?.[r.id]}
                />
              )
            })}
          </div>
        </section>
      )}
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
        <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-ink-900/60 shadow-md">
          <img src={question.imageUrl} alt="Question clue" className="aspect-[4/3] max-h-56 w-full object-cover object-center" />
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
