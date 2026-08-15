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

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const response = await context.next()

  // Only process HTML pages
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
      const image = round.banner_url || `${url.origin}/og-default.png`
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

      // Replace existing title and description if present
      html = html.replace(/<title>.*?<\/title>/i, '')
      html = html.replace(/<meta\s+name=["']description["'].*?>/i, '')
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
