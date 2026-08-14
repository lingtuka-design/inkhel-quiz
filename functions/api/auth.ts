import { Env, json, err, handleOptions } from './_db'

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const onRequestOptions: PagesFunction = async () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body: any = await request.json()
    const { action } = body

    if (action === 'login') {
      const { username, password } = body
      if (!username || !password) return err('Username and password are required')

      const passwordHash = await sha256(password)
      const user = await env.DB.prepare(
        'SELECT id, username, password_hash FROM admin_users WHERE username = ?'
      )
        .bind(username)
        .first<{ id: string; username: string; password_hash: string }>()

      if (!user || user.password_hash !== passwordHash) {
        return err('Invalid credentials', 401)
      }

      const sessionToken = crypto.randomUUID()
      await env.DB.prepare('UPDATE admin_users SET session_token = ? WHERE id = ?')
        .bind(sessionToken, user.id)
        .run()

      return json({
        success: true,
        user: { id: user.id, username: user.username },
        token: sessionToken,
      })
    }

    if (action === 'verify') {
      const token = body.token || request.headers.get('X-Admin-Token')
      if (!token) return json({ authenticated: false })

      const user = await env.DB.prepare('SELECT id, username FROM admin_users WHERE session_token = ?')
        .bind(token)
        .first<{ id: string; username: string }>()

      if (!user) return json({ authenticated: false })
      return json({ authenticated: true, user })
    }

    if (action === 'logout') {
      const token = body.token || request.headers.get('X-Admin-Token')
      if (token) {
        await env.DB.prepare('UPDATE admin_users SET session_token = NULL WHERE session_token = ?')
          .bind(token)
          .run()
      }
      return json({ success: true })
    }

    return err('Unknown action')
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}
