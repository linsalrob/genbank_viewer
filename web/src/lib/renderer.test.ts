import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FRAME_ORDER, buildViewerLayout, featureGeometry, featureHitPriority, featuresForRendering, hitTest, nucleotideRowFor, packFeatureLanes, renderGenome, renderHeight, renderMode, rulerStep, searchHighlightGeometries, stopBarGeometries, viewerLayout } from './renderer'
import type { FeatureDto, GenomeRecordDto, SequenceSearchMatchDto, StopCodonDto } from './genomeTypes'

const feature: FeatureDto = {
  id: 7, type: 'CDS', strand: 1, start: 10, end: 40, label: 'abc',
  parts: [
    { start: 10, end: 20, partialStart: false, partialEnd: false },
    { start: 30, end: 40, partialStart: false, partialEnd: true },
  ],
  qualifiers: [],
}
const source: FeatureDto = {
  ...feature, id: 1, type: 'SoUrCe', start: 0, end: 100, label: 'source',
  parts: [{ start: 0, end: 100, partialStart: false, partialEnd: false }],
}
const genome: GenomeRecordDto = {
  id: 'TEST', sequenceLength: 100, sequence: 'A'.repeat(100), reverseComplement: 'T'.repeat(100),
  topology: 'linear', features: [source, feature], warnings: [],
  codingSummary: { sequence_length: 100, cds_count: 1, forward_cds_count: 1, reverse_cds_count: 0, covered_bases: 30, coding_density: 0.3 },
}
const context = {
  clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), fillText: vi.fn(), closePath: vi.fn(), fill: vi.fn(), setLineDash: vi.fn(),
  strokeRect: vi.fn(), save: vi.fn(), rect: vi.fn(), clip: vi.fn(), restore: vi.fn(),
  fillStyle: '', strokeStyle: '', font: '', textAlign: '', lineWidth: 1,
} as unknown as CanvasRenderingContext2D
const state = { showLabels: true, showStarts: true, visibleGroups: new Set(['genes'] as const) }
describe('renderer geometry', () => {
  beforeEach(() => vi.clearAllMocks())
  it('creates geometry for every joined part', () => {
    const pieces = featureGeometry(feature, { start: 0, end: 100, width: 1000 }, 20)
    expect(pieces).toHaveLength(2)
    expect(pieces[0]).toMatchObject({ x: 100, width: 100 })
  })
  it('hit tests topmost regions', () => {
    expect(hitTest([{ featureId: 7, x: 10, y: 10, width: 20, height: 20 }], 15, 15)).toBe(7)
    expect(hitTest([], 15, 15)).toBeUndefined()
  })
  it('generates readable 1-2-5 ruler steps', () => {
    expect(rulerStep(1)).toBe(100)
    expect(rulerStep(10)).toBe(1000)
  })
  it('filters source features without removing CDS features', () => {
    expect(featuresForRendering(genome, state).map((item) => item.id)).toEqual([7])
    expect(featuresForRendering(genome, { ...state, visibleGroups: new Set(['genes', 'assembly_variation'] as const) }).map((item) => item.id)).toEqual([1, 7])
  })
  it('excludes source hit regions until source display is enabled', () => {
    const viewport = { start: 0, end: 1000, width: 100 }
    const hidden = renderGenome(context, genome, viewport, state).hitRegions
    const visible = renderGenome(context, genome, viewport, { ...state, visibleGroups: new Set(['genes', 'assembly_variation'] as const) }).hitRegions
    expect(hidden.map((region) => region.featureId)).toContain(7)
    expect(hidden.map((region) => region.featureId)).not.toContain(1)
    expect(visible.map((region) => region.featureId)).toContain(1)
    const sourceRegion = visible.find((region) => region.featureId === 1)!
    expect(hitTest(visible, sourceRegion.x + .5, sourceRegion.y + .5)).toBe(1)
  })
  it('uses taller responsive render layouts', () => {
    expect(renderMode({ start: 0, end: 1000, width: 100 })).toBe('stop_tracks')
    expect(renderHeight({ start: 0, end: 1000, width: 100 })).toBeGreaterThan(150)
    expect(renderHeight({ start: 0, end: 100, width: 100 })).toBeGreaterThan(renderHeight({ start: 0, end: 1000, width: 100 }))
  })
  it('defines stable rows for all six frames above reverse features', () => {
    const layout = viewerLayout({ start: 0, end: 1000, width: 100 })
    expect(layout.frameRows.map((row) => row.frame)).toEqual(FRAME_ORDER)
    expect(layout.frameRows.map((row) => row.y)).toEqual([86, 104, 122, 152, 170, 188])
    const reverse = layout.trackRows.find((row) => row.strand === -1)
    expect(reverse!.y).toBeGreaterThan(layout.frameRows.at(-1)!.y + layout.frameRows.at(-1)!.height)
  })
  it('places stop bars by codon centre in the correct forward and reverse rows', () => {
    const view = { start: 0, end: 100, width: 1000 }
    const stops: StopCodonDto[] = [
      { genomic_start: 9, genomic_end: 12, frame: 1 },
      { genomic_start: 48, genomic_end: 51, frame: -3 },
    ]
    const compactLayout = viewerLayout({ start: 0, end: 1000, width: 100 })
    expect(stopBarGeometries(stops, view, compactLayout)).toMatchObject([
      { frame: 1, x: 105, y: 88, width: 1.5, height: 12 },
      { frame: -3, x: 495, y: 190, width: 1.5, height: 12 },
    ])
  })
  it('clips stops and deduplicates only bars sharing a frame and screen pixel', () => {
    const view = { start: 10, end: 1010, width: 100 }
    const stops: StopCodonDto[] = [
      { genomic_start: 0, genomic_end: 3, frame: 1 },
      { genomic_start: 30, genomic_end: 33, frame: 1 },
      { genomic_start: 31, genomic_end: 34, frame: 1 },
      { genomic_start: 31, genomic_end: 34, frame: 2 },
      { genomic_start: 1100, genomic_end: 1103, frame: -3 },
    ]
    const bars = stopBarGeometries(stops, view)
    expect(bars).toHaveLength(2)
    expect(bars.map((bar) => bar.frame)).toEqual([1, 2])
  })
  it('keeps distinct stop positions and paints bars over search highlighting', () => {
    const view = { start: 0, end: 1000, width: 100 }
    const stops: StopCodonDto[] = [
      { genomic_start: 30, genomic_end: 33, frame: 1 },
      { genomic_start: 300, genomic_end: 303, frame: 1 },
    ]
    expect(stopBarGeometries(stops, view)).toHaveLength(2)
    const searchMatch: SequenceSearchMatchDto = {
      start: 20, end: 40, strand: 'Forward', frame: null,
      matchType: 'nucleotide', matchedSequence: 'A'.repeat(20), geneticCode: null,
    }
    renderGenome(context, genome, view, { ...state, searchMatch, stopCodons: stops })
    const calls = vi.mocked(context.fillRect).mock.calls
    const layout = buildViewerLayout(view, state.visibleGroups, { features: genome.features })
    const highlightIndex = calls.findIndex((call) => call[1] === nucleotideRowFor(layout, 'forward').y)
    const firstBar = stopBarGeometries(stops, view, layout)[0]
    const firstBarIndex = calls.findIndex((call) => call[1] === firstBar.y && call[2] === 1.5)
    expect(highlightIndex).toBeGreaterThanOrEqual(0)
    expect(firstBarIndex).toBeGreaterThan(highlightIndex)
  })
  it('draws compact bars without amino acids and detailed amino-acid symbols without bars', () => {
    const stop: StopCodonDto = { genomic_start: 9, genomic_end: 12, frame: 1 }
    const compactView = { start: 0, end: 1000, width: 100 }
    const compactLayout = buildViewerLayout(compactView, state.visibleGroups, { features: genome.features })
    renderGenome(context, genome, compactView, { ...state, stopCodons: [stop] })
    expect(context.fillText).toHaveBeenCalledWith('+1', 7, compactLayout.frameRows[0].y + 12)
    expect(context.fillText).not.toHaveBeenCalledWith('*', expect.any(Number), expect.any(Number))
    vi.clearAllMocks()
    renderGenome(context, genome, { start: 0, end: 100, width: 1000 }, {
      ...state,
      translation: { region_start: 0, region_end: 100, codons: [{
        ...stop, amino_acid: '*', codon: [84, 65, 65], is_start: false, is_stop: true,
      }] },
    })
    const detailedLayout = buildViewerLayout({ start: 0, end: 100, width: 1000 }, state.visibleGroups, { features: genome.features })
    expect(context.fillText).toHaveBeenCalledWith('*', 105, detailedLayout.frameRows[0].y + 14)
  })
  it.each(FRAME_ORDER)('highlights only compact frame %s for peptide matches', (frame) => {
    const view = { start: 0, end: 1000, width: 100 }
    const layout = viewerLayout(view)
    const [geometry] = searchHighlightGeometries({
      start: 100, end: 106, strand: frame > 0 ? 'Forward' : 'Reverse', frame,
      matchType: 'amino_acid', matchedSequence: 'MK', geneticCode: 11,
    }, view, layout)
    const row = layout.frameRows.find((item) => item.frame === frame)!
    expect(geometry).toMatchObject({ y: row.y, height: row.height, target: { kind: 'frame', frame } })
    expect(geometry.height).toBeLessThan(layout.frameRows.length * row.height)
  })
  it('uses dedicated compact nucleotide lanes for forward, reverse, and both-strand matches', () => {
    const view = { start: 0, end: 1000, width: 100 }
    const layout = viewerLayout(view)
    const match: SequenceSearchMatchDto = {
      start: 100, end: 120, strand: 'Forward', frame: null,
      matchType: 'nucleotide', matchedSequence: 'A'.repeat(20), geneticCode: null,
    }
    expect(searchHighlightGeometries(match, view, layout)).toMatchObject([{
      y: nucleotideRowFor(layout, 'forward').y,
      target: { kind: 'nucleotide', strand: 'forward' },
    }])
    expect(searchHighlightGeometries({ ...match, strand: 'Reverse' }, view, layout)).toMatchObject([{
      y: nucleotideRowFor(layout, 'reverse').y,
      target: { kind: 'nucleotide', strand: 'reverse' },
    }])
    expect(searchHighlightGeometries({ ...match, strand: 'Unknown' }, view, layout).map((item) => item.target))
      .toEqual([{ kind: 'nucleotide', strand: 'forward' }, { kind: 'nucleotide', strand: 'reverse' }])
  })
  it('aligns detailed peptide and nucleotide highlights with shared sequence rows', () => {
    const view = { start: 0, end: 100, width: 1000 }
    const layout = viewerLayout(view)
    const peptide = searchHighlightGeometries({
      start: 10, end: 16, strand: 'Reverse', frame: -2,
      matchType: 'amino_acid', matchedSequence: 'MK', geneticCode: 11,
    }, view, layout)[0]
    expect(peptide).toMatchObject({ x: 100, width: 60, y: layout.frameRows.find((row) => row.frame === -2)!.y, height: 18, target: { kind: 'frame', frame: -2 } })
    const forward = searchHighlightGeometries({
      start: 10, end: 20, strand: 'Forward', frame: null,
      matchType: 'nucleotide', matchedSequence: 'A'.repeat(10), geneticCode: null,
    }, view, layout)[0]
    const reverse = searchHighlightGeometries({
      start: 10, end: 20, strand: 'Reverse', frame: null,
      matchType: 'nucleotide', matchedSequence: 'A'.repeat(10), geneticCode: null,
    }, view, layout)[0]
    expect(forward).toMatchObject({ x: 100, width: 100, y: nucleotideRowFor(layout, 'forward').y, height: 22 })
    expect(reverse).toMatchObject({ x: 100, width: 100, y: nucleotideRowFor(layout, 'reverse').y, height: 22 })
  })
  it('moves the same match between corresponding compact and detailed rows at the threshold', () => {
    const match: SequenceSearchMatchDto = {
      start: 100, end: 106, strand: 'Forward', frame: 2,
      matchType: 'amino_acid', matchedSequence: 'MK', geneticCode: 11,
    }
    const compactView = { start: 0, end: 1000, width: 100 }
    const detailedView = { start: 0, end: 160, width: 100 }
    const compact = searchHighlightGeometries(match, compactView)[0]
    const detailed = searchHighlightGeometries(match, detailedView)[0]
    expect(compact.target).toEqual(detailed.target)
    expect(compact.y).toBe(frameRowForTest(compactView, 2))
    expect(detailed.y).toBe(frameRowForTest(detailedView, 2))
    expect(renderHeight(detailedView)).toBeGreaterThan(renderHeight(compactView))
  })
  it('clips partial highlights and preserves a one-pixel minimum width', () => {
    const view = { start: 100, end: 200, width: 10 }
    const left = searchHighlightGeometries({
      start: 90, end: 101, strand: 'Forward', frame: null,
      matchType: 'nucleotide', matchedSequence: 'A'.repeat(11), geneticCode: null,
    }, view)[0]
    const tiny = searchHighlightGeometries({
      start: 150, end: 151, strand: 'Forward', frame: null,
      matchType: 'nucleotide', matchedSequence: 'A', geneticCode: null,
    }, view)[0]
    expect(left.x).toBe(-1)
    expect(left.width).toBe(2)
    expect(tiny.width).toBe(2)
  })
  it('draws a non-colour search cue without adding feature hit regions', () => {
    const match: SequenceSearchMatchDto = {
      start: 10, end: 20, strand: 'Forward', frame: null, matchType: 'nucleotide', matchedSequence: 'AAAAAAAAAA', geneticCode: null,
    }
    const result = renderGenome(context, genome, { start: 0, end: 100, width: 1000 }, { ...state, searchMatch: match })
    expect(context.rect).toHaveBeenCalled()
    const layout = buildViewerLayout({ start: 0, end: 100, width: 1000 }, state.visibleGroups, { features: genome.features })
    expect(context.strokeRect).toHaveBeenCalledWith(expect.any(Number), nucleotideRowFor(layout, 'forward').y, expect.any(Number), 22)
    expect(result.hitRegions.map((region) => region.featureId)).toEqual([7, 7])
  })
  it('packs overlaps into deterministic lanes and reuses lanes for non-overlaps', () => {
    const items = [
      { ...feature, id: 3, start: 0, end: 30 },
      { ...feature, id: 1, start: 10, end: 20 },
      { ...feature, id: 2, start: 30, end: 40 },
    ]
    const packed = packFeatureLanes(items)
    expect(packed.get(3)).toBe(0)
    expect(packed.get(1)).toBe(1)
    expect(packed.get(2)).toBe(0)
    expect([...packFeatureLanes([...items].reverse())]).toEqual([...packed])
  })
  it('uses a bounded lane fallback without omitting overlapping features', () => {
    const overlaps = Array.from({ length: 6 }, (_, id) => ({ ...feature, id, start: 0, end: 100 - id }))
    const packed = packFeatureLanes(overlaps, 3)
    expect(packed.size).toBe(6)
    expect(Math.max(...packed.values())).toBe(2)
  })
  it('builds dynamic rows only for visible groups while preserving all six frames', () => {
    const view = { start: 0, end: 1000, width: 100 }
    const minimal = buildViewerLayout(view, new Set(['genes']), { features: genome.features })
    const expanded = buildViewerLayout(view, new Set(['genes', 'rna', 'regional', 'assembly_variation']), { features: genome.features })
    expect(minimal.trackRows.every((row) => row.group === 'genes')).toBe(true)
    expect(expanded.trackRows.some((row) => row.group === 'regional')).toBe(true)
    expect(expanded.trackRows.some((row) => row.group === 'assembly_variation')).toBe(true)
    expect(expanded.height).toBeGreaterThan(minimal.height)
    expect(expanded.frameRows.map((row) => row.frame)).toEqual(FRAME_ORDER)
    expect(expanded.trackRows.filter((row) => row.strand === -1).every((row) => row.y > expanded.frameRows.at(-1)!.y)).toBe(true)
  })
  it('orders specific annotations ahead of broad source and regional features for hit testing', () => {
    const regulatory = { ...feature, id: 8, type: 'regulatory' }
    expect(featureHitPriority(feature)).toBeGreaterThan(featureHitPriority(regulatory))
    expect(featureHitPriority(regulatory)).toBeGreaterThan(featureHitPriority(source))
    const stacked = [source, regulatory, feature].sort((a, b) => featureHitPriority(a) - featureHitPriority(b))
      .map((item) => ({ featureId: item.id, x: 0, y: 0, width: 20, height: 20 }))
    expect(hitTest(stacked, 10, 10)).toBe(feature.id)
  })
})

function frameRowForTest(view: { start: number; end: number; width: number }, frame: number): number {
  return viewerLayout(view).frameRows.find((row) => row.frame === frame)!.y
}
