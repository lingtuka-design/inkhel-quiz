import { useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  ImagePlus,
  Lock,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import type { OptionKey, QuestionDraft } from '../../types'
import { Button, ErrorNote, Input, toast } from '../ui'
import { canEditQuestions } from '../../services/questionService'
import { uploadImageToR2 } from '../../services/uploadService'
import { cn } from '../../lib/utils'

const LETTERS: OptionKey[] = ['A', 'B', 'C', 'D']

export interface QuestionEditorProps {
  roundId: string
  initial: QuestionDraft[]
  onSave: (drafts: QuestionDraft[]) => void
}

export function QuestionEditor({ roundId, initial, onSave }: QuestionEditorProps) {
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() => initial)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lock = canEditQuestions(roundId)

  const handleQuestionImage = async (index: number, file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Only image files are allowed')
    if (file.size > 10 * 1024 * 1024) return setError('Image is too large — max 10 MB')

    try {
      setUploadingIndex(index)
      setError(null)
      const res = await uploadImageToR2(file)
      update(index, { imageUrl: res.url })
      toast('Question image uploaded to R2!', 'success')
    } catch (err: any) {
      setError(err.message || 'Failed to upload question image to R2')
    } finally {
      setUploadingIndex(null)
    }
  }

  const update = (index: number, patch: Partial<QuestionDraft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
    setDirty(true)
  }

  const updateOption = (index: number, key: OptionKey, text: string) => {
    setDrafts((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, options: d.options.map((o) => (o.key === key ? { ...o, text } : o)) } : d,
      ),
    )
    setDirty(true)
  }

  const addQuestion = () => {
    setDrafts((prev) => [
      ...prev,
      {
        id: null,
        text: '',
        order: prev.length + 1,
        options: LETTERS.map((key) => ({ key, text: '' })),
        correctKey: 'A',
      },
    ])
    setDirty(true)
  }

  const addQuestionAt = (index: number) => {
    setDrafts((prev) => {
      const next = [...prev]
      next.splice(index, 0, {
        id: null,
        text: '',
        order: index + 1,
        options: LETTERS.map((key) => ({ key, text: '' })),
        correctKey: 'A',
      })
      return next.map((d, i) => ({ ...d, order: i + 1 }))
    })
    setDirty(true)
  }

  const duplicateQuestion = (index: number) => {
    const src = drafts[index]!
    setDrafts((prev) => [
      ...prev.slice(0, index + 1),
      { ...src, id: null, order: prev.length + 1 },
      ...prev.slice(index + 1),
    ])
    setDirty(true)
  }

  const deleteQuestion = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, order: i + 1 })))
    setDirty(true)
  }

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= drafts.length) return
    setDrafts((prev) => {
      const next = [...prev]
      const a = next[index]!
      next[index] = next[target]!
      next[target] = a
      return next.map((d, i) => ({ ...d, order: i + 1 }))
    })
    setDirty(true)
  }

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const validate = (): string[] => {
    const errors: string[] = []
    if (drafts.length === 0) return ['Add at least one question']
    drafts.forEach((d, i) => {
      if (!d.text.trim()) errors.push(`Question ${i + 1} has no text`)
      if (d.options.some((o) => !o.text.trim())) errors.push(`Question ${i + 1} has an empty option`)
      if (d.options.filter((o) => o.text.trim()).length !== 4)
        errors.push(`Question ${i + 1} must have exactly four options`)
    })
    return errors
  }

  const handleSave = () => {
    setError(null)
    const errors = validate()
    if (errors.length) return setError(errors[0])
    setSaving(true)
    try {
      onSave(drafts)
      setDirty(false)
      toast('Questions saved', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save questions')
    } finally {
      setSaving(false)
    }
  }

  if (!lock.ok) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
        <Lock className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Questions locked</p>
          <p className="mt-1 text-amber-300/80">{lock.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-300">
          {drafts.length} question{drafts.length === 1 ? '' : 's'} ·{' '}
          <span className={dirty ? 'font-semibold text-amber-300' : 'text-ink-300'}>
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </p>
        <Button size="sm" variant="secondary" icon={Plus} onClick={addQuestion}>
          Add Question
        </Button>
      </div>

      <ErrorNote message={error} />

      {drafts.map((d, i) => (
        <div key={i} className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
            <GripVertical className="h-4 w-4 shrink-0 text-ink-300" />
            <button
              className="flex flex-1 items-center gap-2 text-left font-display text-sm font-semibold text-white"
              onClick={() => toggleCollapse(i)}
            >
              <span className="text-violet-400">Question {i + 1}</span>
              {d.text.trim() ? <span className="truncate text-xs font-normal text-ink-300">— {d.text}</span> : null}
            </button>
            <div className="flex items-center gap-1">
              <button
                className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                onClick={() => moveQuestion(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                onClick={() => moveQuestion(i, 1)}
                disabled={i === drafts.length - 1}
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                onClick={() => duplicateQuestion(i)}
                aria-label="Duplicate question"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                className="focus-ring rounded-lg p-1.5 text-red-300/70 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => deleteQuestion(i)}
                aria-label="Delete question"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                className="focus-ring rounded-lg p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
                onClick={() => toggleCollapse(i)}
                aria-label={collapsed[i] ? 'Expand question' : 'Collapse question'}
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', collapsed[i] && '-rotate-90')} />
              </button>
            </div>
          </div>

          {!collapsed[i] && (
            <div className="space-y-4 px-4 py-4 sm:px-5">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={d.text}
                    onChange={(e) => update(i, { text: e.target.value })}
                    placeholder="Question text — e.g. What is the capital of France?"
                  />
                </div>
                <label className="focus-ring flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-ink-300 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white">
                  <ImagePlus className="h-4 w-4 text-violet-400" />
                  <span className="hidden sm:inline">
                    {uploadingIndex === i ? 'Uploading...' : d.imageUrl ? 'Change Image' : 'Add Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingIndex === i}
                    className="hidden"
                    onChange={(e) => handleQuestionImage(i, e.target.files?.[0])}
                  />
                </label>
              </div>

              {d.imageUrl && (
                <div className="relative inline-block overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  <img src={d.imageUrl} alt="Question asset" className="h-28 max-w-full rounded-xl object-contain" />
                  <button
                    type="button"
                    onClick={() => update(i, { imageUrl: null })}
                    className="focus-ring absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-ink-300 hover:bg-red-500 hover:text-white"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {d.options.map((opt) => {
                  const isCorrect = d.correctKey === opt.key
                  return (
                    <div key={opt.key} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => update(i, { correctKey: opt.key })}
                        className={cn(
                          'focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors',
                          isCorrect
                            ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
                            : 'border-white/15 bg-white/5 text-ink-300 hover:border-white/30',
                        )}
                        title="Mark as correct answer"
                        aria-label={`Mark option ${opt.key} as correct`}
                      >
                        {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : opt.key}
                      </button>
                      <Input
                        value={opt.text}
                        onChange={(e) => updateOption(i, opt.key, e.target.value)}
                        placeholder={`Option ${opt.key}`}
                      />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-ink-300">
                Click the letter badge to mark the correct answer — exactly one per question.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Plus}
                  onClick={() => addQuestionAt(i + 1)}
                  className="text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
                >
                  Add Question Below
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {drafts.length === 0 && (
        <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-ink-300">
          No questions yet. Add your first question to build the quiz.
        </div>
      )}

      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:px-5">
        <p className="text-xs text-ink-300">
          {drafts.length} question{drafts.length === 1 ? '' : 's'} ·{' '}
          <span className={dirty ? 'font-semibold text-amber-300' : 'text-emerald-300'}>
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </p>
        <Button onClick={handleSave} loading={saving} icon={Save} disabled={!dirty}>
          Save Questions
        </Button>
      </div>
    </div>
  )
}
