import { Link } from '@tanstack/react-router'
import { Clock, Copy, Link2, MessageCircle, Play, Share2, Twitter, Users } from 'lucide-react'
import type { Episode, Season } from '../types'
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

export function EpisodeBanner({
  episode,
  className,
  iconSize = 'h-14 w-14',
}: {
  episode: Episode
  className?: string
  iconSize?: string
}) {
  const preset = getBannerPreset(episode.bannerGradient)
  const Icon = resolveIcon(episode.bannerIcon)
  if (episode.bannerUrl) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <img src={episode.bannerUrl} alt={episode.title} className="h-full w-full object-cover" />
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

export function statusBadge(status: Episode['status']): { tone: 'green' | 'amber' | 'slate'; label: string } {
  if (status === 'published') return { tone: 'green', label: 'Live' }
  if (status === 'archived') return { tone: 'amber', label: 'Archived' }
  return { tone: 'slate', label: 'Draft' }
}

export function EpisodeCard({
  episode,
  season,
  participantCount = 0,
}: {
  episode: Episode
  season?: Season
  participantCount?: number
}) {
  const badge = statusBadge(episode.status)
  const href = `/episodes/${episode.id}`
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-violet-500/10">
      <div className="relative">
        <EpisodeBanner episode={episode} className="h-40" />
        <div className="absolute left-3 top-3">
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        {episode.status === 'published' && (
          <Link
            to={href}
            className="focus-ring absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
            aria-label={`Play ${episode.title}`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-2xl">
              <Play className="h-6 w-6 translate-x-0.5 fill-current" />
            </span>
          </Link>
        )}
      </div>
      <div className="p-5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            {season?.name ?? 'Season'}
          </p>
        </div>
        <h3 className="font-display text-lg font-bold leading-snug text-white">{episode.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-300">{episode.description}</p>
        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-ink-300">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {formatTime(episode.timeLimitSeconds)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {pluralize(participantCount, 'player')}
          </span>
        </div>
        {episode.status === 'published' && (
          <Link to={href} className="mt-4 block">
            <Button className="w-full" size="sm" variant="secondary">
              <Play className="h-4 w-4" /> Play Episode
            </Button>
          </Link>
        )}
        {episode.status !== 'published' && (
          <Link to={href} className="mt-4 block">
            <Button className="w-full" size="sm" variant="ghost">
              View Details
            </Button>
          </Link>
        )}
      </div>
    </Card>
  )
}

export function ShareButtons({ episode }: { episode: Episode }) {
  const url = buildShareUrl(`/episodes/${episode.id}`)
  const text = `I'm playing "${episode.title}" on Inkhel — can you beat my score?`

  const handleShare = async () => {
    try {
      await shareEpisode(url, episode.title)
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
