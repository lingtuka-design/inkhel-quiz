import { getDb, saveDb, newId } from '../db/database'
import { hashPassword } from '../lib/crypto'
import { avatarGradient } from '../lib/banners'
import { nowIso } from '../lib/utils'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import type { AdminUser, Participant } from '../types'
import { apiPost, setD1Token, getD1Token } from './apiClient'
import { bootstrapD1IfEmpty } from './cloudBootstrap'

const TOKEN_KEY = 'inkhel_admin_token'
const PARTICIPANT_KEY = 'inkhel_participant_id'
const PARTICIPANT_CACHE_KEY = 'inkhel_participant_cache'

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

  // Best-effort: also authenticate against the shared Cloudflare D1 backend so
  // admin content (seasons, rounds, questions) can be mirrored to all users.
  try {
    const remote = await apiPost<{ success: boolean; token?: string }>('/api/auth', {
      action: 'login',
      username,
      password,
    })
    if (remote?.token) {
      setD1Token(remote.token)
      void bootstrapD1IfEmpty()
    } else {
      setD1Token(null)
      console.warn(
        '[inkhel] D1 admin login failed — content will stay local-only until D1 credentials match',
      )
    }
  } catch {
    setD1Token(null)
  }
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
  const d1Token = getD1Token()
  if (d1Token) void apiPost('/api/auth', { action: 'logout', token: d1Token })
  localStorage.removeItem(TOKEN_KEY)
  setD1Token(null)
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
  const raw = localStorage.getItem(PARTICIPANT_CACHE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Participant
    } catch {
      // ignore
    }
  }
  const id = localStorage.getItem(PARTICIPANT_KEY)
  if (!id) return null
  return getDb().participants.find((p) => p.id === id) ?? null
}

function persistParticipant(p: Participant): Participant {
  const db = getDb()
  const idx = db.participants.findIndex((x) => x.id === p.id)
  if (idx >= 0) db.participants[idx] = p
  else db.participants.push(p)
  saveDb()
  localStorage.setItem(PARTICIPANT_KEY, p.id)
  localStorage.setItem(PARTICIPANT_CACHE_KEY, JSON.stringify(p))
  return p
}

export async function loginWithGoogle(): Promise<Participant> {
  const result = await signInWithPopup(auth, googleProvider)
  const user = result.user
  const displayName = user.displayName || user.email?.split('@')[0] || 'Quiz Player'
  const email = user.email || null
  const photoUrl = user.photoURL || null
  const googleId = user.uid

  // Register the Google profile on the shared D1 backend (best-effort).
  const remote = await apiPost<Participant>('/api/participants', {
    displayName,
    email,
    photoUrl,
    googleId,
    avatarGradient: avatarGradient(displayName),
  })
  if (remote?.id && remote.displayName) {
    return persistParticipant(remote)
  }

  // Local / offline fallback
  const participant: Participant = {
    id: `part_${googleId.slice(0, 10)}`,
    displayName,
    email,
    photoUrl,
    googleId,
    avatarGradient: avatarGradient(displayName),
    provider: 'google',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  return persistParticipant(participant)
}

export async function logoutParticipant(): Promise<void> {
  await firebaseSignOut(auth).catch(() => {})
  localStorage.removeItem(PARTICIPANT_KEY)
  localStorage.removeItem(PARTICIPANT_CACHE_KEY)
}

/**
 * Creates (or finds) the player's shared identity. Guest players are upserted
 * to the Cloudflare D1 backend (matched by display name) so their attempts and
 * scores appear on every user's leaderboard. Falls back to local when offline.
 */
export async function saveParticipant(displayName: string): Promise<Participant> {
  const db = getDb()
  const trimmed = displayName.trim().slice(0, 40)
  if (!trimmed) throw new Error('Please enter a player name')

  const remote = await apiPost<Participant>('/api/participants', {
    displayName: trimmed,
    avatarGradient: getParticipant()?.avatarGradient ?? avatarGradient(trimmed),
  })
  if (remote?.id && remote.displayName) {
    return persistParticipant(remote)
  }

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
  localStorage.setItem(PARTICIPANT_CACHE_KEY, JSON.stringify(existing))
  return existing
}
