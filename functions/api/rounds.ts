import { Env, json, err, handleOptions, verifyAdmin, toCamelCase } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const slug = url.searchParams.get('slug')
    const monthId = url.searchParams.get('monthId')
    const all = url.searchParams.get('all') === 'true'

    if (id || slug) {
      const query = id ? 'SELECT * FROM rounds WHERE id = ?' : 'SELECT * FROM rounds WHERE slug = ?'
      const param = id || slug
      const round = await env.DB.prepare(query).bind(param).first()
      if (!round) return err('Round not found', 404)

      // get question count
      const qCount = await env.DB.prepare('SELECT COUNT(*) as count FROM questions WHERE round_id = ?')
        .bind((round as any).id)
        .first<{ count: number }>()

      return json({
        ...toCamelCase(round),
        questionCount: qCount?.count || 0,
      })
    }

    if (monthId) {
      const { results: rounds } = await env.DB.prepare(
        `SELECT r.*, COUNT(q.id) as question_count, COUNT(DISTINCT a.id) as participant_count
         FROM rounds r
         LEFT JOIN questions q ON r.id = q.round_id
         LEFT JOIN attempts a ON r.id = a.round_id AND a.status != 'abandoned'
         WHERE r.month_id = ?
         GROUP BY r.id
         ORDER BY r.created_at ASC`
      )
        .bind(monthId)
        .all()
      return json(toCamelCase(rounds))
    }

    // Default: return all rounds with question_count
    const { results: rounds } = await env.DB.prepare(
      `SELECT r.*, COUNT(q.id) as question_count, COUNT(DISTINCT a.id) as participant_count
       FROM rounds r
       LEFT JOIN questions q ON r.id = q.round_id
       LEFT JOIN attempts a ON r.id = a.round_id AND a.status != 'abandoned'
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    ).all()

    return json(toCamelCase(rounds))
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const isAdmin = await verifyAdmin(request, env.DB)
    if (!isAdmin) return err('Unauthorized', 401)

    const body: any = await request.json()
    const { action } = body
    const now = new Date().toISOString()

    if (action === 'create') {
      const { monthId, title, description, bannerGradient, bannerIcon, bannerUrl, timeLimitSeconds = 300 } = body
      if (!monthId || !title) return err('monthId and title are required')

      const roundId = `round_${Date.now()}`
      const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      let slug = baseSlug || roundId

      // Ensure slug uniqueness
      const existing = await env.DB.prepare('SELECT id FROM rounds WHERE slug = ?').bind(slug).first()
      if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

      await env.DB.prepare(
        `INSERT INTO rounds (id, month_id, title, slug, description, banner_gradient, banner_icon, banner_url, time_limit_seconds, status, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL, ?, ?)`
      )
        .bind(
          roundId,
          monthId,
          title,
          slug,
          description || '',
          bannerGradient || 'aurora',
          bannerIcon || 'Zap',
          bannerUrl || null,
          timeLimitSeconds,
          now,
          now,
        )
        .run()

      return json({ success: true, id: roundId, slug })
    }

    if (action === 'update') {
      const { id, title, description, bannerGradient, bannerIcon, bannerUrl, timeLimitSeconds, status } = body
      if (!id) return err('Round ID is required')

      const publishedAt = status === 'published' ? now : null

      await env.DB.prepare(
        `UPDATE rounds SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          banner_gradient = COALESCE(?, banner_gradient),
          banner_icon = COALESCE(?, banner_icon),
          banner_url = COALESCE(?, banner_url),
          time_limit_seconds = COALESCE(?, time_limit_seconds),
          status = COALESCE(?, status),
          published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END,
          updated_at = ?
         WHERE id = ?`
      )
        .bind(
          title,
          description,
          bannerGradient,
          bannerIcon,
          bannerUrl !== undefined ? bannerUrl : null,
          timeLimitSeconds,
          status,
          status,
          publishedAt,
          now,
          id,
        )
        .run()

      return json({ success: true })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) return err('Round ID is required')

      // Cascade delete questions, options, attempt_answers, attempts, and round
      await env.DB.prepare('DELETE FROM rounds WHERE id = ?').bind(id).run()
      return json({ success: true })
    }

    return err('Unknown action')
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}
