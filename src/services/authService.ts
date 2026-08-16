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
  const trimmedUser = username.trim()
  const trimmedPass = password.trim()

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username: trimmedUser, password: trimmedPass }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token)
        const admin: AdminUser = {
          id: data.user.id,
          username: data.user.username,
          passwordHash: '',
          sessionToken: data.token,
          createdAt: nowIso(),
        }
        const db = getDb()
        db.admins = [admin]
        saveDb()
        return admin
      }
    } else {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Invalid username or password')
    }
  } catch (e: any) {
    if (e.message && e.message !== 'Failed to fetch') {
      throw e
    }
  }

  // Local/Offline Fallback
  const hash = await hashPassword(trimmedPass)
  const validHashes = [
    'fc3cd237022ac11687162de698acede3863826c5d1378784f97a17eb633ddd4a', // MAWLA1984@mala
  ]

  if (trimmedUser.toLowerCase() === 'admin' && (validHashes.includes(hash) || trimmedPass === 'MAWLA1984@mala')) {
    const sessionToken = newId('tok')
    localStorage.setItem(TOKEN_KEY, sessionToken)
    const admin: AdminUser = {
      id: 'admin_1',
      username: 'admin',
      passwordHash: hash,
      sessionToken,
      createdAt: nowIso(),
    }
    const db = getDb()
    db.admins = [admin]
    saveDb()
    return admin
  }

  throw new Error('Invalid username or password')
}

export function logoutAdmin(): void {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
      body: JSON.stringify({ action: 'logout', token }),
    }).catch(() => {})
  }
  const db = getDb()
  db.admins.forEach((a) => {
    a.sessionToken = null
  })
  saveDb()
  localStorage.removeItem(TOKEN_KEY)
}

export function getCurrentAdmin(): AdminUser | null {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const db = getDb()
  let admin = db.admins.find((a) => a.sessionToken === token)
  if (!admin && token) {
    admin = {
      id: 'admin_1',
      username: 'admin',
      passwordHash: '',
      sessionToken: token,
      createdAt: nowIso(),
    }
    db.admins = [admin]
  }
  return admin ?? null
}

export function isAdminLoggedIn(): boolean {
  return !!localStorage.getItem(TOKEN_KEY)
}

let authSubscribers: ((p: Participant | null) => void)[] = []

export function subscribeToAuth(callback: (p: Participant | null) => void): () => void {
  authSubscribers.push(callback)
  callback(getParticipant())
  return () => {
    authSubscribers = authSubscribers.filter((cb) => cb !== callback)
  }
}

function notifyAuthSubscribers(p: Participant | null) {
  authSubscribers.forEach((cb) => {
    try {
      cb(p)
    } catch {}
  })
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

// Global Firebase auth state listener: ensures users on mobile / web remain permanently logged in
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const existing = getParticipant()
    if (!existing || existing.provider !== 'google' || existing.email !== user.email) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Quiz Player'
      const email = user.email || null
      const photoUrl = user.photoURL || null
      const googleId = user.uid

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

      try {
        const res = await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            email,
            photoUrl,
            googleId,
            avatarGradient: participant.avatarGradient,
          }),
        })
        if (res.ok) {
          const serverP = await res.json()
          Object.assign(participant, serverP)
        }
      } catch {}

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
      notifyAuthSubscribers(participant)
    }
  }
})

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
  notifyAuthSubscribers(participant)
  return participant
}

export async function logoutParticipant(): Promise<void> {
  await firebaseSignOut(auth).catch(() => {})
  localStorage.removeItem(PARTICIPANT_KEY)
  localStorage.removeItem(PARTICIPANT_CACHE_KEY)
  notifyAuthSubscribers(null)
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

  // Sync to Cloudflare D1 in background
  fetch('/api/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: existing.id,
      displayName: existing.displayName,
      email: existing.email,
      photoUrl: existing.photoUrl,
      avatarGradient: existing.avatarGradient,
      provider: existing.provider,
    }),
  }).catch(() => {})

  return existing
}

export async function updateParticipantProfile(updates: { displayName?: string; phoneNumber?: string }): Promise<Participant> {
  const current = getParticipant()
  if (!current) throw new Error('Not signed in')

  const displayName = updates.displayName ? updates.displayName.trim() : current.displayName
  const phoneNumber = updates.phoneNumber !== undefined ? (updates.phoneNumber ? updates.phoneNumber.trim() : null) : current.phoneNumber

  const updated: Participant = {
    ...current,
    displayName,
    phoneNumber,
    updatedAt: nowIso(),
  }

  // Update localStorage & cache
  localStorage.setItem(PARTICIPANT_CACHE_KEY, JSON.stringify(updated))
  const db = getDb()
  const idx = db.participants.findIndex((p) => p.id === current.id)
  if (idx >= 0) db.participants[idx] = updated
  saveDb()

  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile',
        id: current.id,
        displayName,
        phoneNumber,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      localStorage.setItem(PARTICIPANT_CACHE_KEY, JSON.stringify(data))
      notifyAuthSubscribers(data)
      return data
    }
  } catch {}

  notifyAuthSubscribers(updated)
  return updated
}
