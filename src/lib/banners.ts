import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Clapperboard,
  Crown,
  Globe,
  Landmark,
  Music,
  Rocket,
  Star,
  Swords,
  Trophy,
  Zap,
  Brain,
} from 'lucide-react'

export interface BannerPreset {
  id: string
  gradient: string
  icon: string
}

export const BANNER_PRESETS: BannerPreset[] = [
  { id: 'aurora', gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500', icon: 'Zap' },
  { id: 'ocean', gradient: 'from-cyan-500 via-sky-500 to-blue-600', icon: 'Globe' },
  { id: 'fire', gradient: 'from-orange-500 via-red-500 to-rose-600', icon: 'Swords' },
  { id: 'forest', gradient: 'from-emerald-500 via-teal-500 to-cyan-600', icon: 'BookOpen' },
  { id: 'sunset', gradient: 'from-amber-400 via-orange-500 to-pink-600', icon: 'Star' },
  { id: 'royal', gradient: 'from-violet-500 via-purple-500 to-fuchsia-600', icon: 'Crown' },
  { id: 'night', gradient: 'from-slate-600 via-slate-700 to-indigo-900', icon: 'Rocket' },
  { id: 'gold', gradient: 'from-yellow-400 via-amber-500 to-orange-600', icon: 'Trophy' },
  { id: 'film', gradient: 'from-rose-500 via-red-500 to-orange-500', icon: 'Clapperboard' },
  { id: 'heritage', gradient: 'from-violet-500 via-purple-500 to-blue-600', icon: 'Landmark' },
]

export function getBannerPreset(id: string): BannerPreset {
  return BANNER_PRESETS.find((p) => p.id === id) ?? BANNER_PRESETS[0]!
}

const ICON_MAP: Record<string, LucideIcon> = {
  Brain,
  Trophy,
  Clapperboard,
  Landmark,
  Crown,
  Zap,
  Globe,
  Music,
  Swords,
  Rocket,
  BookOpen,
  Star,
}

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Zap
}

export const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-sky-500',
  'from-fuchsia-500 to-pink-500',
  'from-lime-500 to-emerald-500',
]

export function avatarGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]!
}
