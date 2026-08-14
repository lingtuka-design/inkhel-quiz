import { Env, json, err, handleOptions, toCamelCase } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const googleId = url.searchParams.get('googleId')

    if (id) {
      const participant = await env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(id).first()
      if (!participant) return err('Participant not found', 404)
      return json(toCamelCase(participant))
    }

    if (googleId) {
      const participant = await env.DB.prepare('SELECT * FROM participants WHERE google_id = ?').bind(googleId).first()
      if (!participant) return json({ participant: null })
      return json(toCamelCase(participant))
    }

    return err('id or googleId parameter required')
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body: any = await request.json()
    const { displayName, email, photoUrl, googleId, avatarGradient } = body
    if (!displayName || !displayName.trim()) return err('displayName is required')

    const name = displayName.trim()
    const now = new Date().toISOString()

    // If Google login
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
            provider = 'google',
            updated_at = ?
           WHERE id = ?`
        )
          .bind(name, photoUrl || null, googleId || null, now, existing.id)
          .run()

        const updated = await env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(existing.id).first()
        return json(toCamelCase(updated))
      }

      // Create new Google participant
      const id = `part_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const avatar = avatarGradient || `avatar_${Math.floor(Math.random() * 8) + 1}`

      await env.DB.prepare(
        `INSERT INTO participants (id, display_name, email, photo_url, google_id, avatar_gradient, provider, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'google', ?, ?)`
      )
        .bind(id, name, email || null, photoUrl || null, googleId || null, avatar, now, now)
        .run()

      const created = await env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(id).first()
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
