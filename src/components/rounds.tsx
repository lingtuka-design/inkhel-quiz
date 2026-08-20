import { Link } from '@tanstack/react-router'
import { Calendar, CheckCircle2, Clock, Copy, Link2, Lock, MessageCircle, Play, Share2, Twitter, Users, Zap } from 'lucide-react'
import type { Month, Round } from '../types'
import { getBannerPreset, resolveIcon } from '../lib/banners'
import { formatTime, pluralize } from '../lib/utils'
import { Badge, Button, Card, toast } from './ui'
import {
  buildShareUrl,
  copyToClipboard,
  facebookUrl,
  formatRoundWhatsAppText,
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

export const CATEGORY_INFO: Record<string, { label: string; icon: string; tone: string }> = {
  football: { label: 'Football', icon: '⚽', tone: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40' },
  sports: { label: 'Sports', icon: '🏆', tone: 'bg-blue-500/25 text-blue-300 border-blue-500/40' },
  music: { label: 'Music', icon: '🎵', tone: 'bg-pink-500/25 text-pink-300 border-pink-500/40' },
  movies: { label: 'Movies', icon: '🎬', tone: 'bg-amber-500/25 text-amber-300 border-amber-500/40' },
  mizoram: { label: 'Mizoram', icon: '🏔️', tone: 'bg-teal-500/25 text-teal-300 border-teal-500/40' },
  gk: { label: 'GK', icon: '🧠', tone: 'bg-violet-500/25 text-violet-300 border-violet-500/40' },
  pop_culture: { label: 'Pop Culture', icon: '🎮', tone: 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40' },
}

export function CategoryBadge({ category }: { category?: string }) {
  const cat = (category || 'football').toLowerCase()
  const info = CATEGORY_INFO[cat] || { label: cat, icon: '✨', tone: 'bg-white/10 text-ink-200 border-white/15' }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md shadow-sm', info.tone)}>
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </span>
  )
}

export function RoundCard({
  round,
  month,
  participantCount,
  questionCount,
  userAttempt,
}: {
  round: Round
  month?: Month
  participantCount?: number
  questionCount?: number
  userAttempt?: { id?: string; finalScore?: number; status?: string } | null
}) {
  const isPlayed = userAttempt?.status === 'completed' || userAttempt?.status === 'expired'
  const badge = roundStatusBadge(round)
  const availability = roundAvailability(round)
  const href = isPlayed ? `/rounds/${round.id}/result?attemptId=${userAttempt.id}` : `/rounds/${round.id}`
  const players = participantCount ?? (round as any).participantCount ?? 0
  const qCount = questionCount ?? (round as any).questionCount ?? countQuestionsOf(round.id) ?? 10

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        isPlayed
          ? 'border-white/5 bg-white/[0.02] opacity-75 hover:opacity-100 hover:border-white/15'
          : availability.open
            ? 'border-violet-500/40 bg-gradient-to-b from-white/[0.04] to-transparent shadow-lg shadow-violet-950/40 hover:-translate-y-1.5 hover:border-violet-400 hover:shadow-2xl hover:shadow-violet-600/25 ring-1 ring-violet-500/20'
            : 'hover:-translate-y-1 hover:border-white/20',
      )}
    >
      <div className="relative">
        <RoundBanner round={round} className={cn('h-40', isPlayed && 'grayscale-[20%]')} />
        
        {/* Left Status Badge */}
        <div className="absolute left-3 top-3">
          {isPlayed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-950/80 px-2.5 py-0.5 text-xs font-bold text-emerald-300 shadow-md backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Khelh Tawh ({userAttempt.finalScore ?? 0} pts)
            </span>
          ) : availability.open ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-lg shadow-orange-950/50 animate-pulse">
              🔥 UNPLAYED
            </span>
          ) : (
            <Badge tone={badge.tone}>{badge.label}</Badge>
          )}
        </div>

        {/* Right Category Badge */}
        <div className="absolute right-3 top-3">
          <CategoryBadge category={round.category} />
        </div>

        {availability.open && (
          <Link
            to={href}
            className="focus-ring absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
            aria-label={isPlayed ? `View results for ${round.title}` : `Play ${round.title}`}
          >
            <span className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition transform group-hover:scale-110',
              isPlayed ? 'bg-white/80 text-ink-900' : 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-violet-500/50'
            )}>
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
          {isPlayed && (
            <span className="text-[11px] font-bold text-emerald-400">
              Completed ✨
            </span>
          )}
        </div>
        <h3 className="font-display text-lg font-bold leading-snug text-white">{round.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-300">{round.description}</p>
        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-ink-300">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {formatTime(round.timeLimitSeconds)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {pluralize(players, 'player')}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> {qCount} questions
          </span>
        </div>

        <Link to={href} className="mt-4 block">
          {isPlayed ? (
            <Button className="w-full text-xs font-semibold" size="sm" variant="outline">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> View Result & Score ({userAttempt.finalScore ?? 0} pts)
            </Button>
          ) : (
            <Button
              className="w-full text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-950/50"
              size="sm"
              variant="primary"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Play Round Now
            </Button>
          )}
        </Link>
      </div>
    </Card>
  )
}

export function ShareButtons({ round }: { round: Round }) {
  const url = buildShareUrl(`/rounds/${round.id}`)
  const whatsAppText = formatRoundWhatsAppText(round)

  const handleCopy = async () => {
    try {
      await copyToClipboard(url)
      toast('Round link copied to clipboard!', 'success')
    } catch {
      toast('Could not copy link', 'error')
    }
  }

  const handleWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`
    window.open(waUrl, '_blank')
  }

  const handleFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    window.open(fbUrl, '_blank')
  }

  const handleX = () => {
    const xText = `⚽ Playing "${round.title}" on Inkhel Quiz! Khel ve la, score sang ber nih tum rawh le!`
    const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(url)}`
    window.open(xShareUrl, '_blank')
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <span className="text-xs font-semibold text-ink-200 flex items-center gap-1.5">
        <Share2 className="h-3.5 w-3.5 text-violet-400" />
        <span>Share Round to Friends:</span>
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={MessageCircle}
          onClick={handleWhatsApp}
          className="bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:text-white"
        >
          WhatsApp
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleFacebook}
          className="bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25 hover:text-white"
        >
          Facebook
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleX}
          className="bg-white/5 border-white/10 text-ink-200 hover:bg-white/10 hover:text-white"
        >
          X
        </Button>

        <Button
          variant="secondary"
          size="sm"
          icon={Link2}
          onClick={handleCopy}
          className="bg-white/5 border-white/10 text-ink-200 hover:bg-white/10 hover:text-white"
        >
          Copy Link
        </Button>
      </div>
    </div>
  )
}
