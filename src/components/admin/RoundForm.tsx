import { useState } from 'react'
import { ImagePlus, Save, Timer as TimerIcon } from 'lucide-react'
import type { Round, RoundStatus } from '../../types'
import { Button, ErrorNote, Field, Input, Select, Textarea, toast } from '../ui'
import { BANNER_PRESETS, resolveIcon } from '../../lib/banners'
import { cn } from '../../lib/utils'

export const TIME_PRESETS = [
  { seconds: 60, label: '1 minute' },
  { seconds: 120, label: '2 minutes' },
  { seconds: 180, label: '3 minutes' },
  { seconds: 300, label: '5 minutes' },
  { seconds: 600, label: '10 minutes' },
  { seconds: 900, label: '15 minutes' },
]

const MAX_BANNER_BYTES = 1.5 * 1024 * 1024

export function RoundForm({
  initial,
  months,
  defaultMonthId,
  onSave,
  submitLabel = 'Save Round',
}: {
  initial?: Round | null
  months: { id: string; label: string; seasonName?: string; open: boolean }[]
  defaultMonthId?: string
  onSave: (input: {
    title: string
    description: string
    monthId: string
    timeLimitSeconds: number
    status: RoundStatus
    bannerGradient: string
    bannerIcon: string
    bannerUrl: string | null
  }) => void
  submitLabel?: string
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [monthId, setMonthId] = useState(initial?.monthId ?? defaultMonthId ?? months[0]?.id ?? '')
  const [timePreset, setTimePreset] = useState(() =>
    TIME_PRESETS.some((t) => t.seconds === initial?.timeLimitSeconds) ? String(initial?.timeLimitSeconds) : '300',
  )
  const [customTime, setCustomTime] = useState(
    initial && !TIME_PRESETS.some((t) => t.seconds === initial.timeLimitSeconds)
      ? String(initial.timeLimitSeconds)
      : '',
  )
  const [status, setStatus] = useState<RoundStatus>(initial?.status ?? 'draft')
  const [bannerGradient, setBannerGradient] = useState(initial?.bannerGradient ?? 'aurora')
  const [bannerIcon, setBannerIcon] = useState(initial?.bannerIcon ?? 'Zap')
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial?.bannerUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const timeLimitSeconds = timePreset === 'custom' ? Number(customTime) || 0 : Number(timePreset)

  const handleBannerFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Only image files are allowed')
    if (file.size > MAX_BANNER_BYTES)
      return setError('Image is too large — keep it under 1.5 MB in the demo')
    const reader = new FileReader()
    reader.onload = () => setBannerUrl(reader.result as string)
    reader.onerror = () => setError('Could not read the image file')
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Round title is required')
    if (!monthId) return setError('Select the month this round belongs to')
    if (!timeLimitSeconds || timeLimitSeconds <= 0) return setError('Time limit must be greater than zero')
    setSaving(true)
    try {
      onSave({
        title,
        description,
        monthId,
        timeLimitSeconds,
        status,
        bannerGradient,
        bannerIcon,
        bannerUrl,
      })
      toast('Round saved', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save round')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ErrorNote message={error} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Field label="Round title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Round 4 — Football Fever" required />
          </Field>
          <Field label="Short description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will players face?" />
          </Field>
          <Field label="Month" hint="Rounds stay playable until this month ends, then close automatically.">
            <Select value={monthId} onChange={(e) => setMonthId(e.target.value)} required>
              {months.map((m) => (
                <option key={m.id} value={m.id} className="bg-ink-800">
                  {m.seasonName ? `${m.seasonName} — ` : ''}
                  {m.label}
                  {m.open ? ' (open)' : ' (closed)'}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Time limit" hint="Select a preset or choose custom.">
              <Select value={timePreset} onChange={(e) => setTimePreset(e.target.value)}>
                {TIME_PRESETS.map((t) => (
                  <option key={t.seconds} value={String(t.seconds)} className="bg-ink-800">
                    {t.label}
                  </option>
                ))}
                <option value="custom" className="bg-ink-800">
                  Custom…
                </option>
              </Select>
            </Field>
            {timePreset === 'custom' && (
              <Field label="Seconds" hint="e.g. 240 = 4 minutes">
                <Input
                  type="number"
                  min={5}
                  max={3600}
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="240"
                />
              </Field>
            )}
            {timePreset !== 'custom' && (
              <div className="flex items-end">
                <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-white">
                  <TimerIcon className="h-4 w-4 text-violet-400" />
                  {timeLimitSeconds >= 60
                    ? `${Math.round(timeLimitSeconds / 60)} minutes`
                    : `${timeLimitSeconds} seconds`}
                </div>
              </div>
            )}
          </div>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as RoundStatus)}>
              <option value="draft" className="bg-ink-800">Draft</option>
              <option value="published" className="bg-ink-800">Published</option>
              <option value="archived" className="bg-ink-800">Archived</option>
            </Select>
          </Field>
        </div>

        <div className="space-y-5">
          <Field label="Banner theme">
            <div className="grid grid-cols-5 gap-2.5">
              {BANNER_PRESETS.map((p) => {
                const Icon = resolveIcon(p.icon)
                const active = bannerGradient === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setBannerGradient(p.id)
                      setBannerIcon(p.icon)
                    }}
                    className={cn(
                      'focus-ring flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br text-white transition-all',
                      p.gradient,
                      active ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-950 scale-105' : 'opacity-70 hover:opacity-100',
                    )}
                    aria-label={`Banner theme ${p.id}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label="Upload a banner image" hint="Optional — used for cards, details and social previews. Max 1.5 MB in the demo.">
            <label className="focus-ring flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6 text-sm text-ink-300 transition-colors hover:border-violet-400/40 hover:bg-violet-500/5">
              <ImagePlus className="h-6 w-6" />
              {bannerUrl ? 'Replace image' : 'Click to upload'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleBannerFile(e.target.files?.[0])}
              />
            </label>
          </Field>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div
              className={cn(
                'flex h-28 items-center justify-center bg-gradient-to-br',
                BANNER_PRESETS.find((p) => p.id === bannerGradient)?.gradient,
              )}
            >
              {bannerUrl ? (
                <img src={bannerUrl} alt="Banner preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold uppercase tracking-widest text-white/80">Preview</span>
              )}
            </div>
            <div className="bg-white/5 px-4 py-2 text-xs text-ink-300">
              Preview of {title || 'Round title'} · {description || 'Round description'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} icon={Save}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
