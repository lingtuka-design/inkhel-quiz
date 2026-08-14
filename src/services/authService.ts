import { getDb, saveDb, newId } from '../db/database'
import { hashPassword } from '../lib/crypto'
import { avatarGradient } from '../lib/banners'
import { nowIso } from '../lib/utils'
import type { AdminUser, Participant } from '../types'

const TOKEN_KEY = 'inkhel_admin_token'
const PARTICIPANT_KEY = 'inkhel_participant_id'

export async function loginAdmin(username: string, password: string): Promise<AdminUser> {
  const db = getDb()
  const admin = db.admins.find(
    (a) => a.username.toLowerCase() === username.trim().toLowerCase(),
  )
  if (!admin) {
    await hashPassword(password)
    throw new Error('Invalid username or password')
  }
  const hash = await hashPassword(password)
  if (hash !== admin.passwordHash) throw new Error('Invalid username or password')
  admin.sessionToken = newId('tok')
  saveDb()
  localStorage.setItem(TOKEN_KEY, admin.sessionToken)
  return admin
}

export function logoutAdmin(): void {
  const db = getDb()
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    const admin = db.admins.find((a) => a.sessionToken === token)
    if (admin) {
      admin.sessionToken = null
      saveDb()
    }
  }
  localStorage.removeItem(TOKEN_KEY)
}

export function getCurrentAdmin(): AdminUser | null {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  return getDb().admins.find((a) => a.sessionToken === token) ?? null
}

export function isAdminLoggedIn(): boolean {
  return getCurrentAdmin() !== null
}

export function getParticipant(): Participant | null {
  const id = localStorage.getItem(PARTICIPANT_KEY)
  if (!id) return null
  return getDb().participants.find((p) => p.id === id) ?? null
}

export function saveParticipant(displayName: string): Participant {
  const db = getDb()
  const trimmed = displayName.trim().slice(0, 40)
  if (!trimmed) throw new Error('Please enter a player name')
  let existing = getParticipant()
  if (existing) {
    existing.displayName = trimmed
    existing.updatedAt = nowIso()
  } else {
    existing = {
      id: newId('part'),
      displayName: trimmed,
      email: null,
      avatarGradient: avatarGradient(trimmed),
      provider: 'guest',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    db.participants.push(existing)
  }
  saveDb()
  localStorage.setItem(PARTICIPANT_KEY, existing.id)
  return existing
}
