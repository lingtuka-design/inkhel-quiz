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

      const u = username.trim().toLowerCase()
      const p = password.trim()
      const passwordHash = await sha256(p)

      const user = await env.DB.prepare(
        'SELECT id, username, password_hash FROM admin_users WHERE username = ? COLLATE NOCASE'
      )
        .bind(u)
        .first<{ id: string; username: string; password_hash: string }>()

      const validDefaultHashes = [
        'fc3cd237022ac11687162de698acede3863826c5d1378784f97a17eb633ddd4a', // 'MAWLA1984@mala'
      ]

      const isValid =
        (user && user.password_hash === passwordHash) ||
        (user && validDefaultHashes.includes(passwordHash)) ||
        (u === 'admin' && p === 'MAWLA1984@mala')

      if (!isValid) {
        return err('Invalid username or password', 401)
      }

      const sessionToken = crypto.randomUUID()

      if (!user) {
        const id = 'admin_1'
        const now = new Date().toISOString()
        await env.DB.prepare(
          'INSERT INTO admin_users (id, username, password_hash, session_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(id, 'admin', passwordHash, sessionToken, now, now)
          .run()
      } else {
        await env.DB.prepare('UPDATE admin_users SET session_token = ?, password_hash = ? WHERE id = ?')
          .bind(sessionToken, passwordHash, user.id)
          .run()
      }

      return json({
        success: true,
        user: { id: user?.id || 'admin_1', username: 'admin' },
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
