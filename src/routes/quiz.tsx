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
import {
  getAttempt,
  resumeAttempt,
  startAttempt,
  submitAnswer,
  finalizeAttemptCloud,
} from '../services/attemptService'
import { ensureCloudCatalog, ensureCloudQuestions } from '../services/cloudCatalog'
import { queryClient } from '../lib/query'
import type { Attempt, OptionKey, QuizQuestion } from '../types'

type Phase = 'boot' | 'instructions' | 'playing' | 'done'

export function QuizPage() {
  const { roundId } = useParams({ strict: false })
  const navigate = useNavigate()

  const { data: round } = useQuery({
    queryKey: ['round', roundId],
    queryFn: async () => {
      await ensureCloudCatalog()
      return getRound(roundId)
    },
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
    async (attemptId: string, cloudFinalize = false) => {
      if (!attemptId) return
      try {
        if (cloudFinalize) await finalizeAttemptCloud(attemptId)
        else {
          const final = getAttempt(attemptId)
          if (!final) return
        }
      } catch {
        // ignore — result still shows the mirrored attempt
      }
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
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
    if (!participant) {
      setNamePromptOpen(true)
      setPhase('instructions')
      return
    }
    void (async () => {
      const resume = resumeAttempt(participant.id, roundId)
      if (!resume) {
        setPhase('instructions')
        return
      }
      await ensureCloudQuestions(roundId)
      if (resume.status === 'active') {
        const qs = getQuizQuestions(roundId)
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
        void handleFinalize(resume.attempt.id, true)
      }
    })()
  }, [round, roundId, phase, handleFinalize])

  const start = async () => {
    const participant = getParticipant()
    if (!participant) {
      setNamePromptOpen(true)
      return
    }
    setError(null)
    try {
      await ensureCloudQuestions(roundId)
      const qs = getQuizQuestions(roundId)
      if (qs.length === 0) {
        setError('This round has no questions yet')
        return
      }
      const att = await startAttempt(participant.id, roundId)
      setAttempt(att)
      setQuestions(qs)
      setIndex(0)
      setDeadline(new Date(att.startedAt).getTime() + (round?.timeLimitSeconds ?? 0) * 1000)
      setPhase('playing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the round')
    }
  }

  const submit = async (key: OptionKey) => {
    if (!attempt || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitAnswer(attempt.id, questions[index]!.id, key)
      if (result.finished) {
        void handleFinalize(result.attempt.id)
      } else {
        setIndex(result.answeredCount)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit answer'
      if (msg === 'ATTEMPT_FINISHED') {
        toast('Time expired — your attempt was auto-submitted', 'info')
        void handleFinalize(attempt.id, true)
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
      void handleFinalize(id, true)
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
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
          <Card className="animate-fade-up overflow-hidden">
            <RoundBanner round={round} className="h-40 sm:h-52" iconSize="h-16 w-16" />
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
  const [name, setName] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGuest = async () => {
    setError(null)
    try {
      setGuestLoading(true)
      const p = await saveParticipant(name)
      onSubmit(p.displayName)
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enter a name')
    } finally {
      setGuestLoading(false)
    }
  }

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
    <Modal open={open} onClose={onClose} title="Sign in to Play">
      <div className="space-y-4">
        <p className="text-sm text-ink-300">
          Sign in with your Google account to record your official score, claim your spot on the leaderboard, and preserve your ranking.
        </p>

        <Button
          onClick={handleGoogle}
          loading={googleLoading}
          variant="outline"
          className="w-full gap-2.5 border-white/20 bg-white/5 py-3 hover:bg-white/10"
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </Button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-ink-850 px-3 text-xs uppercase tracking-wider text-ink-300">
            or play as guest
          </span>
        </div>

        <div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter player nickname"
            maxLength={40}
            onKeyDown={(e) => e.key === 'Enter' && handleGuest()}
          />
        </div>

        <ErrorNote message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button onClick={handleGuest} loading={guestLoading} disabled={!name.trim()}>
            Play as Guest
          </Button>
        </div>
      </div>
    </Modal>
  )
}
