export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`inkhel::${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function uid(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 13)
      : Math.random().toString(36).slice(2, 15)
  return `${prefix}_${rnd}`
}
