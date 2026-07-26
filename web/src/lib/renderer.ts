import type { FeatureDto, GenomeRecordDto, SequenceSearchMatchDto, StopCodonDto, TranslationDto } from './genomeTypes'
import { bpPerPixel, genomeToScreen, type GenomeViewport } from './viewport'

export interface HitRegion { featureId: number; x: number; y: number; width: number; height: number }
export interface RenderResult { hitRegions: HitRegion[]; height: number }
export type RenderMode = 'stop_tracks' | 'sequence'
export type ReadingFrame = 1 | 2 | 3 | -1 | -2 | -3
export interface FrameRowLayout { frame: ReadingFrame; y: number; height: number }
export interface ViewerLayout {
  mode: RenderMode
  height: number
  sourceFeatureY: number
  forwardFeatureY: number
  reverseFeatureY: number
  frameRows: FrameRowLayout[]
  forwardNucleotideY?: number
  reverseNucleotideY?: number
}
export interface RenderState {
  selectedFeatureId?: number
  showLabels: boolean
  showStarts: boolean
  showSourceFeatures: boolean
  searchMatch?: SequenceSearchMatchDto | null
  stopCodons?: StopCodonDto[]
  translation?: TranslationDto
}

export const FRAME_ORDER: readonly ReadingFrame[] = [1, 2, 3, -1, -2, -3]
export const RENDER_CONFIG = {
  margin: 38,
  rulerHeight: 28,
  featureHeight: 22,
  rowHeight: 18,
  baseThreshold: 1.6,
  labelMinimumPixels: 50,
  stopTrackHeight: 224,
  sequenceHeight: 312,
  stopTrackRowHeight: 18,
  stopBarWidth: 1.5,
} as const

export function renderMode(view: GenomeViewport): RenderMode {
  return bpPerPixel(view) <= RENDER_CONFIG.baseThreshold ? 'sequence' : 'stop_tracks'
}

export function viewerLayout(view: GenomeViewport): ViewerLayout {
  if (renderMode(view) === 'sequence') {
    const baselines = [90, 110, 130, 216, 236, 256]
    return {
      mode: 'sequence', height: RENDER_CONFIG.sequenceHeight,
      sourceFeatureY: 36, forwardFeatureY: 44, reverseFeatureY: 280,
      frameRows: FRAME_ORDER.map((frame, index) => ({ frame, y: baselines[index] - 14, height: 18 })),
      forwardNucleotideY: 158, reverseNucleotideY: 184,
    }
  }
  return {
    mode: 'stop_tracks', height: RENDER_CONFIG.stopTrackHeight,
    sourceFeatureY: 30, forwardFeatureY: 38, reverseFeatureY: 192,
    frameRows: FRAME_ORDER.map((frame, index) => ({
      frame, y: 72 + index * RENDER_CONFIG.stopTrackRowHeight, height: 16,
    })),
  }
}

export function renderHeight(view: GenomeViewport): number {
  return viewerLayout(view).height
}

export function featuresForRendering(genome: GenomeRecordDto, state: RenderState): FeatureDto[] {
  return genome.features.filter(
    (feature) => state.showSourceFeatures || feature.type.toLowerCase() !== 'source',
  )
}

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

export function searchHighlightGeometry(
  match: SequenceSearchMatchDto,
  view: GenomeViewport,
): { x: number; width: number; y: number; height: number; label: string } {
  const x = genomeToScreen(match.start, view)
  const width = Math.max(2, genomeToScreen(match.end, view) - x)
  const layout = viewerLayout(view)
  if (layout.mode === 'stop_tracks') return { x, width, y: 28, height: layout.height - 32, label: searchLabel(match) }
  if (match.matchType === 'amino_acid') {
    const row = layout.frameRows.find((item) => item.frame === match.frame) ?? layout.frameRows[0]
    return { x, width, y: row.y, height: row.height, label: searchLabel(match) }
  }
  const y = match.strand === 'Reverse' ? 168 : 142
  return { x, width, y, height: match.strand === 'Unknown' ? 52 : 22, label: searchLabel(match) }
}

export interface StopBarGeometry { frame: ReadingFrame; x: number; y: number; width: number; height: number }
const stopGeometryCache = new WeakMap<StopCodonDto[], { key: string; bars: StopBarGeometry[] }>()

export function stopBarGeometries(
  stops: StopCodonDto[],
  view: GenomeViewport,
  layout = viewerLayout(view),
): StopBarGeometry[] {
  const key = `${view.start}:${view.end}:${view.width}:${layout.frameRows.map((row) => `${row.frame}:${row.y}:${row.height}`).join(',')}`
  const cached = stopGeometryCache.get(stops)
  if (cached?.key === key) return cached.bars
  const occupiedPixels = new Set<string>()
  const bars: StopBarGeometry[] = []
  for (const stop of stops) {
    if (stop.genomic_end <= view.start || stop.genomic_start >= view.end) continue
    const row = layout.frameRows.find((item) => item.frame === stop.frame)
    if (!row) continue
    const x = genomeToScreen((stop.genomic_start + stop.genomic_end) / 2, view)
    const pixelKey = `${stop.frame}:${Math.round(x)}`
    if (occupiedPixels.has(pixelKey)) continue
    occupiedPixels.add(pixelKey)
    bars.push({
      frame: stop.frame, x, y: row.y + 2, width: RENDER_CONFIG.stopBarWidth,
      height: row.height - 4,
    })
  }
  stopGeometryCache.set(stops, { key, bars })
  return bars
}

function searchLabel(match: SequenceSearchMatchDto): string {
  if (match.frame) return `match frame ${match.frame > 0 ? '+' : ''}${match.frame}`
  return `match ${match.strand === 'Unknown' ? 'both strands' : match.strand.toLowerCase()}`
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
  const layout = viewerLayout(viewport)
  const height = layout.height
  context.clearRect(0, 0, viewport.width, height)
  context.fillStyle = '#fff'
  context.fillRect(0, 0, viewport.width, height)
  if (state.searchMatch) drawSearchHighlight(context, state.searchMatch, viewport)
  drawRuler(context, viewport)
  const visible = featuresForRendering(genome, state)
  const sources = visible.filter((feature) => feature.type.toLowerCase() === 'source')
  const annotations = visible.filter((feature) => feature.type.toLowerCase() !== 'source')
  const hits = [
    ...drawFeatures(context, sources, viewport, state, layout.sourceFeatureY, 1, true),
    ...drawFeatures(context, sources, viewport, state, layout.reverseFeatureY, -1, true),
    ...drawFeatures(context, annotations, viewport, state, layout.forwardFeatureY, 1, false),
    ...drawFeatures(context, annotations, viewport, state, layout.reverseFeatureY, -1, false),
  ]
  if (layout.mode === 'sequence') drawSequenceAndFrames(context, genome, viewport, state, layout)
  else drawStopTracks(context, state.stopCodons ?? [], viewport, layout)
  return { hitRegions: hits, height }
}

function drawStopTracks(
  context: CanvasRenderingContext2D,
  stops: StopCodonDto[],
  viewport: GenomeViewport,
  layout: ViewerLayout,
) {
  context.font = 'bold 11px ui-monospace, monospace'
  context.textAlign = 'left'
  for (const row of layout.frameRows) {
    context.fillStyle = row.frame > 0 ? 'rgba(228, 237, 244, .38)' : 'rgba(214, 226, 235, .38)'
    context.fillRect(0, row.y, viewport.width, row.height)
    context.strokeStyle = '#c0ccd5'
    context.beginPath()
    context.moveTo(0, row.y + row.height - .5)
    context.lineTo(viewport.width, row.y + row.height - .5)
    context.stroke()
  }
  context.fillStyle = '#b31b34'
  for (const bar of stopBarGeometries(stops, viewport, layout)) {
    context.fillRect(bar.x - bar.width / 2, bar.y, bar.width, bar.height)
  }
  for (const row of layout.frameRows) {
    context.fillStyle = 'rgba(244, 248, 251, .9)'
    context.fillRect(0, row.y, 32, row.height)
    context.fillStyle = '#263849'
    context.fillText(row.frame > 0 ? `+${row.frame}` : String(row.frame), 7, row.y + 12)
  }
}

function drawSearchHighlight(
  context: CanvasRenderingContext2D,
  match: SequenceSearchMatchDto,
  viewport: GenomeViewport,
) {
  if (match.end <= viewport.start || match.start >= viewport.end) return
  const geometry = searchHighlightGeometry(match, viewport)
  const left = Math.max(0, geometry.x)
  const right = Math.min(viewport.width, geometry.x + geometry.width)
  context.fillStyle = 'rgba(255, 191, 71, .28)'
  context.fillRect(left, geometry.y, Math.max(1, right - left), geometry.height)
  context.strokeStyle = '#8a5700'
  context.lineWidth = 2
  context.strokeRect(left, geometry.y, Math.max(1, right - left), geometry.height)
  context.lineWidth = 1
  context.save()
  context.beginPath()
  context.rect(left, geometry.y, Math.max(1, right - left), geometry.height)
  context.clip()
  for (let x = left - geometry.height; x < right; x += 10) {
    context.beginPath()
    context.moveTo(x, geometry.y + geometry.height)
    context.lineTo(x + geometry.height, geometry.y)
    context.stroke()
  }
  context.restore()
  context.fillStyle = '#5f3b00'
  context.font = 'bold 11px system-ui'
  context.textAlign = 'left'
  context.fillText(geometry.label, Math.max(3, left + 3), geometry.y + 12)
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
  features: FeatureDto[],
  viewport: GenomeViewport,
  state: RenderState,
  y: number,
  strand: 1 | -1,
  sourceLayer: boolean,
): HitRegion[] {
  const hits: HitRegion[] = []
  for (const feature of features.filter((item) =>
    (item.strand === strand || (sourceLayer && item.strand === 0 && strand === 1))
      && item.end > viewport.start && item.start < viewport.end
  )) {
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
      context.fillStyle = selected ? '#ffb000' : sourceLayer ? '#c8d0d8' : strand === 1 ? '#147d64' : '#8f4261'
      drawArrow(context, piece.x, piece.y, piece.width, piece.height, strand, feature.parts[index])
      if (sourceLayer && !selected) {
        context.strokeStyle = '#657586'
        context.setLineDash([5, 4])
        context.stroke()
        context.setLineDash([])
      }
      if (selected) {
        context.strokeStyle = '#111'
        context.lineWidth = 2
        context.strokeRect(piece.x - 1, piece.y - 1, piece.width + 2, piece.height + 2)
        context.lineWidth = 1
      }
      hits.push({ featureId: feature.id, ...piece })
    }
    const width = pieces.reduce((sum, piece) => sum + piece.width, 0)
    if ((state.showLabels || sourceLayer) && width >= RENDER_CONFIG.labelMinimumPixels) {
      context.fillStyle = sourceLayer ? '#263849' : '#fff'
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
  layout: ViewerLayout,
) {
  context.font = '12px ui-monospace, monospace'
  context.textAlign = 'center'
  const frameY = new Map(layout.frameRows.map((row) => [row.frame, row.y + 14]))
  context.fillStyle = '#506276'
  for (const [frame, y] of frameY) context.fillText(frame > 0 ? `+${frame}` : String(frame), 17, y)
  context.fillStyle = '#172433'
  const first = Math.max(0, Math.floor(viewport.start))
  const last = Math.min(genome.sequenceLength, Math.ceil(viewport.end))
  for (let position = first; position < last; position++) {
    const x = genomeToScreen(position + 0.5, viewport)
    context.fillText(genome.sequence[position], x, layout.forwardNucleotideY!)
    context.fillText(genome.reverseComplement[genome.sequenceLength - position - 1], x, layout.reverseNucleotideY!)
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
