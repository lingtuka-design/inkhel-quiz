import { Resvg, initWasm } from '@resvg/resvg-wasm'
import wasmBinary from '@resvg/resvg-wasm/index_bg.wasm'
import { Env } from './_db'

const FONT_URLS = [
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/Inter%5Bopsz,wght%5D.ttf',
  'https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Bold.ttf',
]

let fontBuffer: ArrayBuffer | null = null
let wasmReady: Promise<void> | null = null

async function ensureWasm(): Promise<void> {
  if (!wasmReady) wasmReady = initWasm(wasmBinary)
  await wasmReady
}

async function ensureFont(): Promise<void> {
  if (fontBuffer) return
  for (const url of FONT_URLS) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        fontBuffer = await res.arrayBuffer()
        return
      }
    } catch {
      // try next URL
    }
  }
}

const GRADIENTS: Record<string, [string, string]> = {
  aurora: ['#6366f1', '#d946ef'],
  ocean: ['#06b6d4', '#2563eb'],
  fire: ['#f97316', '#e11d48'],
  forest: ['#10b981', '#0891b2'],
  sunset: ['#fbbf24', '#ec4899'],
  royal: ['#8b5cf6', '#c026d3'],
  night: ['#475569', '#312e81'],
  gold: ['#facc15', '#ea580c'],
  film: ['#f43f5e', '#f97316'],
  heritage: ['#8b5cf6', '#2563eb'],
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length > maxChars && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
    if (lines.length === maxLines - 1 && line.length > maxChars - 1) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length > 0 && (words.join(' ').length > lines.join(' ').length)) {
    lines[maxLines - 1] = lines[maxLines - 1]!.replace(/\s+\S*$/, '') + '…'
  }
  return lines.slice(0, maxLines)
}

function buildSvg(opts: {
  title: string
  subtitle: string
  gradientId: string
  roundLabel?: string
}): string {
  const [g1, g2] = GRADIENTS[opts.gradientId] ?? GRADIENTS['aurora']!
  const titleLines = wrapText(opts.title, 22, 3)
  const subLines = wrapText(opts.subtitle, 62, 2)
  const titleY = opts.roundLabel ? 258 : 236

  const titleText = titleLines
    .map((l, i) => `<text x="64" y="${titleY + i * 82}" font-family="Inter, sans-serif" font-size="64" font-weight="700" fill="#ffffff">${esc(l)}</text>`)
    .join('')

  const subText = subLines
    .map((l, i) => `<text x="66" y="${titleY + titleLines.length * 82 + 30 + i * 40}" font-family="Inter, sans-serif" font-size="28" fill="#a6a6cd">${esc(l)}</text>`)
    .join('')

  const labelText = opts.roundLabel
    ? `<text x="64" y="196" font-family="Inter, sans-serif" font-size="26" font-weight="600" letter-spacing="6" fill="${g1}">${esc(opts.roundLabel.toUpperCase())}</text>`
    : ''

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a16"/>
      <stop offset="100%" stop-color="#131328"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${g1}"/>
      <stop offset="100%" stop-color="${g2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="85%" cy="8%" r="65%">
      <stop offset="0%" stop-color="${g1}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${g1}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="64" y="64" width="64" height="64" rx="16" fill="url(#accent)"/>
  <path d="M106 76 88 112h12l-5 16 22-33h-12z" fill="#ffffff"/>
  <text x="148" y="106" font-family="Inter, sans-serif" font-size="34" font-weight="700" letter-spacing="5" fill="#a6a6cd">INKHEL</text>
  ${labelText}
  ${titleText}
  ${subText}
  <line x1="64" y1="556" x2="1136" y2="556" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
  <text x="64" y="596" font-family="Inter, sans-serif" font-size="22" letter-spacing="3" fill="#8b8ba8">BEAT THE CLOCK. OWN THE LEADERBOARD.</text>
  <text x="1136" y="596" font-family="Inter, sans-serif" font-size="22" text-anchor="end" fill="#8b8ba8">inkhel.quiz</text>
</svg>`
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const roundId = url.searchParams.get('roundId') || ''

  let title = 'Beat the clock. Own the leaderboard.'
  let subtitle = 'The competitive quiz platform — new rounds every month.'
  let gradientId = 'aurora'
  let roundLabel: string | undefined

  if (pollId) {
    try {
      const poll = await env.DB.prepare(
        'SELECT question, description FROM polls WHERE id = ?'
      )
        .bind(pollId)
        .first<{ question: string; description: string }>()

      if (poll) {
        title = poll.question
        subtitle = poll.description || 'I vote hlu tak han pe ve teh! Vantlang ngaihdan & fan voting.'
        gradientId = 'royal'
        roundLabel = 'Opinion Poll'
      }
    } catch {}
  } else if (roundId) {
    try {
      const round = await env.DB.prepare(
        'SELECT title, description, banner_gradient FROM rounds WHERE id = ?'
      )
        .bind(roundId)
        .first<{ title: string; description: string; banner_gradient: string }>()

      if (round) {
        title = round.title
        subtitle = round.description || 'Play this round before the month ends.'
        gradientId = round.banner_gradient || 'aurora'
        roundLabel = 'Quiz Round'
      }
    } catch {
      // fall back to the generic card
    }
  }

  await ensureWasm()
  await ensureFont()

  const resvg = new Resvg(buildSvg({ title, subtitle, gradientId, roundLabel }), {
    fitTo: { mode: 'original' },
    font: {
      fontFiles: fontBuffer ? [new Uint8Array(fontBuffer)] : [],
      loadSystemFonts: false,
      defaultFontFamily: 'Inter',
    },
  })

  const png = resvg.render().asPng()

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
