/**
 * Generates a sleek 1080x1080 PNG image for social media and WhatsApp sharing
 */
export async function generateScoreCardBlob({
  roundTitle,
  monthName,
  seasonName,
  playerName,
  score,
  rank,
  correct,
  totalQuestions,
  wrong,
  timeTaken,
}: {
  roundTitle: string
  monthName: string
  seasonName: string
  playerName: string
  score: number
  rank: number
  correct: number
  totalQuestions: number
  wrong: number
  timeTaken: string
}): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not initialize canvas context')

  // 1. Dark Background
  ctx.fillStyle = '#090a0f'
  ctx.fillRect(0, 0, 1080, 1080)

  // 2. Ambient Glow Gradients
  const glow1 = ctx.createRadialGradient(200, 200, 50, 200, 200, 500)
  glow1.addColorStop(0, 'rgba(124, 58, 237, 0.35)')
  glow1.addColorStop(1, 'rgba(124, 58, 237, 0)')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, 1080, 1080)

  const glow2 = ctx.createRadialGradient(880, 450, 50, 880, 450, 600)
  glow2.addColorStop(0, 'rgba(217, 70, 239, 0.25)')
  glow2.addColorStop(1, 'rgba(217, 70, 239, 0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, 1080, 1080)

  // 3. Subtle Card Container
  roundRect(ctx, 60, 60, 960, 960, 40)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.stroke()

  // 4. Header: Logo + Brand
  // Logo box
  roundRect(ctx, 110, 110, 64, 64, 18)
  const grad = ctx.createLinearGradient(110, 110, 174, 174)
  grad.addColorStop(0, '#6366f1')
  grad.addColorStop(0.5, '#a855f7')
  grad.addColorStop(1, '#ec4899')
  ctx.fillStyle = grad
  ctx.fill()

  // Bolt icon on logo
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(146, 122)
  ctx.lineTo(130, 144)
  ctx.lineTo(142, 144)
  ctx.lineTo(136, 162)
  ctx.lineTo(154, 138)
  ctx.lineTo(142, 138)
  ctx.closePath()
  ctx.fill()

  // Brand Name
  ctx.font = 'bold 38px Inter, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('Inkhel', 190, 155)

  ctx.font = '600 24px Inter, sans-serif'
  ctx.fillStyle = '#a1a1aa'
  ctx.fillText('quiz.inkhel.com', 750, 155)

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(110, 205)
  ctx.lineTo(970, 205)
  ctx.stroke()

  // 5. Round Title & Subtitle
  ctx.font = 'bold 22px Inter, sans-serif'
  ctx.fillStyle = '#c084fc'
  ctx.fillText(`${monthName.toUpperCase()} · ${seasonName.toUpperCase()}`, 110, 255)

  ctx.font = 'bold 48px Inter, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(truncateText(ctx, roundTitle, 860), 110, 315)

  // 6. Main Score Box (Big Feature)
  roundRect(ctx, 110, 365, 860, 270, 32)
  const scoreBoxGrad = ctx.createLinearGradient(110, 365, 970, 635)
  scoreBoxGrad.addColorStop(0, 'rgba(139, 92, 246, 0.20)')
  scoreBoxGrad.addColorStop(1, 'rgba(236, 72, 153, 0.10)')
  ctx.fillStyle = scoreBoxGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Player Name Tag inside box
  ctx.font = '600 26px Inter, sans-serif'
  ctx.fillStyle = '#e4e4e7'
  ctx.fillText(playerName, 150, 425)

  // Big Score
  ctx.font = 'bold 110px "Space Grotesk", Inter, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`${score}`, 150, 545)

  const scoreWidth = ctx.measureText(`${score}`).width
  ctx.font = 'bold 30px Inter, sans-serif'
  ctx.fillStyle = '#a855f7'
  ctx.fillText('POINTS', 165 + scoreWidth, 525)

  // Rank Badge (Right side of Score Box)
  roundRect(ctx, 680, 420, 240, 160, 24)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.stroke()

  ctx.font = '600 20px Inter, sans-serif'
  ctx.fillStyle = '#a1a1aa'
  ctx.fillText('ROUND RANK', 720, 465)

  ctx.font = 'bold 64px Inter, sans-serif'
  ctx.fillStyle = '#fbbf24'
  ctx.fillText(rank > 0 ? `#${rank}` : '—', 720, 540)

  // 7. Stats Grid (3 Pills)
  const statWidth = 266
  const statGap = 30
  const startX = 110
  const statY = 675
  const statH = 150

  const stats = [
    { label: 'CORRECT', val: `${correct}/${totalQuestions}`, color: '#34d399' },
    { label: 'WRONG', val: `${wrong}`, color: '#f87171' },
    { label: 'TIME TAKEN', val: `${timeTaken}`, color: '#38bdf8' },
  ]

  stats.forEach((s, i) => {
    const x = startX + i * (statWidth + statGap)
    roundRect(ctx, x, statY, statWidth, statH, 24)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.stroke()

    ctx.font = 'bold 18px Inter, sans-serif'
    ctx.fillStyle = '#a1a1aa'
    ctx.fillText(s.label, x + 24, statY + 45)

    ctx.font = 'bold 42px "Space Grotesk", Inter, sans-serif'
    ctx.fillStyle = s.color
    ctx.fillText(s.val, x + 24, statY + 105)
  })

  // 8. Footer Call to Action
  ctx.font = 'bold 28px Inter, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('Min khum thei in awm em? Han tum teh le! 🔥', 110, 890)

  ctx.font = '500 22px Inter, sans-serif'
  ctx.fillStyle = '#9333ea'
  ctx.fillText('Tap & play at: quiz.inkhel.com', 110, 930)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas blob generation failed'))
    }, 'image/png')
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.arcTo(x + width, y, x + width, y + radius, radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  ctx.lineTo(x + radius, y + height)
  ctx.arcTo(x, y + height, x, y + height - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
}
