import { Env, json, err, handleOptions } from '../_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body: any = await request.json()
    const { pollId, participantId, optionId } = body

    if (!pollId || !participantId || !optionId) {
      return err('pollId, participantId, and optionId are required', 400)
    }

    // 1. Verify poll exists and is active
    const poll = await env.DB.prepare('SELECT id, status, options FROM polls WHERE id = ?')
      .bind(pollId)
      .first<any>()

    if (!poll) {
      return err('Poll not found', 404)
    }

    if (poll.status !== 'active') {
      return err('This poll is closed for voting', 400)
    }

    // 2. Verify option exists in poll
    let rawOptions: any[] = []
    try {
      rawOptions = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options
    } catch {
      rawOptions = []
    }

    const validOption = rawOptions.some((o: any) => o.id === optionId)
    if (!validOption) {
      return err('Invalid option selected', 400)
    }

    // 3. Verify participant exists
    const participant = await env.DB.prepare('SELECT id FROM participants WHERE id = ?')
      .bind(participantId)
      .first<{ id: string }>()

    if (!participant) {
      return err('Please log in with Google to cast your vote', 401)
    }

    // 4. Check if already voted
    const existingVote = await env.DB.prepare(
      'SELECT id, option_id FROM poll_votes WHERE poll_id = ? AND participant_id = ?'
    )
      .bind(pollId, participantId)
      .first<{ id: string; option_id: string }>()

    if (existingVote) {
      return json({
        success: false,
        alreadyVoted: true,
        userVotedOptionId: existingVote.option_id,
        message: 'You have already voted in this poll',
      })
    }

    // 5. Insert vote
    const voteId = `pvote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()

    await env.DB.prepare(
      `INSERT INTO poll_votes (id, poll_id, participant_id, option_id, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(voteId, pollId, participantId, optionId, now)
      .run()

    // Increment poll total_votes
    await env.DB.prepare('UPDATE polls SET total_votes = total_votes + 1, updated_at = ? WHERE id = ?')
      .bind(now, pollId)
      .run()

    // 6. Return updated vote stats
    const { results: voteStats } = await env.DB.prepare(
      'SELECT option_id, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_id'
    )
      .bind(pollId)
      .all<{ option_id: string; count: number }>()

    const voteMap = new Map<string, number>()
    let totalVotes = 0
    for (const vs of voteStats) {
      voteMap.set(vs.option_id, vs.count)
      totalVotes += vs.count
    }

    const optionsWithStats = rawOptions.map((opt: any) => {
      const votes = voteMap.get(opt.id) || 0
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
      return {
        ...opt,
        votes,
        percentage,
      }
    })

    // Sort by highest votes on top
    optionsWithStats.sort((a: any, b: any) => b.votes - a.votes)

    return json({
      success: true,
      pollId,
      userVotedOptionId: optionId,
      hasVoted: true,
      totalVotes,
      options: optionsWithStats,
    })
  } catch (e: any) {
    return err(e.message || 'Failed to cast vote', 500)
  }
}
