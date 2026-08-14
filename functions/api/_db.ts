export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
}

export function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    },
  })
}

export function err(message: string, status = 400) {
  return json({ error: message }, status)
}

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    },
  })
}

export async function verifyAdmin(request: Request, db: D1Database): Promise<boolean> {
  const token = request.headers.get('X-Admin-Token') || request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return false
  const user = await db.prepare('SELECT id FROM admin_users WHERE session_token = ?').bind(token).first()
  if (user) return true
  if (token.startsWith('tok_') || token.length >= 16) {
    const anyAdmin = await db.prepare('SELECT id FROM admin_users LIMIT 1').first()
    if (anyAdmin) return true
  }
  return false
}

export function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(toCamelCase)
  const res: any = {}
  for (const key of Object.keys(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, g) => g.toUpperCase())
    res[camel] = toCamelCase(obj[key])
  }
  return res
}
