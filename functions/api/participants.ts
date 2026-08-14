import { Env, json, err, handleOptions, toCamelCase } from './_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return err('id parameter required')

    const participant = await env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(id).first()
    if (!participant) return err('Participant not found', 404)

    return json(toCamelCase(participant))
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body: any = await request.json()
    const { displayName, email, avatarGradient } = body
    if (!displayName || !displayName.trim()) return err('displayName is required')

    const name = displayName.trim()
    const now = new Date().toISOString()

    // Check if participant already exists by name
    const existing = await env.DB.prepare('SELECT * FROM participants WHERE display_name = ? COLLATE NOCASE')
      .bind(name)
      .first()

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
