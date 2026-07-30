import type { FeatureDto, GenomeRecordDto, SequenceSearchMatchDto, StopCodonDto, TranslationDto } from './genomeTypes'
import { classifyFeatureType, displayFeatureLabel, type FeatureGroupId } from './featureGroups'
import { bpPerPixel, genomeToScreen, type GenomeViewport } from './viewport'

export interface HitRegion { featureId: number; x: number; y: number; width: number; height: number }
export interface RenderResult { hitRegions: HitRegion[]; height: number }
export type RenderMode = 'stop_tracks' | 'sequence'
export type ReadingFrame = 1 | 2 | 3 | -1 | -2 | -3
export type NucleotideStrand = 'forward' | 'reverse'
export interface FrameRowLayout { frame: ReadingFrame; y: number; height: number }
export interface NucleotideRowLayout { strand: NucleotideStrand; y: number; height: number; textBaseline?: number }
export interface TrackRow {
  id: string
  label: string
  group: FeatureGroupId | 'frame' | 'search'
  strand?: 1 | -1 | 0
  lane?: number
  y: number
  height: number
  visible: boolean
}
export interface ViewerLayout {
  mode: RenderMode
  height: number
  trackRows: TrackRow[]
  frameRows: FrameRowLayout[]
  nucleotideRows: NucleotideRowLayout[]
}
export interface RenderState {
  selectedFeatureId?: number
  showLabels: boolean
  showStarts: boolean
  visibleGroups: Set<FeatureGroupId>
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
  trackHeight: 18,
  trackGap: 3,
  maximumFeatureLanes: 3,
  labelGutter: 62,
} as const

/** Chooses compact stop tracks above 1.6 bp/px and letters at or below it. */
export function renderMode(view: GenomeViewport): RenderMode {
  return bpPerPixel(view) <= RENDER_CONFIG.baseThreshold ? 'sequence' : 'stop_tracks'
}

export interface ViewerLayoutOptions { features?: FeatureDto[] }

/** Greedily packs overlaps into stable lanes, sharing the last lane at the cap. */
export function packFeatureLanes(features: FeatureDto[], maximumLanes = RENDER_CONFIG.maximumFeatureLanes): Map<number, number> {
  const sorted = [...features].sort((a, b) => a.start - b.start || b.end - a.end || a.id - b.id)
  const laneEnds: number[] = []
  const assignments = new Map<number, number>()
  for (const feature of sorted) {
    let lane = laneEnds.findIndex((end) => end <= feature.start)
    if (lane < 0 && laneEnds.length < maximumLanes) lane = laneEnds.length
    if (lane < 0) lane = laneEnds.indexOf(Math.min(...laneEnds))
    laneEnds[lane] = Math.max(laneEnds[lane] ?? 0, feature.end)
    assignments.set(feature.id, lane)
  }
  return assignments
}

function groupLaneCount(features: FeatureDto[], group: FeatureGroupId, strand: 1 | -1 | 0): number {
  const matching = features.filter((feature) => classifyFeatureType(feature.type) === group
    && (strand === 0 || feature.strand === strand || (feature.strand === 0 && strand === 1)))
  if (!matching.length) return 1
  return Math.max(1, ...packFeatureLanes(matching).values()) + 1
}

/** Positions enabled feature groups and shared nucleotide/frame rows dynamically. */
export function buildViewerLayout(
  view: GenomeViewport,
  visibleGroups: Set<FeatureGroupId> = new Set(['genes', 'rna']),
  options: ViewerLayoutOptions = {},
): ViewerLayout {
  const mode = renderMode(view)
  const features = options.features ?? []
  const trackRows: TrackRow[] = []
  let y = 32
  const addGroupRows = (group: FeatureGroupId, label: string, strand: 1 | -1 | 0) => {
    if (!visibleGroups.has(group)) return
    const lanes = groupLaneCount(features, group, strand)
    for (let lane = 0; lane < lanes; lane++) {
      trackRows.push({ id: `${group}:${strand}:${lane}`, label: lane ? '' : label, group, strand, lane, y, height: RENDER_CONFIG.trackHeight, visible: true })
      y += RENDER_CONFIG.trackHeight + RENDER_CONFIG.trackGap
    }
  }
  addGroupRows('regional', 'Regions', 0)
  addGroupRows('genes', 'Genes +', 1)
  addGroupRows('rna', 'RNAs +', 1)
  addGroupRows('protein_processing', 'Processing +', 1)
  addGroupRows('other', 'Other +', 1)
  const forwardNucleotide: NucleotideRowLayout = mode === 'sequence'
    ? { strand: 'forward', y, height: 22, textBaseline: y + 16 }
    : { strand: 'forward', y, height: 9 }
  y += forwardNucleotide.height + 3
  const positiveRows = ([1, 2, 3] as ReadingFrame[]).map((frame) => {
    const row = { frame, y, height: mode === 'sequence' ? 18 : 16 }; y += row.height + 2; return row
  })
  const reverseNucleotide: NucleotideRowLayout = mode === 'sequence'
    ? { strand: 'reverse', y, height: 22, textBaseline: y + 16 }
    : { strand: 'reverse', y, height: 9 }
  y += reverseNucleotide.height + 3
  const negativeRows = ([-1, -2, -3] as ReadingFrame[]).map((frame) => {
    const row = { frame, y, height: mode === 'sequence' ? 18 : 16 }; y += row.height + 2; return row
  })
  addGroupRows('other', 'Other −', -1)
  addGroupRows('protein_processing', 'Processing −', -1)
  addGroupRows('rna', 'RNAs −', -1)
  addGroupRows('genes', 'Genes −', -1)
  addGroupRows('assembly_variation', 'Assembly', 0)
  return { mode, height: y + 8, trackRows, frameRows: [...positiveRows, ...negativeRows], nucleotideRows: [forwardNucleotide, reverseNucleotide] }
}

export function viewerLayout(view: GenomeViewport): ViewerLayout {
  return buildViewerLayout(view)
}

export function frameRowFor(layout: ViewerLayout, frame: ReadingFrame): FrameRowLayout {
  return layout.frameRows.find((row) => row.frame === frame) ?? layout.frameRows[0]
}

export function nucleotideRowFor(
  layout: ViewerLayout,
  strand: NucleotideStrand,
): NucleotideRowLayout {
  return layout.nucleotideRows.find((row) => row.strand === strand) ?? layout.nucleotideRows[0]
}

export function renderHeight(view: GenomeViewport, visibleGroups?: Set<FeatureGroupId>, features?: FeatureDto[]): number {
  return buildViewerLayout(view, visibleGroups, { features }).height
}

export function featuresForRendering(genome: GenomeRecordDto, state: RenderState): FeatureDto[] {
  return genome.features.filter((feature) => state.visibleGroups.has(classifyFeatureType(feature.type)))
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

export type SearchHighlightTarget =
  | { kind: 'frame'; frame: ReadingFrame }
  | { kind: 'nucleotide'; strand: NucleotideStrand }
export interface SearchHighlightGeometry {
  x: number
  width: number
  y: number
  height: number
  label: string
  target: SearchHighlightTarget
}

/** Maps a search DTO to its current signed-frame or nucleotide-row highlight. */
export function searchHighlightGeometries(
  match: SequenceSearchMatchDto,
  view: GenomeViewport,
  layout = viewerLayout(view),
): SearchHighlightGeometry[] {
  const x = genomeToScreen(match.start, view)
  const width = Math.max(2, genomeToScreen(match.end, view) - x)
  if (match.matchType === 'amino_acid') {
    const frame = match.frame ?? 1
    const row = frameRowFor(layout, frame)
    return [{
      x, width, y: row.y, height: row.height,
      label: `frame ${signedFrame(frame)} match`, target: { kind: 'frame', frame },
    }]
  }
  const strands: NucleotideStrand[] = match.strand === 'Unknown'
    ? ['forward', 'reverse']
    : [match.strand === 'Reverse' ? 'reverse' : 'forward']
  return strands.map((strand) => {
    const row = nucleotideRowFor(layout, strand)
    return {
      x, width, y: row.y, height: row.height,
      label: match.strand === 'Unknown' ? 'both-strand nucleotide match' : `${strand} nucleotide match`,
      target: { kind: 'nucleotide', strand },
    }
  })
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

function signedFrame(frame: ReadingFrame): string {
  return frame > 0 ? `+${frame}` : String(frame)
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
  const layout = buildViewerLayout(viewport, state.visibleGroups, { features: genome.features })
  const height = layout.height
  context.clearRect(0, 0, viewport.width, height)
  context.fillStyle = '#fff'
  context.fillRect(0, 0, viewport.width, height)
  drawTrackBackgrounds(context, viewport, layout)
  if (layout.mode === 'stop_tracks') drawStopTrackBackgrounds(context, viewport, layout)
  if (state.searchMatch) drawSearchHighlightBackground(context, state.searchMatch, viewport, layout)
  drawRuler(context, viewport)
  const visible = featuresForRendering(genome, state)
  const hits = drawGroupedFeatures(context, visible, viewport, state, layout)
  if (layout.mode === 'sequence') drawSequenceAndFrames(context, genome, viewport, state, layout)
  else drawStopTrackContent(context, state.stopCodons ?? [], viewport, layout)
  if (state.searchMatch) drawSearchHighlightForeground(context, state.searchMatch, viewport, layout)
  return { hitRegions: hits, height }
}

function drawTrackBackgrounds(context: CanvasRenderingContext2D, viewport: GenomeViewport, layout: ViewerLayout) {
  for (const row of layout.trackRows) {
    context.fillStyle = row.group === 'regional' || row.group === 'assembly_variation' ? 'rgba(220, 226, 232, .28)' : 'rgba(248, 250, 252, .7)'
    context.fillRect(0, row.y, viewport.width, row.height)
  }
}

function drawStopTrackBackgrounds(
  context: CanvasRenderingContext2D,
  viewport: GenomeViewport,
  layout: ViewerLayout,
) {
  for (const row of layout.frameRows) {
    context.fillStyle = row.frame > 0 ? 'rgba(228, 237, 244, .38)' : 'rgba(214, 226, 235, .38)'
    context.fillRect(0, row.y, viewport.width, row.height)
    context.strokeStyle = '#c0ccd5'
    context.beginPath()
    context.moveTo(0, row.y + row.height - .5)
    context.lineTo(viewport.width, row.y + row.height - .5)
    context.stroke()
  }
  for (const row of layout.nucleotideRows) {
    context.fillStyle = row.strand === 'forward' ? 'rgba(224, 242, 235, .5)' : 'rgba(239, 226, 234, .5)'
    context.fillRect(0, row.y, viewport.width, row.height)
  }
}

function drawStopTrackContent(
  context: CanvasRenderingContext2D,
  stops: StopCodonDto[],
  viewport: GenomeViewport,
  layout: ViewerLayout,
) {
  context.fillStyle = '#b31b34'
  for (const bar of stopBarGeometries(stops, viewport, layout)) {
    context.fillRect(bar.x - bar.width / 2, bar.y, bar.width, bar.height)
  }
  context.font = 'bold 11px ui-monospace, monospace'
  context.textAlign = 'left'
  for (const row of layout.frameRows) {
    context.fillStyle = 'rgba(244, 248, 251, .9)'
    context.fillRect(0, row.y, 32, row.height)
    context.fillStyle = '#263849'
    context.fillText(signedFrame(row.frame), 7, row.y + 12)
  }
  context.font = 'bold 9px ui-monospace, monospace'
  for (const row of layout.nucleotideRows) {
    context.fillStyle = 'rgba(244, 248, 251, .9)'
    context.fillRect(0, row.y, 32, row.height)
    context.fillStyle = '#263849'
    context.fillText(row.strand === 'forward' ? 'F nt' : 'R nt', 4, row.y + row.height - 1)
  }
}

function drawSearchHighlightBackground(
  context: CanvasRenderingContext2D,
  match: SequenceSearchMatchDto,
  viewport: GenomeViewport,
  layout: ViewerLayout,
) {
  if (match.end <= viewport.start || match.start >= viewport.end) return
  for (const geometry of searchHighlightGeometries(match, viewport, layout)) {
    const { left, width } = clippedHighlight(geometry, viewport)
    context.fillStyle = 'rgba(255, 191, 71, .34)'
    context.fillRect(left, geometry.y, width, geometry.height)
    context.strokeStyle = 'rgba(138, 87, 0, .72)'
    context.lineWidth = 1
    context.save()
    context.beginPath()
    context.rect(left, geometry.y, width, geometry.height)
    context.clip()
    for (let hatchX = left - geometry.height; hatchX < left + width; hatchX += 10) {
      context.beginPath()
      context.moveTo(hatchX, geometry.y + geometry.height)
      context.lineTo(hatchX + geometry.height, geometry.y)
      context.stroke()
    }
    context.restore()
  }
}

function drawSearchHighlightForeground(
  context: CanvasRenderingContext2D,
  match: SequenceSearchMatchDto,
  viewport: GenomeViewport,
  layout: ViewerLayout,
) {
  if (match.end <= viewport.start || match.start >= viewport.end) return
  for (const geometry of searchHighlightGeometries(match, viewport, layout)) {
    const { left, width } = clippedHighlight(geometry, viewport)
    context.strokeStyle = '#8a5700'
    context.lineWidth = 2
    context.strokeRect(left, geometry.y, width, geometry.height)
    context.lineWidth = 1
    if (layout.mode === 'stop_tracks') {
      context.fillStyle = '#5f3b00'
      context.font = 'bold 9px system-ui'
      context.textAlign = 'left'
      context.fillText(geometry.label, Math.max(35, left + 3), geometry.y + Math.min(12, geometry.height - 1))
    }
  }
}

function clippedHighlight(
  geometry: SearchHighlightGeometry,
  viewport: GenomeViewport,
): { left: number; width: number } {
  const left = Math.max(0, geometry.x)
  const right = Math.min(viewport.width, geometry.x + geometry.width)
  return { left, width: Math.max(1, right - left) }
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

export function featureHitPriority(feature: FeatureDto): number {
  const group = classifyFeatureType(feature.type)
  if (feature.type.toLowerCase() === 'source') return 0
  if (group === 'assembly_variation') return 1
  if (group === 'regional' || group === 'other') return 2
  return 3
}

function rowsForGroup(layout: ViewerLayout, group: FeatureGroupId, strand: 1 | -1 | 0): TrackRow[] {
  return layout.trackRows.filter((row) => row.group === group && row.strand === strand)
}

function drawGroupedFeatures(
  context: CanvasRenderingContext2D,
  features: FeatureDto[],
  viewport: GenomeViewport,
  state: RenderState,
  layout: ViewerLayout,
): HitRegion[] {
  const hits: HitRegion[] = []
  const visible = features.filter((feature) => feature.end > viewport.start && feature.start < viewport.end)
    .sort((a, b) => featureHitPriority(a) - featureHitPriority(b) || a.start - b.start || b.end - a.end || a.id - b.id)
  const laneMaps = new Map<string, Map<number, number>>()
  for (const feature of visible) {
    const group = classifyFeatureType(feature.type)
    const trackStrand: 1 | -1 | 0 = group === 'regional' || group === 'assembly_variation' ? 0 : feature.strand === -1 ? -1 : 1
    const key = `${group}:${trackStrand}`
    if (!laneMaps.has(key)) {
      laneMaps.set(key, packFeatureLanes(visible.filter((candidate) => {
        const candidateGroup = classifyFeatureType(candidate.type)
        const candidateStrand = candidateGroup === 'regional' || candidateGroup === 'assembly_variation' ? 0 : candidate.strand === -1 ? -1 : 1
        return candidateGroup === group && candidateStrand === trackStrand
      })))
    }
    const rows = rowsForGroup(layout, group, trackStrand)
    const lane = laneMaps.get(key)?.get(feature.id) ?? 0
    const row = rows[Math.min(lane, rows.length - 1)]
    if (!row) continue
    const featureHeight = group === 'protein_processing' ? 12 : RENDER_CONFIG.trackHeight
    const y = row.y + (row.height - featureHeight) / 2
    const pieces = featureGeometry(feature, viewport, y).map((piece) => ({ ...piece, height: featureHeight }))
    if (pieces.length > 1) {
      context.strokeStyle = '#40566b'
      context.beginPath()
      context.moveTo(pieces[0].x, y + featureHeight / 2)
      context.lineTo(pieces.at(-1)!.x + pieces.at(-1)!.width, y + featureHeight / 2)
      context.stroke()
    }
    for (const [index, piece] of pieces.entries()) {
      const selected = feature.id === state.selectedFeatureId
      drawFeatureShape(context, feature, group, piece, selected, feature.parts[index])
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
      context.fillStyle = group === 'genes' || group === 'rna' ? '#fff' : '#263849'
      context.font = '11px system-ui'
      context.textAlign = 'left'
      context.fillText(displayFeatureLabel(feature), pieces[0].x + 5, y + Math.min(14, featureHeight - 3), width - 9)
    }
  }
  drawTrackLabels(context, layout)
  return hits
}

function drawTrackLabels(context: CanvasRenderingContext2D, layout: ViewerLayout) {
  context.font = 'bold 9px system-ui'
  context.textAlign = 'left'
  for (const row of layout.trackRows.filter((item) => item.label)) {
    context.fillStyle = 'rgba(248, 250, 252, .92)'
    context.fillRect(0, row.y, RENDER_CONFIG.labelGutter, row.height)
    context.fillStyle = '#344b5e'
    context.fillText(row.label, 4, row.y + 12, RENDER_CONFIG.labelGutter - 6)
  }
}

function drawFeatureShape(
  context: CanvasRenderingContext2D,
  feature: FeatureDto,
  group: FeatureGroupId,
  piece: { x: number; y: number; width: number; height: number },
  selected: boolean,
  part: FeatureDto['parts'][number],
) {
  const type = feature.type.toLowerCase()
  context.setLineDash([])
  if (selected) context.fillStyle = '#ffb000'
  else if (group === 'genes') context.fillStyle = type === 'gene' ? '#356c8a' : feature.strand === -1 ? '#8f4261' : '#147d64'
  else if (group === 'rna') context.fillStyle = '#5865a8'
  else if (group === 'protein_processing') context.fillStyle = '#a85d16'
  else if (group === 'regional') context.fillStyle = 'rgba(114, 90, 153, .28)'
  else if (group === 'assembly_variation') context.fillStyle = 'rgba(121, 132, 143, .28)'
  else context.fillStyle = 'rgba(75, 94, 112, .35)'

  if (group === 'genes' || group === 'rna' || group === 'protein_processing') {
    drawArrow(context, piece.x, piece.y, piece.width, piece.height, feature.strand === -1 ? -1 : 1, part)
    context.strokeStyle = group === 'rna' ? '#252d67' : group === 'protein_processing' ? '#663500' : '#24475a'
    if (type === 'gene') context.setLineDash([3, 2])
    context.stroke()
  } else {
    context.beginPath()
    const marker = ['variation', 'modified_base', 'misc_difference'].includes(type) && piece.width <= 5
    if (marker) context.rect(piece.x - 1, piece.y, Math.max(3, piece.width), piece.height)
    else context.rect(piece.x, piece.y, piece.width, piece.height)
    context.fill()
    context.strokeStyle = group === 'regional' ? '#604681' : '#5f6d79'
    if (type === 'source' || type === 'gap' || type === 'assembly_gap') context.setLineDash(type === 'source' ? [6, 4] : [2, 2])
    context.stroke()
  }
  context.setLineDash([])
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
    context.fillText(genome.sequence[position], x, nucleotideRowFor(layout, 'forward').textBaseline!)
    context.fillText(genome.reverseComplement[genome.sequenceLength - position - 1], x, nucleotideRowFor(layout, 'reverse').textBaseline!)
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
