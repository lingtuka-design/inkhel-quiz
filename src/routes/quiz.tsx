import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { AlertTriangle, ListChecks, Play, ShieldAlert, Timer as TimerIcon, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RoundBanner } from '../components/rounds'
import { QuestionCard, QuizTimer, useCountdown } from '../components/quiz'
import { Button, Card, ErrorNote, Input, Modal, toast } from '../components/ui'
import { getRound } from '../services/roundService'
import { getQuizQuestions } from '../services/questionService'
import { getParticipant, saveParticipant, loginWithGoogle } from '../services/authService'
import { GoogleIcon } from '../components/layout'
import { getDb, saveDb, newId } from '../db/database'
import { nowIso } from '../lib/utils'
import {
  getAttempt,
  resumeAttempt,
  startAttempt,
  submitAnswer,
  finalizeAttempt,
} from '../services/attemptService'
import { queryClient } from '../lib/query'
import type { Attempt, OptionKey, QuizQuestion } from '../types'

type Phase = 'boot' | 'instructions' | 'playing' | 'done'

function shuffleList<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function randomizeQuestionsForAttempt(rawQuestions: QuizQuestion[]): QuizQuestion[] {
  return shuffleList(rawQuestions).map((q, idx) => ({
    ...q,
    order: idx + 1,
    options: shuffleList(q.options),
  }))
}

export function QuizPage() {
  const { roundId } = useParams({ strict: false })
  const navigate = useNavigate()

  const { data: round } = useQuery({
    queryKey: ['round', roundId],
    queryFn: () => getRound(roundId),
  })

  const [phase, setPhase] = useState<Phase>('boot')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [deadline, setDeadline] = useState(0)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [namePromptOpen, setNamePromptOpen] = useState(false)
  const attemptIdRef = useRef<string | null>(null)

  useEffect(() => {
    attemptIdRef.current = attempt?.id ?? null
  }, [attempt])

  useEffect(() => {
    document.title = round ? `${round.title} — Inkhel` : 'Quiz — Inkhel'
  }, [round])

  const goToResult = useCallback(
    (attemptId: string) => {
      navigate({ to: `/rounds/${roundId}/result?attemptId=${attemptId}` })
    },
    [navigate, roundId],
  )

  const handleFinalize = useCallback(
    async (attemptId: string) => {
      if (!attemptId) return
      try {
        await finalizeAttempt(attemptId)
      } catch {}
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      await queryClient.invalidateQueries({ queryKey: ['played'] })
      goToResult(attemptId)
    },
    [goToResult],
  )

  // Boot: check for a resumable attempt
  useEffect(() => {
    if (!round || phase !== 'boot') return
    const participant = getParticipant()
    if (round.status !== 'published') {
      setError('This round is not open for play')
      setPhase('done')
      return
    }
    if (!participant || participant.provider !== 'google') {
      setNamePromptOpen(true)
      setPhase('instructions')
      return
    }
    if (participant && participant.provider === 'google') {
      const db = getDb()
      const existing = db.attempts.find(
        (a) => a.participantId === participant.id && a.roundId === roundId && (a.status === 'completed' || a.status === 'expired'),
      )
      if (existing) {
        goToResult(existing.id)
        return
      }
    }
    const resume = resumeAttempt(participant.id, roundId)
    if (!resume) {
      setPhase('instructions')
      return
    }
    if (resume.status === 'active') {
      let qs: QuizQuestion[] = []
      try {
        const cached = sessionStorage.getItem(`quiz_qs_${resume.attempt.id}`)
        if (cached) qs = JSON.parse(cached)
      } catch {}

      if (qs.length === 0) {
        const baseQs = getQuizQuestions(roundId)
        qs = randomizeQuestionsForAttempt(baseQs)
        try {
          sessionStorage.setItem(`quiz_qs_${resume.attempt.id}`, JSON.stringify(qs))
        } catch {}
      }

      if (qs.length === 0) {
        setError('This round has no questions yet')
        setPhase('done')
        return
      }
      setAttempt(resume.attempt)
      setQuestions(qs)
      setIndex(resume.answeredCount)
      setDeadline(resume.deadline)
      setPhase('playing')
    } else {
      toast('Your previous attempt was auto-submitted when time ran out', 'info')
      handleFinalize(resume.attempt.id)
    }
  }, [round, roundId, phase, handleFinalize])

  const start = async () => {
    const participant = getParticipant()
    if (!participant || participant.provider !== 'google') {
      setNamePromptOpen(true)
      return
    }
    setError(null)
    try {
      let qs: QuizQuestion[] = []
      const res = await fetch(`/api/questions?roundId=${roundId}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          qs = data.map((q: any) => ({
            id: q.id,
            text: q.text,
            order: q.order,
            imageUrl: q.imageUrl || null,
            options: (q.options || []).map((o: any) => ({ key: o.optionKey, text: o.text })),
          }))

          // Sync to local cache
          const db = getDb()
          db.questions = db.questions.filter((q) => q.roundId !== roundId)
          for (const q of data) {
            db.questions.push({
              id: q.id,
              roundId,
              text: q.text,
              order: q.order,
              imageUrl: q.imageUrl || null,
              createdAt: q.createdAt || nowIso(),
              updatedAt: q.updatedAt || nowIso(),
            })
            if (Array.isArray(q.options)) {
              db.options = db.options.filter((o) => o.questionId !== q.id)
              for (const opt of q.options) {
                db.options.push({
                  id: opt.id || newId('opt'),
                  questionId: q.id,
                  optionKey: opt.optionKey,
                  text: opt.text,
                  isCorrect: Boolean(opt.isCorrect),
                  createdAt: nowIso(),
                  updatedAt: nowIso(),
                })
              }
            }
          }
          saveDb()
        }
      }

      if (qs.length === 0) {
        qs = getQuizQuestions(roundId)
      }

      if (qs.length === 0) {
        setError('This round has no questions yet')
        return
      }

      const att = await startAttempt(participant.id, roundId)
      if (att.status === 'completed' || att.status === 'expired') {
        goToResult(att.id)
        return
      }

      // Randomize question sequence and option order for this unique attempt
      const randomized = randomizeQuestionsForAttempt(qs)
      try {
        sessionStorage.setItem(`quiz_qs_${att.id}`, JSON.stringify(randomized))
      } catch {}

      setAttempt(att)
      setQuestions(randomized)
      setIndex(0)
      setDeadline(new Date(att.startedAt).getTime() + (round?.timeLimitSeconds ?? 0) * 1000)
      setPhase('playing')
    } catch (err: any) {
      setError(err.message || 'Failed to start quiz')
    }
  }

  const submit = async (key: OptionKey) => {
    if (!attempt || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitAnswer(attempt.id, questions[index]!.id, key)
      if (result.finished) {
        await handleFinalize(result.attempt.id)
      } else {
        setIndex(result.answeredCount)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit answer'
      if (msg === 'ATTEMPT_FINISHED') {
        toast('Time expired — your attempt was auto-submitted', 'info')
        await handleFinalize(attempt.id)
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const remaining = useCountdown(deadline, () => {
    const id = attemptIdRef.current
    if (id) {
      toast('Time is up — auto-submitting your attempt', 'info')
      handleFinalize(id)
    }
  })

  if (!round) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-white">Round not found</h1>
        <Link to="/rounds" className="mt-4 inline-block text-violet-400 hover:text-violet-300">
          Browse all rounds
        </Link>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <ErrorNote message={error} />
        <Link to={`/rounds/${round.id}`} className="mt-6 inline-block">
          <Button variant="secondary">Back to round</Button>
        </Link>
      </div>
    )
  }

  if (phase === 'instructions') {
    const minutes = Math.round(round.timeLimitSeconds / 60)
    return (
      <>
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="pointer-events-none absolute -top-10 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-violet-600/25 blur-3xl" />
          <Card className="animate-fade-up relative overflow-hidden border-white/15 shadow-2xl">
            <RoundBanner round={round} className="aspect-[16/9] sm:aspect-[21/9] max-h-56 w-full" iconSize="h-16 w-16" />
            <div className="space-y-6 p-6 sm:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
                  {round.title}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                  Ready to play?
                </h1>
                <p className="mt-2 text-sm text-ink-300">
                  {questions.length || '10'} questions · {minutes} minute{minutes === 1 ? '' : 's'} on
                  the clock.
                </p>
              </div>

              <ul className="space-y-3 text-sm text-ink-200">
                <li className="flex items-start gap-3">
                  <TimerIcon className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
                  <span>
                    The timer starts the moment you press Start and{' '}
                    <strong className="text-white">cannot be paused</strong> — refreshing the page
                    won't reset it.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
                  <span>
                    Answers lock in the moment you tap — you move straight to the next question. No
                    going back.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
                  <span>
                    Unanswered questions count as incorrect when time runs out, and the attempt is
                    submitted automatically.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <span className="text-amber-300">
                    Fair play enforced server-side: every score and timestamp is validated on the
                    server.
                  </span>
                </li>
              </ul>

              {error && <ErrorNote message={error} />}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" icon={Play} onClick={start}>
                  Start Round
                </Button>
                <Link to={`/rounds/${round.id}`}>
                  <Button size="lg" variant="ghost">
                    Back to round
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
        <PlayerNameModal
          open={namePromptOpen}
          onClose={() => setNamePromptOpen(false)}
          onSubmit={() => setNamePromptOpen(false)}
        />
      </>
    )
  }

  if (phase === 'playing') {
    const question = questions[index]
    if (!question || !attempt) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-white">Loading quiz…</h1>
        </div>
      )
    }
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ink-300">
            <span className="hidden sm:inline">{round.title} · </span>
            {index + 1} of {questions.length}
          </p>
          <QuizTimer remainingMs={remaining} />
        </div>
        <QuestionCard
          question={question}
          index={index}
          total={questions.length}
          onSubmit={submit}
          submitting={submitting}
        />
        {error && (
          <div className="mt-4">
            <ErrorNote message={error} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-32 sm:px-6">
      <div className="animate-pulse text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-violet-400" />
        <p className="mt-3 text-sm text-ink-300">Loading your attempt…</p>
      </div>
    </div>
  )
}

export function PlayerNameModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (name: string) => void
}) {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogle = async () => {
    setError(null)
    try {
      setGoogleLoading(true)
      const p = await loginWithGoogle()
      onSubmit(p.displayName)
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Sign in with Google to Play">
      <div className="space-y-5 py-2">
        <p className="text-sm leading-relaxed text-ink-300">
          Quiz khelh nan leh official season leaderboard-a i hming leh score vawnthat a nih theih nan <strong>Google Account</strong> hmanga luh phawt a ngai e.
        </p>

        <Button
          onClick={handleGoogle}
          loading={googleLoading}
          variant="outline"
          className="w-full gap-3 border-white/20 bg-white/5 py-4 text-base font-semibold text-white hover:bg-white/10 hover:border-white/40 shadow-lg shadow-black/40"
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </Button>

        <ErrorNote message={error} />

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}
