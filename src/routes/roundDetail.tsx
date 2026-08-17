import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Calendar, CalendarClock, Clock, Lock, Play, ShieldAlert, Trophy, Users, Zap } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RoundBanner, ShareButtons, roundStatusBadge } from '../components/rounds'
import { Podium, LeaderboardTable } from '../components/leaderboard'
import { Badge, Button, Card, SectionHeading, toast } from '../components/ui'
import { getRound, countParticipants, countQuestions, roundAvailability } from '../services/roundService'
import { getMonth } from '../services/monthService'
import { getRoundLeaderboard } from '../services/leaderboardService'
import { checkParticipantAttempt, hasCompletedRound } from '../services/attemptService'
import { getParticipant, useCurrentUser, loginWithGoogle } from '../services/authService'
import { GoogleIcon } from '../components/layout'
import { setPageTitle, setMetaDescription } from '../services/shareService'
import { formatDate, formatTime } from '../lib/utils'

export function RoundDetailPage() {
  const { roundId } = useParams({ strict: false })
  const navigate = useNavigate()
  const participant = useCurrentUser()
  const [signingIn, setSigningIn] = useState(false)
  const queryClient = useQueryClient()

  const { data: round, isLoading: roundLoading } = useQuery({
    queryKey: ['round', roundId],
    initialData: () => {
      const playable = queryClient.getQueryData<any[]>(['rounds', 'playable'])
      const match = playable?.find((x) => (x.round?.id === roundId ? x.round : x.id === roundId))
      if (match) return match.round || match
      return getRound(roundId) || undefined
    },
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

  const month = round?.monthId ? getMonth(round.monthId) : null

  const { data: stats } = useQuery({
    queryKey: ['roundStats', roundId, round?.questionCount],
    queryFn: () => ({
      participants: (round as any)?.participantCount ?? countParticipants(roundId),
      questions: (round as any)?.questionCount ?? countQuestions(roundId),
    }),
    enabled: !!roundId,
  })

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', roundId],
    queryFn: () =>
      getRoundLeaderboard(roundId, {
        currentParticipantId: participant?.id ?? null,
      }),
    enabled: !!roundId,
  })

  const { data: userAttempt } = useQuery({
    queryKey: ['userRoundAttempt', roundId, participant?.id, participant?.email],
    queryFn: async () => {
      if (!participant?.id && !participant?.email) return null
      try {
        const params = new URLSearchParams({ roundId })
        if (participant?.id) params.set('participantId', participant.id)
        if (participant?.email) params.set('email', participant.email)
        if (participant?.googleId) params.set('googleId', participant.googleId)

        const res = await fetch(`/api/attempts?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.attempt) return data.attempt
        }
      } catch {}
      return participant ? checkParticipantAttempt(participant.id, roundId) : null
    },
    enabled: !!roundId && !!(participant?.id || participant?.email),
  })

  const alreadyPlayed = userAttempt ? (userAttempt.status === 'completed' || userAttempt.status === 'expired') : false

  useEffect(() => {
    if (round) {
      setPageTitle(round.title)
      setMetaDescription(round.description)
    }
  }, [round])

  if (roundLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        <p className="mt-3 text-sm text-ink-300">Loading round details...</p>
      </div>
    )
  }

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
      toast(`Welcome, ${p.displayName}! You can now play.`, 'success')
      navigate({ to: `/rounds/${round.id}/quiz` })
    } catch (err: any) {
      toast(err.message || 'Google sign-in failed', 'error')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Cinematic Blurred Ambient Backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden">
        {round.bannerUrl ? (
          <img
            src={round.bannerUrl}
            alt=""
            className="h-full w-full object-cover blur-3xl scale-125 opacity-30"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-violet-600/20 via-indigo-600/10 to-transparent blur-3xl" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/80 to-ink-950" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-6 pb-12 sm:px-6">
        <Link
          to="/rounds"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All rounds
        </Link>

        {/* Focused Hero 16:9 Banner Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-violet-950/40">
          <RoundBanner
            round={round}
            className="aspect-[16/9] sm:aspect-[21/9] max-h-[380px] w-full"
            iconSize="h-24 w-24"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
        </div>

        {/* Floating Detail Card */}
        <div className="relative -mt-12 sm:-mt-16 mx-2 sm:mx-6">
          <Card className="p-6 sm:p-8 backdrop-blur-xl border-white/15 shadow-2xl shadow-black/80">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={badge.tone}>{badge.label}</Badge>
              {month?.name && (
                <Badge tone="violet">
                  <Calendar className="h-3.5 w-3.5" /> {month.name}
                </Badge>
              )}
              <Badge tone="green">
                <Trophy className="h-3.5 w-3.5" /> Monthly Tournament
              </Badge>
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              {round.title}
            </h1>
            <p className="mt-3 max-w-2xl text-ink-300 leading-relaxed">{round.description}</p>

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
                alreadyPlayed && userAttempt ? (
                  <Link to={`/rounds/${round.id}/result?attemptId=${userAttempt.id}`} className="sm:w-auto w-full">
                    <Button
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-950/40"
                      size="lg"
                      icon={Trophy}
                    >
                      View Your Result ({userAttempt.finalScore} pts) →
                    </Button>
                  </Link>
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
            <div>
              <LeaderboardTable rows={leaderboard.slice(0, 20)} />
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
