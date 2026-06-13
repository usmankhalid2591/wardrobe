// Renders a saved outfit as a shareable image card using the Canvas API.
// Kept dependency-free — draws directly using the app's "atelier ledger" palette.

const COLORS = {
  ink: '#1a1714',
  inkSoft: '#423b34',
  paper: '#ece5d8',
  paperRaised: '#f5efe3',
  paperLine: '#d8cdb8',
  oxblood: '#6e2a2a',
  muted: '#8a7f6e',
}

const WIDTH = 1080
const PAD = 64

function wrapLines(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function layout(ctx, outfit) {
  const contentWidth = WIDTH - PAD * 2
  const pieces = outfit.pieces || []
  let y = PAD

  y += 8 // top rule
  y += 70 // title
  y += 34 // date
  y += 30 // divider gap

  const laidPieces = pieces.map(p => {
    let h = 30 // role label
    h += 44 // item name
    let whyLines = []
    if (p.why) {
      ctx.font = '19px Georgia, serif'
      whyLines = wrapLines(ctx, p.why, contentWidth)
      h += whyLines.length * 26 + 4
    }
    h += 30 // gap + divider
    y += h
    return { ...p, whyLines, h }
  })

  let noteLines = []
  if (outfit.note) {
    ctx.font = 'italic 21px Georgia, serif'
    noteLines = wrapLines(ctx, outfit.note, contentWidth)
    y += 36 + noteLines.length * 28
  }

  y += 56 // footer
  y += PAD

  return { height: Math.ceil(y), laidPieces, noteLines, contentWidth }
}

export async function renderOutfitCard(outfit) {
  if (document.fonts?.ready) {
    try { await document.fonts.ready } catch { /* ignore */ }
  }

  // Measuring pass on a throwaway context.
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  const { height, laidPieces, noteLines, contentWidth } = layout(measureCtx, outfit)

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = COLORS.paper
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Outer rule
  ctx.strokeStyle = COLORS.paperLine
  ctx.lineWidth = 2
  ctx.strokeRect(PAD / 2, PAD / 2, canvas.width - PAD, canvas.height - PAD)

  let y = PAD + 8

  // Title (occasion)
  ctx.fillStyle = COLORS.ink
  ctx.font = '500 52px Fraunces, Georgia, serif'
  ctx.textBaseline = 'alphabetic'
  let title = outfit.occasion || 'Outfit'
  // Shrink title if it doesn't fit on one line
  while (ctx.measureText(title).width > contentWidth && ctx.font !== '500 28px Fraunces, Georgia, serif') {
    const sizeMatch = ctx.font.match(/(\d+)px/)
    const size = sizeMatch ? Math.max(28, Number(sizeMatch[1]) - 4) : 28
    ctx.font = `500 ${size}px Fraunces, Georgia, serif`
    if (size === 28) break
  }
  y += 50
  ctx.fillText(title, PAD, y)

  // Date
  y += 34
  ctx.fillStyle = COLORS.muted
  ctx.font = '13px "IBM Plex Mono", monospace'
  const dateStr = outfit.created_at
    ? new Date(outfit.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  ctx.fillText(dateStr ? `Saved ${dateStr}` : 'The Wardrobe', PAD, y)

  // Divider
  y += 18
  ctx.strokeStyle = COLORS.paperLine
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(canvas.width - PAD, y)
  ctx.stroke()
  y += 30

  // Pieces
  laidPieces.forEach(p => {
    ctx.fillStyle = COLORS.muted
    ctx.font = '12px "IBM Plex Mono", monospace'
    ctx.fillText((p.role || '').toUpperCase(), PAD, y)
    y += 38

    ctx.fillStyle = COLORS.ink
    ctx.font = '500 30px Fraunces, Georgia, serif'
    ctx.fillText(p.item || '', PAD, y)
    y += 8

    if (p.whyLines.length) {
      ctx.fillStyle = COLORS.inkSoft
      ctx.font = '19px Georgia, serif'
      p.whyLines.forEach(line => {
        y += 26
        ctx.fillText(line, PAD, y)
      })
    }

    y += 22
    ctx.strokeStyle = COLORS.paperLine
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(canvas.width - PAD, y)
    ctx.stroke()
    y += 8
  })

  // Note
  if (noteLines.length) {
    y += 28
    ctx.fillStyle = COLORS.inkSoft
    ctx.font = 'italic 21px Georgia, serif'
    noteLines.forEach(line => {
      ctx.fillText(line, PAD, y)
      y += 28
    })
  }

  // Footer
  ctx.fillStyle = COLORS.oxblood
  ctx.font = '13px "IBM Plex Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('— THE WARDROBE —', canvas.width / 2, canvas.height - PAD / 2 - 8)
  ctx.textAlign = 'left'

  return canvas
}

export async function downloadOutfitCard(outfit) {
  const canvas = await renderOutfitCard(outfit)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not generate image.')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = (outfit.occasion || 'outfit').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  a.href = url
  a.download = `${slug || 'outfit'}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
