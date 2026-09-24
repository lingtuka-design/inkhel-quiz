import { useState, useEffect } from 'react'
import { Bell, BellRing, X, Check } from 'lucide-react'

declare global {
  interface Window {
    OneSignalDeferred?: any[]
    OneSignal?: any
  }
}

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check current subscription status
    const checkStatus = () => {
      if (typeof window === 'undefined') return

      if ('Notification' in window && Notification.permission === 'granted') {
        setIsSubscribed(true)
        return
      }

      // Check dismiss count
      const dismissCount = parseInt(localStorage.getItem('inkhel_push_dismiss_count') || '0', 10)
      if (dismissCount >= 2) {
        // User dismissed twice or more, do not show automatically
        return
      }

      // Delay prompt slightly (2.5s) so page loads comfortably
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 2500)

      return () => clearTimeout(timer)
    }

    checkStatus()
  }, [])

  const handleAllow = async () => {
    try {
      setLoading(true)
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function (OneSignal: any) {
          try {
            await OneSignal.User.PushSubscription.optIn()
          } catch (e) {
            console.error('OneSignal optIn error:', e)
          }
        })
      }

      if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          setIsSubscribed(true)
          localStorage.setItem('inkhel_push_granted', 'true')
        }
      }
      setShowPrompt(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    const dismissCount = parseInt(localStorage.getItem('inkhel_push_dismiss_count') || '0', 10)
    localStorage.setItem('inkhel_push_dismiss_count', (dismissCount + 1).toString())
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative flex flex-col gap-3 rounded-2xl border border-violet-500/30 bg-ink-950/95 p-4.5 shadow-2xl backdrop-blur-xl sm:p-5">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-ink-400 transition hover:bg-white/10 hover:text-white"
          title="Tih rih loh"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
            <BellRing className="h-5 w-5 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h4 className="font-display text-sm font-bold text-white">
              Quiz thar a chhuah apianga hriat hmasak ber i duh em?
            </h4>
            <p className="text-xs text-ink-300 leading-relaxed">
              Round thar a awm veleh i phone-ah notification a lo thleng thin ang.
            </p>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-end gap-2.5">
          <button
            onClick={handleDismiss}
            className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-ink-400 transition hover:bg-white/5 hover:text-white"
          >
            Tih rih loh
          </button>
          <button
            onClick={handleAllow}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:brightness-110 active:scale-98"
          >
            <Check className="h-3.5 w-3.5" />
            Hriat duh e / Allow
          </button>
        </div>
      </div>
    </div>
  )
}

export function NotificationBellButton() {
  const [subscribed, setSubscribed] = useState(false)
  const [clicked, setClicked] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setSubscribed(true)
      }
    }
  }, [])

  const toggleNotification = async () => {
    try {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function (OneSignal: any) {
          try {
            await OneSignal.User.PushSubscription.optIn()
          } catch (e) {
            console.error('OneSignal bell error:', e)
          }
        })
      }

      if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          setSubscribed(true)
        }
      }
      setClicked(true)
      setTimeout(() => setClicked(false), 3000)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <button
      onClick={toggleNotification}
      className={`relative flex items-center justify-center rounded-xl p-2 transition-all ${
        subscribed
          ? 'text-violet-400 hover:bg-white/10'
          : 'text-ink-300 hover:bg-white/10 hover:text-white'
      }`}
      title={
        subscribed
          ? 'Notification ON a ni e (Round thar i hre ziah ang)'
          : 'Notification ON rawh (Quiz thar hriat zung zung nan)'
      }
    >
      <Bell className="h-4.5 w-4.5" />
      {subscribed ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
      ) : (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-violet-500"></span>
      )}
    </button>
  )
}
