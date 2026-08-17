import { getParticipant } from '../services/authService'

export function detectTrafficSource(): string {
  if (typeof window === 'undefined') return 'direct'

  // Check if already captured in this session
  const stored = sessionStorage.getItem('inkhel_traffic_source')
  if (stored) return stored

  const params = new URLSearchParams(window.location.search)
  const href = window.location.href.toLowerCase()
  const ref = params.get('ref') || params.get('utm_source') || ''

  let detected = 'direct'

  // 1. Explicit parameter check (including fbclid)
  if (params.get('fbclid') || href.includes('fbclid=') || params.get('ref') === 'fb') {
    detected = 'facebook'
  } else if (params.get('igshid') || href.includes('igshid=') || params.get('ref') === 'ig') {
    detected = 'instagram'
  } else if (ref) {
    const l = ref.toLowerCase()
    if (l.includes('wa') || l.includes('whatsapp')) detected = 'whatsapp'
    else if (l.includes('fb') || l.includes('facebook')) detected = 'facebook'
    else if (l.includes('ig') || l.includes('instagram')) detected = 'instagram'
    else if (l.includes('google')) detected = 'google'
  } else {
    // 2. Referrer check
    const referrer = document.referrer.toLowerCase()
    if (referrer.includes('whatsapp') || referrer.includes('wa.me') || referrer.includes('chat.whatsapp')) {
      detected = 'whatsapp'
    } else if (referrer.includes('facebook.com') || referrer.includes('fb.com') || referrer.includes('fb.me') || referrer.includes('m.facebook.com') || referrer.includes('l.facebook.com')) {
      detected = 'facebook'
    } else if (referrer.includes('instagram.com') || referrer.includes('l.instagram.com')) {
      detected = 'instagram'
    } else if (referrer.includes('google.com') || referrer.includes('google.co.in')) {
      detected = 'google'
    } else if (referrer.includes('t.co') || referrer.includes('twitter.com') || referrer.includes('x.com')) {
      detected = 'twitter'
    } else {
      // 3. In-App User-Agent check
      const ua = navigator.userAgent || ''
      if (/FBAN|FBAV|FB_IAB/i.test(ua)) detected = 'facebook'
      else if (/Instagram/i.test(ua)) detected = 'instagram'
    }
  }

  // Store in session so subsequent page views retain the attribution
  try {
    sessionStorage.setItem('inkhel_traffic_source', detected)
  } catch {}

  return detected
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
