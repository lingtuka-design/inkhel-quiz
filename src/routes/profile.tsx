import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  Gift,
  HelpCircle,
  LogOut,
  MessageCircle,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Trophy,
  User,
  Zap,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Button, Card, Input, SectionHeading, toast } from '../components/ui'
import { getParticipant, logoutParticipant, updateParticipantProfile } from '../services/authService'
import { setPageTitle } from '../services/shareService'

export function ProfilePage() {
  const navigate = useNavigate()
  const participant = getParticipant()

  const [displayName, setDisplayName] = useState(participant?.displayName || '')
  const [phoneNumber, setPhoneNumber] = useState(participant?.phoneNumber || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPageTitle('My Profile & Prize Details')
    window.scrollTo({ top: 0 })
    if (participant) {
      setDisplayName(participant.displayName || '')
      setPhoneNumber(participant.phoneNumber || '')
    }
  }, [participant?.id])

  // Fetch participant personal gameplay stats from API
  const { data: profileStats } = useQuery({
    queryKey: ['participantStats', participant?.id],
    queryFn: async () => {
      if (!participant?.id) return null
      const res = await fetch(`/api/participants?id=${participant.id}`)
      if (res.ok) return res.json()
      return null
    },
    enabled: !!participant?.id,
  })

  if (!participant) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <User className="mx-auto h-12 w-12 text-ink-300" />
        <h1 className="font-display text-2xl font-bold text-white">Sign In Required</h1>
        <p className="text-sm text-ink-300">
          I profile leh prize lakna tur phone number update turin Google hmangin lo sign in hmasa rawh le.
        </p>
        <Link to="/">
          <Button variant="primary">Go to Home</Button>
        </Link>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateParticipantProfile({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
      })
      toast('✅ Profile & Phone number saved successfully!', 'success')
    } catch (err: any) {
      toast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logoutParticipant()
    toast('Signed out', 'info')
    navigate({ to: '/' })
  }

  const hasPhone = Boolean(participant.phoneNumber && participant.phoneNumber.trim().length >= 10)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Player Profile</h1>
        <p className="mt-1 text-sm text-ink-300">
          I account details, gameplay stats, leh lawmman (Prize) lakna tur contact information.
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={participant.displayName}
              gradient={participant.avatarGradient}
              photoUrl={participant.photoUrl}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-white">{participant.displayName}</h2>
                {participant.provider === 'google' && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    <ShieldCheck className="h-3 w-3" /> Verified Google
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-300">{participant.email || 'No email connected'}</p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={LogOut}
            onClick={handleLogout}
            className="border-white/10 text-ink-300 hover:border-red-500/30 hover:text-red-300"
          >
            Sign Out
          </Button>
        </div>
      </Card>

      {/* Prize / Phone Number Setting Card */}
      <Card className="p-6 sm:p-8 space-y-6 border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-950/40">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Prize Winner Contact Details</h2>
            <p className="mt-0.5 text-xs text-ink-300 leading-relaxed">
              September thla atanga thla tin lawmman <b>(Monthly Prize ₹2,000)</b> i dawn theih nan leh GPay / PhonePe / WhatsApp-a biak pawh zung zung theih nan i Phone number lo dah rawh le. (August hi Trial period a ni e).
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-300 mb-1.5">
              Player / Display Name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name / Nickname"
              required
              className="bg-black/30"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-300">
                Phone Number (WhatsApp / GPay)
              </label>
              {hasPhone ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Phone Saved
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-400 animate-pulse">
                  ⚠️ Phone number a la awm lo
                </span>
              )}
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
                <Phone className="h-4 w-4" />
              </div>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 9862000000"
                className="pl-9 bg-black/30 font-mono tracking-wider"
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-400">
              * He phone number hi Admin-in lawmman sem dawnah chiah che an rawn be dawn che a ni.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              loading={saving}
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold"
            >
              Save Profile & Phone Number
            </Button>
          </div>
        </form>
      </Card>

      {/* Quick Gameplay Summary */}
      <Card className="p-6">
        <h3 className="font-display text-base font-bold text-white mb-4">Your Quiz Performance</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-ink-300">Total Points</p>
            <p className="mt-1 font-display text-2xl font-bold text-emerald-400">
              {profileStats?.totalPoints ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-ink-300">Rounds Played</p>
            <p className="mt-1 font-display text-2xl font-bold text-violet-400">
              {profileStats?.roundsPlayed ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-ink-300">Best Score</p>
            <p className="mt-1 font-display text-2xl font-bold text-amber-400">
              {profileStats?.bestScore ?? 0} pts
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <p className="text-xs text-ink-300">Current Rank</p>
            <p className="mt-1 font-display text-2xl font-bold text-sky-400">
              #{profileStats?.rank ?? '—'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
