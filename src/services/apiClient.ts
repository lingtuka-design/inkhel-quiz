const D1_TOKEN_KEY = 'inkhel_admin_d1_token'

export function getD1Token(): string | null {
  return localStorage.getItem(D1_TOKEN_KEY)
}

export function setD1Token(token: string | null): void {
  if (token) localStorage.setItem(D1_TOKEN_KEY, token)
  else localStorage.removeItem(D1_TOKEN_KEY)
}

let lastWarn = 0

function logFailure(what: string): void {
  const now = Date.now()
  if (now - lastWarn > 30_000) {
    lastWarn = now
    console.warn(`[inkhel] Cloud API unavailable (${what}) — using local data`)
  }
}

export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    logFailure(path)
    return null
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const token = getD1Token()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (token) headers['X-Admin-Token'] = token
    const res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    logFailure(path)
    return null
  }
}
