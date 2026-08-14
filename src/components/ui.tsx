import React, { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react'
import { cn } from '../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:brightness-110 active:scale-[0.98]',
  secondary: 'glass text-ink-100 hover:bg-white/10 active:scale-[0.98]',
  ghost: 'text-ink-200 hover:bg-white/5 hover:text-white active:scale-[0.98]',
  danger:
    'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 active:scale-[0.98]',
  outline:
    'border border-white/15 text-ink-100 hover:border-white/30 hover:bg-white/5 active:scale-[0.98]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-xl',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: LucideIcon
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'focus-ring inline-flex items-center justify-center font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none select-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass rounded-2xl', className)} {...rest}>
      {children}
    </div>
  )
}

const BADGE_TONES = {
  slate: 'bg-white/5 text-ink-200 border-white/10',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  gold: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
}

export type BadgeTone = keyof typeof BADGE_TONES

export function Badge({
  tone = 'slate',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-violet-400', className)} />
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-200">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-300">{hint}</span>}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-red-400">
          <XCircle className="h-3.5 w-3.5" /> {error}
        </span>
      )}
    </label>
  )
}

const INPUT_CLASSES =
  'w-full h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-ink-300/50 transition-colors hover:border-white/20 focus:border-violet-400/60 focus:bg-white/[0.06] focus-visible:outline-none'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(INPUT_CLASSES, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        INPUT_CLASSES,
        'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 fill=%27%23a6a6cd%27 viewBox=%270 0 16 16%27%3E%3Cpath d=%27M8 11 3 6h10z%27/%3E%3C/svg%3E")] bg-no-repeat bg-[right_1rem_center] pr-10',
        props.className,
      )}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={cn(INPUT_CLASSES, 'h-auto min-h-24 py-3 resize-y', props.className)} />
  )
}

export function Avatar({
  name,
  gradient,
  photoUrl,
  size = 'md',
  className,
}: {
  name: string
  gradient?: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const [imgError, setImgError] = useState(false)
  const initials = (name || 'P')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
  const sizes = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-xl',
  }
  const realGradient = (gradient && gradient.startsWith('from-'))
    ? gradient
    : ['from-pink-500 to-rose-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-500'][
        (name || '').length % 4
      ]!

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={cn(
          'shrink-0 rounded-full object-cover shadow-inner ring-1 ring-white/20',
          sizes[size],
          className,
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white shadow-inner',
        realGradient,
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
        <Icon className="h-7 w-7 text-ink-300" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-300">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-violet-400">{eyebrow}</p>
        )}
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-ink-300">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

const TOAST_EVENT = 'inkhel-toast'

export function toast(message: string, kind: ToastKind = 'info'): void {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, kind } }))
}

const TOAST_STYLES: Record<ToastKind, { icon: LucideIcon; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'text-emerald-400' },
  error: { icon: XCircle, classes: 'text-red-400' },
  info: { icon: Info, classes: 'text-sky-400' },
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    let counter = 0
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; kind: ToastKind }
      const id = ++counter
      setItems((prev) => [...prev, { id, kind: detail.kind ?? 'info', message: detail.message }])
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200)
    }
    window.addEventListener(TOAST_EVENT, handler)
    return () => window.removeEventListener(TOAST_EVENT, handler)
  }, [])

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {items.map((t) => {
        const s = TOAST_STYLES[t.kind]
        return (
          <div
            key={t.id}
            className="animate-pop flex items-start gap-2.5 rounded-xl border border-white/10 bg-ink-800/95 px-4 py-3 text-sm shadow-2xl backdrop-blur"
            role="status"
          >
            <s.icon className={cn('mt-0.5 h-4 w-4 shrink-0', s.classes)} />
            <span className="text-ink-100">{t.message}</span>
            <button
              className="ml-auto text-ink-300 hover:text-white"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-pop relative w-full max-w-md rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
          <button className="text-ink-300 hover:text-white" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'violet',
}: {
  icon: LucideIcon
  label: string
  value: string | number
  accent?: 'violet' | 'emerald' | 'amber' | 'sky' | 'rose'
}) {
  const accents = {
    violet: 'from-indigo-500/20 to-fuchsia-500/10 text-violet-300 border-violet-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/20',
    sky: 'from-sky-500/20 to-cyan-500/10 text-sky-300 border-sky-500/20',
    rose: 'from-rose-500/20 to-pink-500/10 text-rose-300 border-rose-500/20',
  }
  return (
    <Card className={cn('relative overflow-hidden p-5', 'bg-gradient-to-br', accents[accent])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-300/80">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white/5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}
