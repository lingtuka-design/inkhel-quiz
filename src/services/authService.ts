import { getDb, saveDb, newId } from '../db/database'
import { hashPassword } from '../lib/crypto'
import { avatarGradient } from '../lib/banners'
import { nowIso } from '../lib/utils'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth'
import type { AdminUser, Participant } from '../types'

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

export async function loginWithGoogle(): Promise<Participant> {
  const result = await signInWithPopup(auth, googleProvider)
  const user = result.user
  const displayName = user.displayName || user.email?.split('@')[0] || 'Quiz Player'
  const email = user.email || null
  const photoUrl = user.photoURL || null
  const googleId = user.uid

  let participant: Participant

  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        email,
        photoUrl,
        googleId,
        avatarGradient: avatarGradient(displayName),
      }),
    })

    if (res.ok) {
      participant = await res.json()
    } else {
      throw new Error('Failed to register participant on server')
    }
  } catch {
    // Local / offline fallback
    participant = {
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
  }

  // Update local DB cache
  const db = getDb()
  const idx = db.participants.findIndex((p) => p.id === participant.id || p.email === email)
  if (idx >= 0) {
    db.participants[idx] = participant
  } else {
    db.participants.push(participant)
  }
  saveDb()

  localStorage.setItem(PARTICIPANT_KEY, participant.id)
  localStorage.setItem(PARTICIPANT_CACHE_KEY, JSON.stringify(participant))
  return participant
}

export async function logoutParticipant(): Promise<void> {
  await firebaseSignOut(auth).catch(() => {})
  localStorage.removeItem(PARTICIPANT_KEY)
  localStorage.removeItem(PARTICIPANT_CACHE_KEY)
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
  localStorage.setItem(PARTICIPANT_CACHE_KEY, JSON.stringify(existing))
  return existing
}
