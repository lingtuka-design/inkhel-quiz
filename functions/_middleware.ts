interface Env {
  DB: D1Database
}

function escapeHtml(str: string) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Facebook Android in-app browser: "...Android...FBAV/437.0.0..."
// Instagram Android in-app browser: "...Android...Instagram 302.0.0..."
const IAB_ANDROID_RE = /Android/i
const FACEBOOK_APP_RE = /FBAV\/[\d.]+/i
const INSTAGRAM_APP_RE = /Instagram \d+/i
const ASSET_EXT_RE = /\.(js|css|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|map|json|webmanifest|xml|txt)([?#]|$)/i

/**
 * One-tap escape hatch for the Facebook/Instagram Android in-app browser.
 * Meta deliberately blocks silent intent:// redirects (its own confirmation
 * modal appears), so this page auto-fires the intent once and offers a big
 * fallback button. Users who ignore both still land on the site normally —
 * the page links through.
 */
function interstitialHtml(url: URL): string {
  const full = `${url.origin}${url.pathname}${url.search}`
  const target = full.replace(/^https?:\/\//, '')
  const intent = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Open in Chrome — Inkhel Quiz</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0a0a16;color:#fff;
       display:flex;flex-direction:column;align-items:center;justify-content:center;
       min-height:100vh;margin:0;padding:24px;text-align:center}
  .logo{width:64px;height:64px;border-radius:16px;margin-bottom:20px;
        background:linear-gradient(135deg,#6366f1,#d946ef);
        display:flex;align-items:center;justify-content:center}
  h1{font-size:1.4rem;margin:0 0 10px}
  p{color:#a6a6cd;font-size:.95rem;max-width:340px;line-height:1.55;margin:0 0 6px}
  button{margin-top:22px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:0;
         padding:16px 36px;border-radius:14px;font-size:1.05rem;font-weight:700;cursor:pointer}
  a{display:inline-block;margin-top:14px;color:#8b8ba8;font-size:.9rem}
  .hint{margin-top:30px;font-size:.8rem;color:#8b8ba8}
</style>
</head>
<body>
<div class="logo"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill="#fff"/></svg></div>
<h1>Opening in Chrome…</h1>
<p>If a confirmation appears, tap <b>Continue</b> — that's the one tap
   Facebook allows before handing the link to your full browser.</p>
<button id="go">Open in Chrome</button>
<a href="${escapeHtml(full)}">Continue inside this browser instead</a>
<p class="hint">Manual way: tap ⋮ (top right) → “Open in external browser”.</p>
<script>
  var intent = ${JSON.stringify(intent)};
  function go() {
    try { window.location.href = intent; } catch (e) {}
  }
  // Some WebView versions only honour intent:// after a user gesture, which
  // is why the button exists. Fire once anyway for the versions that allow it.
  setTimeout(go, 600);
  document.getElementById('go').addEventListener('click', function (e) {
    e.preventDefault();
    go();
  });
</script>
</body>
</html>`
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const ua = context.request.headers.get('User-Agent') ?? ''
  const accept = context.request.headers.get('Accept') ?? ''

  // ---------- 0. Serve ads.txt directly ----------
  if (url.pathname === '/ads.txt') {
    return new Response('google.com, pub-2343866392435128, DIRECT, f08c47fec0942fa0\n', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }

  // ---------- 1. Facebook / Instagram Android in-app browser escape ----------
  const isAndroidIab =
    context.request.method === 'GET' &&
    IAB_ANDROID_RE.test(ua) &&
    (FACEBOOK_APP_RE.test(ua) || INSTAGRAM_APP_RE.test(ua)) &&
    accept.includes('text/html') &&
    !url.pathname.startsWith('/api/') &&
    !ASSET_EXT_RE.test(url.pathname)

  if (isAndroidIab) {
    return new Response(interstitialHtml(url), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  }

  // ---------- 2. Dynamic Open Graph tags for round pages ----------
  const response = await context.next()

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  const match = url.pathname.match(/^\/rounds\/([^\/]+)/)
  if (!match || match[1] === 'new') {
    return response
  }

  const roundId = match[1]

  try {
    const round = await context.env.DB.prepare(
      'SELECT title, description, banner_url, banner_gradient FROM rounds WHERE id = ? OR slug = ?'
    )
      .bind(roundId, roundId)
      .first<{ title: string; description: string; banner_url: string; banner_gradient: string }>()

    if (round) {
      const title = `${round.title} — Inkhel Quiz`
      const desc = round.description || 'Beat the clock, answer fast, and climb the season leaderboard on Inkhel!'

      // Social platforms require an ABSOLUTE og:image URL. Rounds may store a
      // relative banner path (R2) — resolve it against the origin. When there
      // is no banner, generate a branded card on the fly.
      const rawBanner = round.banner_url || ''
      const image = rawBanner.startsWith('http')
        ? rawBanner
        : `${url.origin}${rawBanner.startsWith('/') ? rawBanner : `/api/og?roundId=${encodeURIComponent(roundId)}`}`
      const pageUrl = `${url.origin}/rounds/${roundId}`

      let html = await response.text()

      const metaTags = `
    <!-- Dynamic Open Graph / WhatsApp / Facebook Meta Tags -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Inkhel Quiz" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="675" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
      `

      // Remove the existing title/description AND any static og/twitter tags so
      // the round-specific values above are the only ones crawlers see.
      html = html.replace(/<title>.*?<\/title>/i, '')
      html = html.replace(/<meta\s+name=["']description["'].*?>/i, '')
      html = html.replace(/<meta\s+(?:property|name)=["'](?:og|twitter):[^"']*["'][^>]*>/gi, '')
      html = html.replace('</head>', `${metaTags}\n  </head>`)

      return new Response(html, {
        headers: response.headers,
        status: response.status,
      })
    }
  } catch (e) {
    // If DB query fails, continue with standard response
  }

  return response
}
