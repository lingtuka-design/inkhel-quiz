import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Save } from 'lucide-react'
import type { Season } from '../../types'
import { Button, ErrorNote, Field, Input, Select, Textarea, toast } from '../ui'
import { computeEndDate } from '../../services/seasonService'
import { formatDate } from '../../lib/utils'

export const DURATION_OPTIONS = [
  { value: '1', label: '1 month' },
  { value: '2', label: '2 months' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
]

export function SeasonForm({
  initial,
  onSave,
  submitLabel = 'Save Season',
}: {
  initial?: Season | null
  onSave: (input: {
    name: string
    seasonNumber: number
    description: string
    durationMonths: number
    startDate: string
    endDate: string
    status: Season['status']
  }) => void
  submitLabel?: string
}) {
  const defaultStart = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [name, setName] = useState(initial?.name ?? '')
  const [seasonNumber, setSeasonNumber] = useState(String(initial?.seasonNumber ?? 1))
  const [durationMonths, setDurationMonths] = useState(String(initial?.durationMonths ?? 3))
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? defaultStart)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<Season['status']>(initial?.status ?? 'draft')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const autoEnd = useMemo(() => {
    const d = new Date(startDate)
    if (Number.isNaN(d.getTime())) return ''
    return new Date(computeEndDate(startDate, Number(durationMonths) || 1)).toISOString().slice(0, 10)
  }, [startDate, durationMonths])

  const [endDate, setEndDate] = useState(() => {
    if (initial?.endDate) return initial.endDate.slice(0, 10)
    return computeEndDate(defaultStart, 3).slice(0, 10)
  })

  useEffect(() => {
    if (!initial) setEndDate(autoEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnd])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Season name is required')
    if (new Date(startDate) >= new Date(endDate)) return setError('End date must be after the start date')
    setSaving(true)
    try {
      onSave({
        name,
        seasonNumber: Number(seasonNumber),
        description,
        durationMonths: Number(durationMonths),
        startDate,
        endDate,
        status,
      })
      toast('Season saved', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save season')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ErrorNote message={error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Season name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premier Season" required />
        </Field>
        <Field label="Season number">
          <Input
            type="number"
            min={1}
            value={seasonNumber}
            onChange={(e) => setSeasonNumber(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Duration in months" hint="End date is calculated automatically, then editable.">
          <Select value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)}>
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-ink-800">
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start date">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </Field>
        <Field label="End date" hint={`Calculated: ${durationMonths} month(s) from start`}>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </Field>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
        <CalendarRange className="h-4 w-4 shrink-0" />
        Auto-calculated end date: <span className="font-semibold">{formatDate(new Date(endDate).toISOString())}</span>
      </div>

      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this season about?" />
      </Field>

      <Field label="Status">
        <Select value={status} onChange={(e) => setStatus(e.target.value as Season['status'])}>
          <option value="draft" className="bg-ink-800">Draft</option>
          <option value="active" className="bg-ink-800">Active</option>
          <option value="completed" className="bg-ink-800">Completed</option>
          <option value="archived" className="bg-ink-800">Archived</option>
        </Select>
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} icon={Save}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
