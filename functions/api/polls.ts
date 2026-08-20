import { Env, json, err, handleOptions, verifyAdmin } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export interface PollOptionRaw {
  id: string
  text: string
  imageUrl?: string
}

export interface PollOptionResult extends PollOptionRaw {
  votes: number
  percentage: number
}

// 1. GET /api/polls?id=...&participantId=...&status=active
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const pollId = url.searchParams.get('id')
    const participantId = url.searchParams.get('participantId')
    const status = url.searchParams.get('status') || 'active'
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    let sql = 'SELECT * FROM polls'
    const params: any[] = []

    if (pollId) {
      sql += ' WHERE id = ?'
      params.push(pollId)
    } else if (status !== 'all') {
      sql += ' WHERE status = ?'
      params.push(status)
    }

    sql += ' ORDER BY featured DESC, created_at DESC LIMIT ?'
    params.push(limit)

    const { results: pollRows } = await env.DB.prepare(sql).bind(...params).all<any>()

    if (pollId && (!pollRows || pollRows.length === 0)) {
      return err('Poll not found', 404)
    }

    // Process each poll with live computed vote counts & percentages
    const polls = await Promise.all(
      pollRows.map(async (row: any) => {
        let rawOptions: PollOptionRaw[] = []
        try {
          rawOptions = typeof row.options === 'string' ? JSON.parse(row.options) : row.options
        } catch {
          rawOptions = []
        }

        // Get votes grouped by option
        const { results: voteStats } = await env.DB.prepare(
          'SELECT option_id, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_id'
        )
          .bind(row.id)
          .all<{ option_id: string; count: number }>()

        const voteMap = new Map<string, number>()
        let totalVotes = 0
        for (const vs of voteStats) {
          voteMap.set(vs.option_id, vs.count)
          totalVotes += vs.count
        }

        // Check if current participant voted
        let userVotedOptionId: string | null = null
        if (participantId) {
          const userVote = await env.DB.prepare(
            'SELECT option_id FROM poll_votes WHERE poll_id = ? AND participant_id = ?'
          )
            .bind(row.id, participantId)
            .first<{ option_id: string }>()

          if (userVote) {
            userVotedOptionId = userVote.option_id
          }
        }

        // Build option results
        const optionsWithStats: PollOptionResult[] = rawOptions.map((opt) => {
          const votes = voteMap.get(opt.id) || 0
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
          return {
            ...opt,
            votes,
            percentage,
          }
        })

        // If user already voted or poll is closed, sort options dynamically by highest votes on top!
        if (userVotedOptionId || row.status === 'closed') {
          optionsWithStats.sort((a, b) => b.votes - a.votes)
        }

        return {
          id: row.id,
          question: row.question,
          description: row.description || '',
          bannerUrl: row.banner_url || '',
          category: row.category || 'football',
          status: row.status || 'active',
          featured: row.featured === 1,
          totalVotes,
          userVotedOptionId,
          hasVoted: !!userVotedOptionId,
          options: optionsWithStats,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      })
    )

    if (pollId) {
      return json(polls[0])
    }

    return json(polls)
  } catch (e: any) {
    return err(e.message || 'Failed to fetch polls', 500)
  }
}

// 2. POST /api/polls (Create or Update Poll - Admin)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const isAdmin = await verifyAdmin(request, env.DB)
    if (!isAdmin) return err('Unauthorized', 401)

    const body: any = await request.json()
    const {
      id,
      question,
      description = '',
      bannerUrl = '',
      options = [],
      category = 'football',
      status = 'active',
      featured = 1,
    } = body

    if (!question || !question.trim()) {
      return err('Poll question is required')
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return err('At least 2 options are required for a poll')
    }

    // Format options with IDs
    const sanitizedOptions: PollOptionRaw[] = options.map((opt: any, idx: number) => ({
      id: opt.id || `opt_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
      text: (opt.text || '').trim(),
      imageUrl: opt.imageUrl ? opt.imageUrl.trim() : undefined,
    }))

    const pollId = id || `poll_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()
    const optionsJson = JSON.stringify(sanitizedOptions)

    await env.DB.prepare(
      `INSERT INTO polls (id, question, description, banner_url, options, category, status, featured, total_votes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         question = excluded.question,
         description = excluded.description,
         banner_url = excluded.banner_url,
         options = excluded.options,
         category = excluded.category,
         status = excluded.status,
         featured = excluded.featured,
         updated_at = excluded.updated_at`
    )
      .bind(pollId, question.trim(), description, bannerUrl.trim(), optionsJson, category, status, featured ? 1 : 0, now, now)
      .run()

    return json({ success: true, id: pollId })
  } catch (e: any) {
    return err(e.message || 'Failed to save poll', 500)
  }
}

// 3. DELETE /api/polls?id=... (Delete Poll - Admin)
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const isAdmin = await verifyAdmin(request, env.DB)
    if (!isAdmin) return err('Unauthorized', 401)

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return err('Poll ID is required')

    await env.DB.prepare('DELETE FROM poll_votes WHERE poll_id = ?').bind(id).run()
    await env.DB.prepare('DELETE FROM polls WHERE id = ?').bind(id).run()

    return json({ success: true, message: 'Poll deleted' })
  } catch (e: any) {
    return err(e.message || 'Failed to delete poll', 500)
  }
}
