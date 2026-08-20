import { useEffect, useState } from 'react'
import {
  BarChart3,
  Check,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  Lock,
  Plus,
  Radio,
  Sparkles,
  Trash2,
  Upload,
  Vote,
  X,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BackLink } from '../../components/layout'
import { Badge, Button, Card, EmptyState, SectionHeading, toast } from '../../components/ui'
import { listPolls, savePoll, deletePoll, generateAiPoll } from '../../services/pollService'
import { setPageTitle } from '../../services/shareService'
import { formatDate } from '../../lib/utils'
import type { Poll } from '../../types'

interface OptionDraft {
  id: string
  text: string
  imageUrl?: string
}

export function AdminPollsPage() {
  const queryClient = useQueryClient()

  const [isCreating, setIsCreating] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Form State
  const [editingPollId, setEditingPollId] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [category, setCategory] = useState('football')
  const [status, setStatus] = useState<'active' | 'closed'>('active')
  const [featured, setFeatured] = useState(true)
  const [options, setOptions] = useState<OptionDraft[]>([
    { id: 'opt_1', text: '' },
    { id: 'opt_2', text: '' },
  ])
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  useEffect(() => {
    setPageTitle('Polls Management — Admin')
  }, [])

  const { data: polls, isLoading } = useQuery({
    queryKey: ['adminPolls'],
    queryFn: () => listPolls(null, 'all'),
  })

  const resetForm = () => {
    setEditingPollId(null)
    setQuestion('')
    setDescription('')
    setBannerUrl('')
    setCategory('football')
    setStatus('active')
    setFeatured(true)
    setOptions([
      { id: 'opt_1', text: '' },
      { id: 'opt_2', text: '' },
    ])
    setIsCreating(false)
  }

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, text: '' },
    ])
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast('At least 2 options are required', 'error')
      return
    }
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleOptionTextChange = (index: number, text: string) => {
    setOptions((prev) => {
      const next = [...prev]
      next[index] = { ...next[index]!, text }
      return next
    })
  }

  const handleOptionImageChange = (index: number, imageUrl: string) => {
    setOptions((prev) => {
      const next = [...prev]
      next[index] = { ...next[index]!, imageUrl: imageUrl.trim() || undefined }
      return next
    })
  }

  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingIdx(index)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      const data = await res.json()
      if (data.url) {
        handleOptionImageChange(index, data.url)
        toast('Image uploaded successfully', 'success')
      }
    } catch (e: any) {
      toast(e.message || 'Image upload failed', 'error')
    } finally {
      setUploadingIdx(null)
    }
  }

  const handleBannerUpload = async (file: File) => {
    try {
      setUploadingBanner(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      const data = await res.json()
      if (data.url) {
        setBannerUrl(data.url)
        toast('Banner image uploaded successfully', 'success')
      }
    } catch (e: any) {
      toast(e.message || 'Banner upload failed', 'error')
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) {
      toast('Please enter a topic for AI poll generation', 'error')
      return
    }

    setIsGenerating(true)
    try {
      const generated = await generateAiPoll(aiTopic)
      if (generated && generated.question && generated.options?.length) {
        setQuestion(generated.question)
        if (generated.description) setDescription(generated.description)
        if (generated.category) setCategory(generated.category)
        setOptions(
          generated.options.map((opt, i) => ({
            id: `opt_${Date.now()}_${i + 1}`,
            text: opt.text,
          })),
        )
        setIsAiModalOpen(false)
        setIsCreating(true)
        toast('✨ Gemini AI generated poll in fluent Mizo!', 'success')
      } else {
        toast('Failed to generate poll. Please try another topic.', 'error')
      }
    } catch {
      toast('Error generating poll with AI', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSavePoll = async () => {
    if (!question.trim()) {
      toast('Poll question is required', 'error')
      return
    }

    const validOptions = options.filter((o) => o.text.trim())
    if (validOptions.length < 2) {
      toast('Please fill out at least 2 options', 'error')
      return
    }

    try {
      const result = await savePoll({
        id: editingPollId || undefined,
        question: question.trim(),
        description: description.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        category,
        status,
        featured: featured ? 1 : 0,
        options: validOptions,
      })

      if (result.success) {
        toast(editingPollId ? 'Poll updated' : 'Poll created successfully!', 'success')
        await queryClient.invalidateQueries({ queryKey: ['adminPolls'] })
        await queryClient.invalidateQueries({ queryKey: ['polls'] })
        resetForm()
      } else {
        toast(result.error || 'Failed to save poll', 'error')
      }
    } catch (e: any) {
      toast(e.message || 'Error saving poll', 'error')
    }
  }

  const handleToggleStatus = async (poll: Poll) => {
    const newStatus = poll.status === 'active' ? 'closed' : 'active'
    try {
      await savePoll({
        ...poll,
        status: newStatus,
      })
      toast(`Poll marked as ${newStatus}`, 'success')
      await queryClient.invalidateQueries({ queryKey: ['adminPolls'] })
      await queryClient.invalidateQueries({ queryKey: ['polls'] })
    } catch {
      toast('Failed to update status', 'error')
    }
  }

  const handleDelete = async (id: string, q: string) => {
    if (!window.confirm(`Delete poll "${q}"?\nThis removes all its cast votes permanently.`)) return
    try {
      const ok = await deletePoll(id)
      if (ok) {
        toast('Poll deleted', 'success')
        await queryClient.invalidateQueries({ queryKey: ['adminPolls'] })
        await queryClient.invalidateQueries({ queryKey: ['polls'] })
      } else {
        toast('Delete failed', 'error')
      }
    } catch {
      toast('Delete failed', 'error')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <BackLink to="/admin/dashboard" label="Dashboard" />
          <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl flex items-center gap-2.5">
            <Vote className="h-7 w-7 text-violet-400" />
            Opinion Polls Manager
          </h1>
          <p className="mt-1 text-sm text-ink-300">
            Create, manage fan voting polls, view real-time percentage results, and generate viral polls with Gemini AI.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={Sparkles}
            onClick={() => setIsAiModalOpen(true)}
            className="bg-gradient-to-r from-violet-500/15 via-fuchsia-500/15 to-pink-500/15 border-violet-500/30 text-violet-200 hover:text-white"
          >
            ✨ AI Poll Generator
          </Button>

          {!isCreating && (
            <Button
              size="sm"
              icon={Plus}
              onClick={() => {
                resetForm()
                setIsCreating(true)
              }}
            >
              New Poll
            </Button>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      {isAiModalOpen && (
        <Card className="border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-slate-900/60 to-slate-950/80 p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              Gemini AI Opinion Poll Generator
            </h2>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="text-ink-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-xs text-ink-300 sm:text-sm">
            Type any football / sports topic (e.g. <em>"Ballon d'Or 2026", "Premier League Title Race", "Erik ten Hag Man Utd", "Arsenal vs Chelsea"</em>) and Gemini AI will draft the poll and options in fluent Mizo.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. Premier League champion tur tunge?"
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-ink-400 focus:border-violet-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
            />
            <Button
              size="sm"
              icon={Sparkles}
              disabled={isGenerating}
              onClick={handleAiGenerate}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 shrink-0"
            >
              {isGenerating ? 'Generating...' : 'Generate Poll'}
            </Button>
          </div>
        </Card>
      )}

      {/* Create / Edit Poll Form */}
      {isCreating && (
        <Card className="border-white/15 bg-slate-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Vote className="h-5 w-5 text-violet-400" />
              {editingPollId ? 'Edit Poll' : 'Create New Opinion Poll'}
            </h2>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-300">
                Poll Question *
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Kumin Ballon d'Or tunge phu ber?"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white placeholder-ink-400 focus:border-violet-500 focus:outline-none"
              />
            </div>

            {/* Poll Banner Image (Home & Catalog Banner) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-300">
                Poll Banner Image (Home Page & Detail Banner)
              </label>
              <div className="mt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {bannerUrl ? (
                  <div className="relative group shrink-0">
                    <img
                      src={bannerUrl}
                      alt="Banner preview"
                      className="h-16 w-32 rounded-xl object-cover border border-white/20 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setBannerUrl('')}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-xs shadow"
                      title="Remove banner"
                    >
                      ×
                    </button>
                  </div>
                ) : null}

                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="Paste Banner Image URL (e.g. https://.../banner.jpg)"
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-ink-400 focus:border-violet-500 focus:outline-none"
                />

                <label className="flex items-center justify-center gap-1.5 cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-ink-200 hover:text-white hover:border-white/30 shrink-0">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingBanner ? 'Uploading...' : 'Upload Banner'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleBannerUpload(file)
                    }}
                  />
                </label>
              </div>
              <p className="mt-1 text-[11px] text-ink-400">
                Home page leh voting page-a Poll card chung bera lang tur thlalak/banner. A awm loh chuan standard gradient banner a lang ang.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-300">
                Description / Context (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Vantlang ngaihdan vote thlak rawh le."
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder-ink-400 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="football">Football</option>
                  <option value="sports">General Sports</option>
                  <option value="entertainment">Entertainment / Movies</option>
                  <option value="general">General Poll</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="active">Active (Voting Open)</option>
                  <option value="closed">Closed (Voting Locked)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Featured on Home
                </label>
                <button
                  type="button"
                  onClick={() => setFeatured(!featured)}
                  className={`mt-1.5 w-full flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                    featured
                      ? 'border-violet-500/50 bg-violet-600/20 text-violet-200'
                      : 'border-white/15 bg-white/5 text-ink-300'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {featured ? 'Featured on Top' : 'Standard'}
                </button>
              </div>
            </div>

            {/* Dynamic Options Builder */}
            <div className="pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Voting Options (Minimum 2)
                </label>
                <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddOption}>
                  Add Option
                </Button>
              </div>

              <div className="space-y-3">
                {options.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
                      {idx + 1}
                    </span>

                    {/* Option Text Input */}
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1} text (e.g. Vinicius Jr)`}
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-ink-400 focus:border-violet-500 focus:outline-none"
                      />
                    </div>

                    {/* Optional Image URL or Upload */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        {opt.imageUrl ? (
                          <div className="relative group shrink-0">
                            <img
                              src={opt.imageUrl}
                              alt="Option preview"
                              className="h-9 w-9 rounded-lg object-cover border border-white/20 shadow"
                            />
                            <button
                              type="button"
                              onClick={() => handleOptionImageChange(idx, '')}
                              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px]"
                              title="Remove image"
                            >
                              ×
                            </button>
                          </div>
                        ) : null}

                        <input
                          type="url"
                          value={opt.imageUrl || ''}
                          onChange={(e) => handleOptionImageChange(idx, e.target.value)}
                          placeholder="Image URL (embed)"
                          className="w-full sm:w-36 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs text-white placeholder-ink-400 focus:border-violet-500 focus:outline-none"
                        />

                        <label className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-semibold text-ink-300 hover:text-white hover:border-white/30 shrink-0">
                          <Upload className="h-3.5 w-3.5" />
                          <span>{uploadingIdx === idx ? '...' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(idx, file)
                            }}
                          />
                        </label>
                      </div>

                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                          title="Delete option"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              size="sm"
              icon={Check}
              onClick={handleSavePoll}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500"
            >
              {editingPollId ? 'Update Poll' : 'Publish Poll'}
            </Button>
          </div>
        </Card>
      )}

      {/* Existing Polls Table */}
      {!polls || polls.length === 0 ? (
        <EmptyState
          icon={Vote}
          title="No polls created yet"
          description="Click 'New Poll' or '✨ AI Poll Generator' to create your first fan voting poll."
          action={
            <Button
              icon={Plus}
              onClick={() => {
                resetForm()
                setIsCreating(true)
              }}
            >
              Create Poll
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-300">
                  <th className="px-4 py-3 font-semibold">Poll Question</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 text-center font-semibold">Votes</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Live Results Breakdown</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {polls.map((poll) => (
                  <tr
                    key={poll.id}
                    className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="font-semibold text-white truncate" title={poll.question}>
                        {poll.question}
                      </p>
                      <p className="text-xs text-ink-300 truncate">
                        {formatDate(poll.createdAt)} · {poll.options.length} options
                      </p>
                    </td>

                    <td className="px-4 py-3.5 capitalize text-ink-200">
                      <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs">
                        {poll.category}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center font-display font-bold text-white">
                      {poll.totalVotes.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {poll.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/25 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                          <Lock className="h-3 w-3" /> Closed
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 min-w-[220px]">
                      <div className="space-y-1.5">
                        {poll.options.map((opt) => (
                          <div key={opt.id} className="text-xs">
                            <div className="flex justify-between text-ink-200 mb-0.5">
                              <span className="truncate max-w-[140px] font-medium">{opt.text}</span>
                              <span className="font-bold text-white">{opt.percentage}% ({opt.votes})</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                style={{ width: `${opt.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(poll)}
                          className="rounded-lg p-1.5 text-ink-300 hover:text-white hover:bg-white/5 transition-colors"
                          title={poll.status === 'active' ? 'Close Poll' : 'Open Poll'}
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPollId(poll.id)
                            setQuestion(poll.question)
                            setDescription(poll.description || '')
                            setBannerUrl(poll.bannerUrl || '')
                            setCategory(poll.category)
                            setStatus(poll.status)
                            setFeatured(poll.featured)
                            setOptions(
                              poll.options.map((o) => ({
                                id: o.id,
                                text: o.text,
                                imageUrl: o.imageUrl,
                              })),
                            )
                            setIsCreating(true)
                          }}
                          className="rounded-lg p-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
                          title="Edit Poll"
                        >
                          <Radio className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(poll.id, poll.question)}
                          className="rounded-lg p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          title="Delete Poll"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
