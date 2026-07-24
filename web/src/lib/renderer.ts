import type { GenomeFeature, ParsedGenome } from './genomeTypes'
import type { Viewport } from './viewport'
import { bpPerPixel } from './viewport'

const trackHeight = 20
const margin = 8

export function renderGenome(ctx: CanvasRenderingContext2D, genome: ParsedGenome, view: Viewport): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const bpp = bpPerPixel(view)
  const forward = genome.features.filter((f) => f.strand === 'forward')
  const reverse = genome.features.filter((f) => f.strand === 'reverse')

  drawTrack(ctx, forward, view, bpp, margin, '#2d7')
  drawTrack(ctx, reverse, view, bpp, margin + trackHeight + margin, '#d55')

  if (bpp <= 1.5) {
    drawFrames(ctx, genome, view, margin + 3 * (trackHeight + margin))
  }
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  features: GenomeFeature[],
  view: Viewport,
  bpp: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color
  for (const feature of features) {
    if (feature.end < view.start || feature.start > view.end) continue
    const x = (feature.start - view.start) / bpp
    const w = Math.max(1, (feature.end - feature.start) / bpp)
    ctx.fillRect(x, y, w, trackHeight)
  }
}

function drawFrames(ctx: CanvasRenderingContext2D, genome: ParsedGenome, view: Viewport, yStart: number): void {
  ctx.font = '11px monospace'
  const rows = genome.frames
  for (let i = 0; i < rows.length; i++) {
    const isReverse = i >= 3
    const offset = i % 3
    const y = yStart + i * 14
    const codonStart = Math.floor(view.start / 3)
    const codonEnd = Math.ceil(view.end / 3)
    const frame = rows[i]
    for (let c = codonStart; c < codonEnd && c < frame.length; c++) {
      const aa = frame[c]
      const genomicPos = c * 3 + offset
      if (genomicPos < view.start || genomicPos > view.end) continue
      const x = ((genomicPos - view.start) / (view.end - view.start)) * ctx.canvas.width
      ctx.fillStyle = aa === '*' ? '#f33' : isReverse ? '#666' : '#222'
      ctx.fillText(aa, x, y)
    }
  }
}
