import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Calendar, CalendarClock, Clock, Lock, Play, ShieldAlert, Trophy, Users, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RoundBanner, ShareButtons, roundStatusBadge } from '../components/rounds'
import { Podium, LeaderboardTable } from '../components/leaderboard'
import { Badge, Button, Card, SectionHeading, toast } from '../components/ui'
import { getRound, countParticipants, countQuestions, roundAvailability } from '../services/roundService'
import { getMonth } from '../services/monthService'
import { getSeason } from '../services/seasonService'
import { getRoundLeaderboard } from '../services/leaderboardService'
import { hasCompletedRound } from '../services/attemptService'
import { getParticipant, loginWithGoogle } from '../services/authService'
import { GoogleIcon } from '../components/layout'
import { setPageTitle, setMetaDescription } from '../services/shareService'
import { formatDate, formatTime } from '../lib/utils'

export function RoundDetailPage() {
  const { roundId } = useParams({ strict: false })
  const navigate = useNavigate()
  const [participant, setParticipant] = useState(() => getParticipant())
  const [signingIn, setSigningIn] = useState(false)

  const { data: round } = useQuery({
    queryKey: ['round', roundId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/rounds?id=${encodeURIComponent(roundId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.id) return data
        }
      } catch {}
      return getRound(roundId)
    },
  })

  const { data: month } = useQuery({
    queryKey: ['month', round?.monthId],
    queryFn: async () => {
      if (!round?.monthId) return null
      try {
        const res = await fetch('/api/seasons')
        if (res.ok) {
          const data = await res.json()
          for (const s of data) {
            if (Array.isArray(s.months)) {
              const m = s.months.find((x: any) => x.id === round.monthId)
              if (m) return m
            }
          }
        }
      } catch {}
      return getMonth(round.monthId)
    },
    enabled: !!round,
  })

  const { data: season } = useQuery({
    queryKey: ['season', month?.seasonId],
    queryFn: async () => {
      if (!month?.seasonId) return null
      try {
        const res = await fetch(`/api/seasons?id=${encodeURIComponent(month.seasonId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.id) return data
        }
      } catch {}
      return getSeason(month.seasonId)
    },
    enabled: !!month,
  })

  const { data: stats } = useQuery({
    queryKey: ['roundStats', roundId, round?.questionCount],
    queryFn: () => ({
      participants: (round as any)?.participantCount ?? countParticipants(roundId),
      questions: (round as any)?.questionCount ?? countQuestions(roundId),
    }),
    enabled: !!round,
  })

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', roundId],
    queryFn: () =>
      getRoundLeaderboard(roundId, {
        currentParticipantId: participant?.id ?? null,
      }),
    enabled: !!round,
  })

  const { data: alreadyPlayed } = useQuery({
    queryKey: ['played', roundId, participant?.id],
    queryFn: () => (participant ? hasCompletedRound(participant.id, roundId) : false),
    enabled: !!round && !!participant,
  })

  useEffect(() => {
    if (round) {
      setPageTitle(round.title)
      setMetaDescription(round.description)
    }
  }, [round])

  if (!round) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-white">Round not found</h1>
        <Link to="/rounds" className="mt-4 inline-block text-violet-400 hover:text-violet-300">
          Browse all rounds
        </Link>
      </div>
    )
  }

  const badge = roundStatusBadge(round)
  const availability = roundAvailability(round)
  const open = availability.open
  const minutes = Math.round(round.timeLimitSeconds / 60)
  const monthWindow =
    month && open ? `Closes ${formatDate(month.endDate)}` : month ? `${formatDate(month.startDate)} — ${formatDate(month.endDate)}` : ''

  const isGoogleUser = participant?.provider === 'google'

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true)
      const p = await loginWithGoogle()
      setParticipant(p)
      toast(`Welcome, ${p.displayName}! You can now play.`, 'success')
      navigate({ to: `/rounds/${round.id}/quiz` })
    } catch (err: any) {
      toast(err.message || 'Google sign-in failed', 'error')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div>
      <div className="relative">
        <RoundBanner round={round} className="h-56 sm:h-72" iconSize="h-24 w-24" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
      </div>

      <div className="mx-auto -mt-24 max-w-5xl px-4 sm:px-6">
        <div className="relative">
          <Link
            to="/rounds"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> All rounds
          </Link>

          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={badge.tone}>{badge.label}</Badge>
              <Badge tone="violet">
                <Calendar className="h-3.5 w-3.5" /> {month?.name}
              </Badge>
              <Badge tone="slate">
                <Trophy className="h-3.5 w-3.5" /> {season?.name}
              </Badge>
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              {round.title}
            </h1>
            <p className="mt-3 max-w-2xl text-ink-300">{round.description}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Zap, label: 'Questions', value: String(stats?.questions ?? 0) },
                { icon: Clock, label: 'Time limit', value: `${minutes} min` },
                { icon: Users, label: 'Players', value: String(stats?.participants ?? 0) },
                { icon: Trophy, label: 'Top score', value: String(leaderboard?.[0]?.score ?? '—') },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                  <s.icon className="mb-2 h-4 w-4 text-violet-400" />
                  <p className="font-display text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-ink-300">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {open ? (
                alreadyPlayed ? (
                  <Button variant="secondary" icon={Trophy} disabled>
                    You've played this round
                  </Button>
                ) : !isGoogleUser ? (
                  <Button
                    className="w-full sm:w-auto"
                    size="lg"
                    onClick={handleGoogleSignIn}
                    loading={signingIn}
                  >
                    <GoogleIcon className="mr-2 h-5 w-5" /> Sign in with Google to Play
                  </Button>
                ) : (
                  <Link to={`/rounds/${round.id}/quiz`} className="sm:w-auto w-full">
                    <Button className="w-full" size="lg" icon={Play}>
                      Start Round
                    </Button>
                  </Link>
                )
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
                  <Lock className="h-4 w-4" />
                  {availability.reason === 'month-closed'
                    ? `This round closed when ${month?.name} ended.`
                    : availability.reason === 'month-upcoming'
                      ? `This round opens with ${month?.name}.`
                      : 'This round is not open for play.'}
                </div>
              )}
              {monthWindow && (
                <div className="text-sm text-ink-300">
                  <p className="flex items-center gap-1.5 font-medium text-amber-300">
                    <CalendarClock className="h-4 w-4" />
                    {monthWindow}
                  </p>
                  {open && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-300">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Once started, the round timer cannot be paused.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-white/5 pt-5">
              <ShareButtons round={round} />
            </div>
          </Card>
        </div>

        <section className="mt-12">
          <SectionHeading
            eyebrow="Round leaderboard"
            title="Fastest minds, top scores"
            subtitle={`Live results for ${round.title} — updated after every attempt.`}
          />
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-6">
              <Podium rows={leaderboard.slice(0, 3)} />
              <LeaderboardTable rows={leaderboard.slice(0, 10)} />
            </div>
          ) : (
            <Card className="p-10 text-center text-sm text-ink-300">
              No scores yet. Be the first to take the crown.
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
