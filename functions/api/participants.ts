import { Env, json, err, handleOptions, toCamelCase } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const googleId = url.searchParams.get('googleId')
    const list = url.searchParams.get('list') === 'true' || (!id && !googleId)

    if (id || googleId) {
      const participant = await env.DB.prepare(
        `SELECT 
            p.*,
            COUNT(DISTINCT a.id) as rounds_played,
            COALESCE(SUM(a.final_score), 0) as total_points,
            COALESCE(MAX(a.final_score), 0) as best_score,
            COALESCE(SUM(a.correct_answers), 0) as total_correct,
            MAX(a.completed_at) as last_played_at
         FROM participants p
         LEFT JOIN attempts a ON p.id = a.participant_id AND (a.status = 'completed' OR a.status = 'expired')
         WHERE p.id = ? OR p.google_id = ?
         GROUP BY p.id`
      )
        .bind(id || '', googleId || '')
        .first<any>()

      if (!participant) return err('Participant not found', 404)

      // Calculate global rank
      let rank = 1
      if (participant.total_points > 0) {
        const rankRow = await env.DB.prepare(
          `SELECT COUNT(*) + 1 as rank FROM (
             SELECT p.id, SUM(a.final_score) as pts
             FROM participants p
             JOIN attempts a ON p.id = a.participant_id AND a.status = 'completed'
             GROUP BY p.id
             HAVING pts > ?
           )`
        )
          .bind(participant.total_points)
          .first<{ rank: number }>()
        if (rankRow) rank = rankRow.rank
      }

      return json({
        ...toCamelCase(participant),
        rank,
      })
    }

    const summary = url.searchParams.get('summary') === 'true'
    if (summary) {
      const stats = await env.DB.prepare(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN provider = 'google' THEN 1 ELSE 0 END) as google_count,
            SUM(CASE WHEN provider = 'guest' THEN 1 ELSE 0 END) as guest_count
         FROM participants`
      ).first<any>()

      return json({
        total: stats?.total || 0,
        googleCount: stats?.google_count || 0,
        guestCount: stats?.guest_count || 0,
      }, 200, { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=60' })
    }

    if (list) {
      const { results: participants } = await env.DB.prepare(
        `SELECT 
            p.*,
            COALESCE(a.rounds_played, 0) as rounds_played,
            COALESCE(a.total_points, 0) as total_points,
            COALESCE(a.best_score, 0) as best_score,
            a.last_played_at
         FROM participants p
         LEFT JOIN (
           SELECT 
             participant_id,
             COUNT(*) as rounds_played,
             SUM(final_score) as total_points,
             MAX(final_score) as best_score,
             MAX(completed_at) as last_played_at
           FROM attempts
           WHERE status IN ('completed', 'expired')
           GROUP BY participant_id
         ) a ON a.participant_id = p.id
         ORDER BY p.created_at DESC`
      ).all<any>()

      const total = participants.length
      const googleCount = participants.filter((p) => p.provider === 'google').length
      const guestCount = participants.filter((p) => p.provider === 'guest').length

      return json({
        total,
        googleCount,
        guestCount,
        participants: toCamelCase(participants),
      }, 200, { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=30' })
    }

    return err('id, googleId or list parameter required')
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body: any = await request.json()
    const { id: reqId, action, displayName, email, phoneNumber, photoUrl, googleId, avatarGradient } = body
    const now = new Date().toISOString()

    // 1. Action: Direct Profile update (Phone number, Display Name)
    if ((action === 'update_profile' || action === 'update') && reqId) {
      const name = displayName ? displayName.trim() : null
      const phone = phoneNumber !== undefined ? (phoneNumber ? phoneNumber.trim() : null) : null

      await env.DB.prepare(
        `UPDATE participants SET
          display_name = COALESCE(?, display_name),
          phone_number = ?,
          updated_at = ?
         WHERE id = ?`
      )
        .bind(name, phone, now, reqId)
        .run()

      const updated = await env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(reqId).first()
      return json(toCamelCase(updated))
    }

    if (!displayName || !displayName.trim()) return err('displayName is required')
    const name = displayName.trim()

    // 2. Google login / Registration
    if (googleId || email) {
      let existing = null
      if (googleId) {
        existing = await env.DB.prepare('SELECT * FROM participants WHERE google_id = ?').bind(googleId).first<any>()
      }
      if (!existing && email) {
        existing = await env.DB.prepare('SELECT * FROM participants WHERE email = ?').bind(email).first<any>()
      }

      if (existing) {
        // Update profile
        await env.DB.prepare(
          `UPDATE participants SET
            display_name = ?,
            photo_url = COALESCE(?, photo_url),
            google_id = COALESCE(?, google_id),
            phone_number = COALESCE(?, phone_number),
            provider = 'google',
            updated_at = ?
           WHERE id = ?`
        )
          .bind(name, photoUrl || null, googleId || null, phoneNumber ? phoneNumber.trim() : null, now, existing.id)
          .run()

        const updated = await env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(existing.id).first()
        return json(toCamelCase(updated))
      }

      // Create or update Google participant
      const id = reqId || `part_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const avatar = avatarGradient || `avatar_${Math.floor(Math.random() * 8) + 1}`

      await env.DB.prepare(
        `INSERT INTO participants (id, display_name, email, phone_number, photo_url, google_id, avatar_gradient, provider, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'google', ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           display_name = excluded.display_name,
           photo_url = COALESCE(excluded.photo_url, participants.photo_url),
           google_id = COALESCE(excluded.google_id, participants.google_id),
           phone_number = COALESCE(excluded.phone_number, participants.phone_number),
           updated_at = excluded.updated_at`
      )
        .bind(id, name, email || null, phoneNumber ? phoneNumber.trim() : null, photoUrl || null, googleId || null, avatar, now, now)
        .run()

      const created = await env.DB.prepare('SELECT * FROM participants WHERE (email = ? AND email IS NOT NULL) OR id = ?')
        .bind(email || id, id)
        .first()
      return json(toCamelCase(created))
    }

    // Guest fallback
    const existing = await env.DB.prepare('SELECT * FROM participants WHERE display_name = ? COLLATE NOCASE')
      .bind(name)
      .first<any>()

    if (existing) {
      return json(toCamelCase(existing))
    }

    const id = `part_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const avatar = avatarGradient || `avatar_${Math.floor(Math.random() * 8) + 1}`

    await env.DB.prepare(
      'INSERT INTO participants (id, display_name, email, avatar_gradient, provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(id, name, email || null, avatar, 'guest', now, now)
      .run()

    const created = await env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(id).first()
    return json(toCamelCase(created))
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}
