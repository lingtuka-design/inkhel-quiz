import { Env, json, err, handleOptions, verifyAdmin, toCamelCase } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id) {
      const season = await env.DB.prepare('SELECT * FROM seasons WHERE id = ?').bind(id).first()
      if (!season) return err('Season not found', 404)
      const { results: months } = await env.DB.prepare(
        'SELECT * FROM months WHERE season_id = ? ORDER BY month_number ASC'
      )
        .bind(id)
        .all()

      return json({
        ...toCamelCase(season),
        months: toCamelCase(months),
      })
    }

    const { results: seasons } = await env.DB.prepare(
      'SELECT * FROM seasons ORDER BY season_number DESC, created_at DESC'
    ).all()

    const { results: months } = await env.DB.prepare(
      'SELECT * FROM months ORDER BY month_number ASC'
    ).all()

    const monthMap: Record<string, any[]> = {}
    for (const m of months) {
      const sid = (m as any).season_id
      if (!monthMap[sid]) monthMap[sid] = []
      monthMap[sid].push(toCamelCase(m))
    }

    const fullSeasons = seasons.map((s: any) => ({
      ...toCamelCase(s),
      months: monthMap[s.id] || [],
    }))

    return json(fullSeasons)
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
      const { id, name, description, durationMonths = 10, startDate } = body
      if (!name || !startDate) return err('Name and startDate are required')

      const start = new Date(startDate)
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + durationMonths, 0, 23, 59, 59, 999))
      
      const { results: existing } = await env.DB.prepare('SELECT MAX(season_number) as max_num FROM seasons').all()
      const seasonNumber = (((existing[0] as any)?.max_num || 0) + 1)
      const seasonId = id || `season_${Date.now()}`

      // Create season
      await env.DB.prepare(
        `INSERT INTO seasons (id, name, description, season_number, duration_months, start_date, end_date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
      )
        .bind(seasonId, name, description || '', seasonNumber, durationMonths, start.toISOString(), end.toISOString(), now, now)
        .run()

      // Generate months
      for (let i = 0; i < durationMonths; i++) {
        const mStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
        const mEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i + 1, 0, 23, 59, 59, 999))
        const monthName = mStart.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        const monthId = `${seasonId}_m${i + 1}`

        await env.DB.prepare(
          `INSERT INTO months (id, season_id, month_number, name, start_date, end_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(monthId, seasonId, i + 1, monthName, mStart.toISOString(), mEnd.toISOString(), now, now)
          .run()
      }

      return json({ success: true, id: seasonId })
    }

    if (action === 'update') {
      const { id, name, description, status } = body
      if (!id) return err('Season ID is required')

      if (status === 'active') {
        // Set other active seasons to completed
        await env.DB.prepare("UPDATE seasons SET status = 'completed' WHERE status = 'active' AND id != ?")
          .bind(id)
          .run()
      }

      await env.DB.prepare(
        `UPDATE seasons SET name = COALESCE(?, name), description = COALESCE(?, description),
         status = COALESCE(?, status), updated_at = ? WHERE id = ?`
      )
        .bind(name, description, status, now, id)
        .run()

      return json({ success: true })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) return err('Season ID is required')

      const { results: months } = await env.DB.prepare('SELECT id FROM months WHERE season_id = ?')
        .bind(id)
        .all<any>()
      const mIds = months.map((m) => `'${m.id}'`).join(',')
      if (mIds) {
        const { results: rounds } = await env.DB.prepare(
          `SELECT id FROM rounds WHERE month_id IN (${mIds})`
        ).all<any>()
        const rIds = rounds.map((r) => `'${r.id}'`).join(',')
        if (rIds) {
          const { results: questions } = await env.DB.prepare(
            `SELECT id FROM questions WHERE round_id IN (${rIds})`
          ).all<any>()
          const qIds = questions.map((q) => `'${q.id}'`).join(',')
          if (qIds) {
            await env.DB.prepare(`DELETE FROM question_options WHERE question_id IN (${qIds})`).run()
            await env.DB.prepare(`DELETE FROM questions WHERE id IN (${qIds})`).run()
          }
          const { results: attempts } = await env.DB.prepare(
            `SELECT id FROM attempts WHERE round_id IN (${rIds})`
          ).all<any>()
          const aIds = attempts.map((a) => `'${a.id}'`).join(',')
          if (aIds) {
            await env.DB.prepare(`DELETE FROM attempt_answers WHERE attempt_id IN (${aIds})`).run()
            await env.DB.prepare(`DELETE FROM attempts WHERE id IN (${aIds})`).run()
          }
          await env.DB.prepare(`DELETE FROM rounds WHERE id IN (${rIds})`).run()
        }
        await env.DB.prepare(`DELETE FROM months WHERE id IN (${mIds})`).run()
      }
      await env.DB.prepare('DELETE FROM seasons WHERE id = ?').bind(id).run()

      return json({ success: true })
    }

    return err('Unknown action')
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}
