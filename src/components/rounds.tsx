import { Link } from '@tanstack/react-router'
import { Calendar, Clock, Copy, Link2, Lock, MessageCircle, Play, Share2, Twitter, Users, Zap } from 'lucide-react'
import type { Month, Round } from '../types'
import { getBannerPreset, resolveIcon } from '../lib/banners'
import { formatTime, pluralize } from '../lib/utils'
import { Badge, Button, Card, toast } from './ui'
import {
  buildShareUrl,
  copyToClipboard,
  facebookUrl,
  shareEpisode,
  whatsappUrl,
  xUrl,
} from '../services/shareService'
import { cn } from '../lib/utils'
import { roundAvailability, countQuestions as countQuestionsOf } from '../services/roundService'

export function RoundBanner({
  round,
  className,
  iconSize = 'h-14 w-14',
}: {
  round: Round
  className?: string
  iconSize?: string
}) {
  const preset = getBannerPreset(round.bannerGradient)
  const Icon = resolveIcon(round.bannerIcon)
  if (round.bannerUrl) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <img src={round.bannerUrl} alt={round.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
      </div>
    )
  }
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
        preset.gradient,
        className,
      )}
    >
      <div className="dot-grid absolute inset-0 opacity-40" />
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/20 blur-2xl" />
      <Icon className={cn('relative text-white/95 drop-shadow-lg', iconSize)} strokeWidth={1.8} />
    </div>
  )
}

export function roundStatusBadge(
  round: Round,
): { tone: 'green' | 'amber' | 'slate' | 'red'; label: string } {
  const availability = roundAvailability(round)
  if (round.status === 'draft') return { tone: 'slate', label: 'Draft' }
  if (round.status === 'archived') return { tone: 'amber', label: 'Archived' }
  if (availability.open) return { tone: 'green', label: 'Live' }
  if (availability.reason === 'month-closed') return { tone: 'red', label: 'Closed' }
  return { tone: 'amber', label: 'Scheduled' }
}

export function RoundCard({
  round,
  month,
  participantCount = 0,
}: {
  round: Round
  month?: Month
  participantCount?: number
}) {
  const badge = roundStatusBadge(round)
  const availability = roundAvailability(round)
  const href = `/rounds/${round.id}`
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-violet-500/10">
      <div className="relative">
        <RoundBanner round={round} className="h-40" />
        <div className="absolute left-3 top-3">
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        {availability.open && (
          <Link
            to={href}
            className="focus-ring absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
            aria-label={`Play ${round.title}`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-2xl">
              <Play className="h-6 w-6 translate-x-0.5 fill-current" />
            </span>
          </Link>
        )}
        {!availability.open && round.status === 'published' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <span className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">
              <Lock className="h-3.5 w-3.5" /> {badge.label}
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-400">
            <Calendar className="h-3.5 w-3.5" /> {month?.name ?? 'Round'}
          </p>
        </div>
        <h3 className="font-display text-lg font-bold leading-snug text-white">{round.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-300">{round.description}</p>
        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-ink-300">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {formatTime(round.timeLimitSeconds)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {pluralize(participantCount, 'player')}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> {countQuestionsOf(round.id)} questions
          </span>
        </div>
        <Link to={href} className="mt-4 block">
          <Button className="w-full" size="sm" variant={availability.open ? 'secondary' : 'ghost'}>
            {availability.open ? (
              <>
                <Play className="h-4 w-4" /> Play Round
              </>
            ) : (
              'View Round'
            )}
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export function ShareButtons({ round }: { round: Round }) {
  const url = buildShareUrl(`/rounds/${round.id}`)
  const text = `I'm playing "${round.title}" on Inkhel — can you beat my score?`

  const handleShare = async () => {
    try {
      await shareEpisode(url, round.title)
      toast('Share sheet opened', 'success')
    } catch {
      toast('Could not open share sheet', 'error')
    }
  }

  const handleCopy = async () => {
    try {
      await copyToClipboard(url)
      toast('Link copied to clipboard', 'success')
    } catch {
      toast('Could not copy link', 'error')
    }
  }

  const targets = [
    { label: 'Copy link', icon: Link2, onClick: handleCopy },
    { label: 'WhatsApp', icon: MessageCircle, href: whatsappUrl(url, text) },
    { label: 'X / Twitter', icon: Twitter, href: xUrl(url, text) },
    { label: 'Facebook', icon: Share2, href: facebookUrl(url) },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleShare}>
        <Share2 className="h-4 w-4" /> Share
      </Button>
      {targets.map((t) =>
        t.href ? (
          <a
            key={t.label}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-ink-200 transition-colors hover:border-white/25 hover:text-white"
            aria-label={`Share on ${t.label}`}
          >
            <t.icon className="h-4 w-4" />
          </a>
        ) : (
          <button
            key={t.label}
            onClick={t.onClick}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-ink-200 transition-colors hover:border-white/25 hover:text-white"
            aria-label={t.label}
          >
            <t.icon className="h-4 w-4" />
          </button>
        ),
      )}
      <span className="ml-auto hidden items-center gap-1.5 text-xs text-ink-300 sm:flex">
        <Copy className="h-3.5 w-3.5" /> {url.replace(window.location.origin, '')}
      </span>
    </div>
  )
}
