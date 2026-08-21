import { getAdminToken } from './authService'
import type { Poll, PollOption } from '../types'

export async function listPolls(
  participantId?: string | null,
  status: 'active' | 'closed' | 'all' = 'active',
): Promise<Poll[]> {
  try {
    const params = new URLSearchParams()
    if (participantId) params.set('participantId', participantId)
    if (status) params.set('status', status)

    const res = await fetch(`/api/polls?${params.toString()}`)
    if (!res.ok) return []
    const data: Poll[] = await res.json()
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('Error fetching polls:', e)
    return []
  }
}

export async function getPoll(pollId: string, participantId?: string | null): Promise<Poll | null> {
  try {
    const params = new URLSearchParams({ id: pollId })
    if (participantId) params.set('participantId', participantId)

    const res = await fetch(`/api/polls?${params.toString()}`)
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error('Error fetching poll:', e)
    return null
  }
}

export async function votePoll(
  pollId: string,
  participantId: string,
  optionId: string,
): Promise<{
  success: boolean
  hasVoted?: boolean
  userVotedOptionId?: string
  totalVotes?: number
  options?: PollOption[]
  message?: string
}> {
  try {
    const res = await fetch('/api/polls/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, participantId, optionId }),
    })
    const data = await res.json()
    return data
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to submit vote' }
  }
}

export async function savePoll(poll: {
  id?: string
  question: string
  description?: string
  bannerUrl?: string
  layout?: 'list' | 'grid'
  options: { id?: string; text: string; imageUrl?: string }[]
  category?: string
  status?: 'active' | 'closed'
  featured?: boolean | number
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const token = getAdminToken()
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify(poll),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to save poll' }
    }
    return { success: true, id: data.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' }
  }
}

export async function deletePoll(pollId: string): Promise<boolean> {
  try {
    const token = getAdminToken()
    const res = await fetch(`/api/polls?id=${encodeURIComponent(pollId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function generateAiPoll(
  topic: string,
  apiKey?: string,
): Promise<{
  question: string
  description?: string
  category: string
  options: { text: string }[]
} | null> {
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: topic,
        type: 'poll',
        apiKey: apiKey?.trim() || undefined,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.poll || null
  } catch (e) {
    console.error('AI Poll generation failed:', e)
    return null
  }
}
