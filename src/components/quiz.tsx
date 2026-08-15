import { useEffect, useRef, useState } from 'react'
import { Timer as TimerIcon, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import type { QuizQuestion, OptionKey } from '../types'
import { cn, formatClock } from '../lib/utils'

export function useCountdown(deadline: number, onExpire?: () => void): number {
  const [remaining, setRemaining] = useState(() => deadline - Date.now())
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  useEffect(() => {
    const tick = () => {
      const r = deadline - Date.now()
      setRemaining(r)
      if (r <= 0) expireRef.current?.()
    }
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [deadline])

  return remaining
}

export function QuizTimer({ remainingMs }: { remainingMs: number }) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const danger = seconds <= 10
  const warn = seconds <= 30 && !danger
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border px-4 py-2 font-mono text-2xl font-bold tabular-nums tracking-tight transition-colors sm:text-3xl',
        danger
          ? 'animate-pulse border-red-500/50 bg-red-500/20 text-red-400'
          : warn
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
            : 'border-white/10 bg-white/5 text-white',
      )}
      role="timer"
      aria-label={`Time left: ${formatClock(remainingMs)}`}
    >
      <TimerIcon className={cn('h-5 w-5', danger ? 'text-red-400' : warn ? 'text-amber-300' : 'text-violet-400')} />
      {formatClock(remainingMs)}
    </div>
  )
}

export function QuizProgress({
  current,
  total,
  percent,
}: {
  current: number
  total: number
  percent: number
}) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span className="text-white">
          Question <span className="text-gradient">{current}</span> / {total}
        </span>
        <span className="text-ink-300">{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

type AnswerState = 'idle' | 'correct' | 'wrong' | 'reveal-correct' | 'disabled'

export function AnswerOption({
  letter,
  text,
  state,
  onClick,
  disabled,
  index,
}: {
  letter: OptionKey
  text: string
  state: AnswerState
  onClick?: () => void
  disabled?: boolean
  index: number
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || state !== 'idle'}
      className={cn(
        'focus-ring group relative flex w-full items-center gap-3.5 rounded-2xl border px-4 py-4 text-left transition-all duration-150 sm:py-5',
        state === 'idle' &&
          'border-white/10 bg-white/[0.04] hover:border-violet-400/50 hover:bg-violet-500/10 hover:translate-x-1 active:scale-[0.99]',
        state === 'correct' && 'border-emerald-400/60 bg-emerald-500/15',
        state === 'reveal-correct' && 'border-emerald-400/60 bg-emerald-500/10',
        state === 'wrong' && 'border-red-400/60 bg-red-500/15',
        state === 'disabled' && 'border-white/10 bg-white/[0.02] opacity-60',
      )}
      aria-label={`Option ${letter}: ${text}`}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-display text-sm font-bold transition-colors',
          state === 'idle' && 'border-white/15 bg-white/5 text-ink-200 group-hover:border-violet-400/50 group-hover:text-white',
          state === 'correct' && 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300',
          state === 'reveal-correct' && 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300',
          state === 'wrong' && 'border-red-400/60 bg-red-500/20 text-red-300',
          state === 'disabled' && 'border-white/10 bg-white/5 text-ink-300',
        )}
      >
        {state === 'correct' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : state === 'wrong' ? (
          <XCircle className="h-4 w-4" />
        ) : state === 'reveal-correct' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          String.fromCharCode(65 + index)
        )}
      </span>
      <span className="flex-1 text-sm font-medium text-white sm:text-base">{text}</span>
    </button>
  )
}

export function QuestionCard({
  question,
  index,
  total,
  onSubmit,
  submitting,
}: {
  question: QuizQuestion
  index: number
  total: number
  onSubmit: (key: OptionKey) => void
  submitting: boolean
}) {
  const percent = total > 0 ? ((index + 1) / total) * 100 : 0
  return (
    <div className="animate-fade-up space-y-6">
      <QuizProgress current={index + 1} total={total} percent={percent} />
      {question.imageUrl && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 shadow-xl shadow-black/50">
          <img
            src={question.imageUrl}
            alt="Question clue"
            className="aspect-[4/3] max-h-72 w-full object-cover object-center"
          />
        </div>
      )}
      <h2 className="font-display text-xl font-bold leading-snug text-white sm:text-2xl md:text-3xl">
        {question.text}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => (
          <AnswerOption
            key={opt.key}
            letter={opt.key}
            index={i}
            text={opt.text}
            state={submitting ? 'disabled' : 'idle'}
            onClick={() => onSubmit(opt.key)}
          />
        ))}
      </div>
    </div>
  )
}

export function ReviewIcon({ answered, isCorrect }: { answered: boolean; isCorrect: boolean }) {
  if (!answered) return <MinusCircle className="h-4 w-4 text-slate-400" />
  return isCorrect ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  ) : (
    <XCircle className="h-4 w-4 text-red-400" />
  )
}
