import type { FeatureDto, GenomeRecordDto, TranslationDto } from './genomeTypes'
import { bpPerPixel, genomeToScreen, type GenomeViewport } from './viewport'

export interface HitRegion { featureId: number; x: number; y: number; width: number; height: number }
export interface RenderResult { hitRegions: HitRegion[]; height: number }
export interface RenderState {
  selectedFeatureId?: number
  showLabels: boolean
  showStarts: boolean
  translation?: TranslationDto
}

export const RENDER_CONFIG = {
  margin: 38,
  rulerHeight: 28,
  featureHeight: 22,
  rowHeight: 18,
  baseThreshold: 1.6,
  labelMinimumPixels: 50,
} as const

export function rulerStep(basesPerPixel: number, minimumPixels = 70): number {
  const target = basesPerPixel * minimumPixels
  const power = 10 ** Math.floor(Math.log10(Math.max(1, target)))
  return [1, 2, 5, 10].map((factor) => factor * power).find((step) => step >= target) ?? power * 10
}

export function featureGeometry(feature: FeatureDto, view: GenomeViewport, y: number) {
  return feature.parts.map((part) => ({
    x: genomeToScreen(part.start, view),
    width: Math.max(2, genomeToScreen(part.end, view) - genomeToScreen(part.start, view)),
    y,
    height: RENDER_CONFIG.featureHeight,
  }))
}

export function hitTest(regions: HitRegion[], x: number, y: number): number | undefined {
  return [...regions].reverse().find((region) =>
    x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height,
  )?.featureId
}

export function renderGenome(
  context: CanvasRenderingContext2D,
  genome: GenomeRecordDto,
  viewport: GenomeViewport,
  state: RenderState,
): RenderResult {
  const highZoom = bpPerPixel(viewport) <= RENDER_CONFIG.baseThreshold
  const height = highZoom ? 260 : 112
  context.clearRect(0, 0, viewport.width, height)
  context.fillStyle = '#fff'
  context.fillRect(0, 0, viewport.width, height)
  drawRuler(context, viewport)
  const hits = [
    ...drawFeatures(context, genome, viewport, state, RENDER_CONFIG.rulerHeight, 1),
    ...drawFeatures(context, genome, viewport, state, highZoom ? 226 : 68, -1),
  ]
  if (highZoom) drawSequenceAndFrames(context, genome, viewport, state)
  return { hitRegions: hits, height }
}

function drawRuler(context: CanvasRenderingContext2D, viewport: GenomeViewport) {
  const y = 22
  context.strokeStyle = '#506276'
  context.beginPath()
  context.moveTo(0, y)
  context.lineTo(viewport.width, y)
  context.stroke()
  const major = rulerStep(bpPerPixel(viewport))
  const first = Math.ceil(viewport.start / major) * major
  context.font = '11px system-ui'
  context.fillStyle = '#263849'
  context.textAlign = 'center'
  for (let position = first; position < viewport.end; position += major) {
    const x = genomeToScreen(position, viewport)
    context.beginPath()
    context.moveTo(x, y - 7)
    context.lineTo(x, y + 4)
    context.stroke()
    context.fillText((position + 1).toLocaleString(), x, 11)
  }
}

function drawFeatures(
  context: CanvasRenderingContext2D,
  genome: GenomeRecordDto,
  viewport: GenomeViewport,
  state: RenderState,
  y: number,
  strand: 1 | -1,
): HitRegion[] {
  const hits: HitRegion[] = []
  for (const feature of genome.features.filter((item) => item.strand === strand && item.end > viewport.start && item.start < viewport.end)) {
    const pieces = featureGeometry(feature, viewport, y)
    if (pieces.length > 1) {
      context.strokeStyle = '#40566b'
      context.beginPath()
      context.moveTo(pieces[0].x, y + 11)
      context.lineTo(pieces.at(-1)!.x + pieces.at(-1)!.width, y + 11)
      context.stroke()
    }
    for (const [index, piece] of pieces.entries()) {
      const selected = feature.id === state.selectedFeatureId
      context.fillStyle = selected ? '#ffb000' : strand === 1 ? '#147d64' : '#8f4261'
      drawArrow(context, piece.x, piece.y, piece.width, piece.height, strand, feature.parts[index])
      if (selected) {
        context.strokeStyle = '#111'
        context.lineWidth = 2
        context.strokeRect(piece.x - 1, piece.y - 1, piece.width + 2, piece.height + 2)
        context.lineWidth = 1
      }
      hits.push({ featureId: feature.id, ...piece })
    }
    const width = pieces.reduce((sum, piece) => sum + piece.width, 0)
    if (state.showLabels && width >= RENDER_CONFIG.labelMinimumPixels) {
      context.fillStyle = '#fff'
      context.font = '11px system-ui'
      context.textAlign = 'left'
      context.fillText(feature.label, pieces[0].x + 5, y + 15, width - 9)
    }
  }
  return hits
}

function drawArrow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  strand: 1 | -1,
  part: FeatureDto['parts'][number],
) {
  const head = Math.min(9, width / 2)
  context.beginPath()
  if (strand === 1) {
    context.moveTo(x, y)
    context.lineTo(x + width - head, y)
    context.lineTo(x + width, y + height / 2)
    context.lineTo(x + width - head, y + height)
    context.lineTo(x, y + height)
  } else {
    context.moveTo(x + head, y)
    context.lineTo(x + width, y)
    context.lineTo(x + width, y + height)
    context.lineTo(x + head, y + height)
    context.lineTo(x, y + height / 2)
  }
  context.closePath()
  context.fill()
  if (part.partialStart || part.partialEnd) {
    context.strokeStyle = '#fff'
    context.setLineDash([2, 2])
    context.stroke()
    context.setLineDash([])
  }
}

function drawSequenceAndFrames(
  context: CanvasRenderingContext2D,
  genome: GenomeRecordDto,
  viewport: GenomeViewport,
  state: RenderState,
) {
  context.font = '12px ui-monospace, monospace'
  context.textAlign = 'center'
  const frameY = new Map([[1, 70], [2, 88], [3, 106], [-1, 178], [-2, 196], [-3, 214]])
  context.fillStyle = '#506276'
  for (const [frame, y] of frameY) context.fillText(frame > 0 ? `+${frame}` : String(frame), 17, y)
  context.fillStyle = '#172433'
  const first = Math.max(0, Math.floor(viewport.start))
  const last = Math.min(genome.sequenceLength, Math.ceil(viewport.end))
  for (let position = first; position < last; position++) {
    const x = genomeToScreen(position + 0.5, viewport)
    context.fillText(genome.sequence[position], x, 132)
    context.fillText(genome.reverseComplement[genome.sequenceLength - position - 1], x, 160)
  }
  for (const codon of state.translation?.codons ?? []) {
    const y = frameY.get(codon.frame)
    if (!y) continue
    const x = genomeToScreen((codon.genomic_start + codon.genomic_end) / 2, viewport)
    context.fillStyle = codon.is_stop ? '#b31b34' : '#172433'
    context.fillText(codon.amino_acid, x, y)
    if (state.showStarts && codon.is_start) {
      context.strokeStyle = '#087e4b'
      context.strokeRect(x - 6, y - 12, 12, 14)
    }
  }
}
