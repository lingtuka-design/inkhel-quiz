import { getParticipant } from '../services/authService'

export function detectTrafficSource(): string {
  if (typeof window === 'undefined') return 'direct'

  const params = new URLSearchParams(window.location.search)
  const ref = params.get('ref') || params.get('utm_source') || ''
  if (ref) {
    const l = ref.toLowerCase()
    if (l.includes('wa') || l.includes('whatsapp')) return 'whatsapp'
    if (l.includes('fb') || l.includes('facebook')) return 'facebook'
    if (l.includes('ig') || l.includes('instagram')) return 'instagram'
    if (l.includes('google')) return 'google'
  }

  // Detect Facebook Click ID or Instagram Click ID
  if (params.get('fbclid')) return 'facebook'
  if (params.get('igshid')) return 'instagram'

  const referrer = document.referrer.toLowerCase()
  if (referrer.includes('whatsapp') || referrer.includes('wa.me') || referrer.includes('chat.whatsapp')) {
    return 'whatsapp'
  }
  if (referrer.includes('facebook.com') || referrer.includes('fb.com') || referrer.includes('fb.me') || referrer.includes('m.facebook.com')) {
    return 'facebook'
  }
  if (referrer.includes('instagram.com') || referrer.includes('l.instagram.com')) {
    return 'instagram'
  }
  if (referrer.includes('google.com') || referrer.includes('google.co.in')) {
    return 'google'
  }
  if (referrer.includes('t.co') || referrer.includes('twitter.com') || referrer.includes('x.com')) {
    return 'twitter'
  }

  const ua = navigator.userAgent || ''
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook'
  if (/Instagram/i.test(ua)) return 'instagram'

  return 'direct'
}

export function detectDevice(): string {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'desktop'
}

export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'other'
  const ua = navigator.userAgent.toLowerCase()
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook_iab'
  if (/instagram/i.test(ua)) return 'instagram_iab'
  if (/chrome|crios/i.test(ua)) return 'chrome'
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'safari'
  return 'other'
}

let trackedThisSession = false

export function trackPageView(path: string, roundId?: string) {
  if (typeof window === 'undefined') return

  const source = detectTrafficSource()
  const device = detectDevice()
  const browser = detectBrowser()
  const participant = getParticipant()

  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'pageview',
        source,
        path,
        roundId: roundId || null,
        participantId: participant?.id || null,
        device,
        browser,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
