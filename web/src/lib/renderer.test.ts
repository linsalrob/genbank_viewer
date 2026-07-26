import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FRAME_ORDER, featureGeometry, featuresForRendering, hitTest, renderGenome, renderHeight, renderMode, rulerStep, searchHighlightGeometry, stopBarGeometries, viewerLayout } from './renderer'
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
const state = { showLabels: true, showStarts: true, showSourceFeatures: false }
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
    expect(featuresForRendering(genome, { ...state, showSourceFeatures: true }).map((item) => item.id)).toEqual([1, 7])
  })
  it('excludes source hit regions until source display is enabled', () => {
    const viewport = { start: 0, end: 1000, width: 100 }
    const hidden = renderGenome(context, genome, viewport, state).hitRegions
    const visible = renderGenome(context, genome, viewport, { ...state, showSourceFeatures: true }).hitRegions
    expect(hidden.map((region) => region.featureId)).toContain(7)
    expect(hidden.map((region) => region.featureId)).not.toContain(1)
    expect(visible.map((region) => region.featureId)).toContain(1)
    expect(hitTest(visible, .5, 40)).toBe(1)
  })
  it('uses taller responsive render layouts', () => {
    expect(renderMode({ start: 0, end: 1000, width: 100 })).toBe('stop_tracks')
    expect(renderHeight({ start: 0, end: 1000, width: 100 })).toBe(224)
    expect(renderHeight({ start: 0, end: 100, width: 100 })).toBe(312)
  })
  it('defines stable rows for all six frames above reverse features', () => {
    const layout = viewerLayout({ start: 0, end: 1000, width: 100 })
    expect(layout.frameRows.map((row) => row.frame)).toEqual(FRAME_ORDER)
    expect(layout.frameRows.map((row) => row.y)).toEqual([72, 90, 108, 126, 144, 162])
    expect(layout.reverseFeatureY).toBeGreaterThan(layout.frameRows.at(-1)!.y + layout.frameRows.at(-1)!.height)
  })
  it('places stop bars by codon centre in the correct forward and reverse rows', () => {
    const view = { start: 0, end: 100, width: 1000 }
    const stops: StopCodonDto[] = [
      { genomic_start: 9, genomic_end: 12, frame: 1 },
      { genomic_start: 48, genomic_end: 51, frame: -3 },
    ]
    const compactLayout = viewerLayout({ start: 0, end: 1000, width: 100 })
    expect(stopBarGeometries(stops, view, compactLayout)).toMatchObject([
      { frame: 1, x: 105, y: 74, width: 1.5, height: 12 },
      { frame: -3, x: 495, y: 164, width: 1.5, height: 12 },
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
    const highlightIndex = calls.findIndex((call) => call[1] === 28)
    const firstBarIndex = calls.findIndex((call) => call[1] === 74 && call[2] === 1.5)
    expect(highlightIndex).toBeGreaterThanOrEqual(0)
    expect(firstBarIndex).toBeGreaterThan(highlightIndex)
  })
  it('draws compact bars without amino acids and detailed amino-acid symbols without bars', () => {
    const stop: StopCodonDto = { genomic_start: 9, genomic_end: 12, frame: 1 }
    renderGenome(context, genome, { start: 0, end: 1000, width: 100 }, { ...state, stopCodons: [stop] })
    expect(context.fillText).toHaveBeenCalledWith('+1', 7, 84)
    expect(context.fillText).not.toHaveBeenCalledWith('*', expect.any(Number), expect.any(Number))
    vi.clearAllMocks()
    renderGenome(context, genome, { start: 0, end: 100, width: 1000 }, {
      ...state,
      translation: { region_start: 0, region_end: 100, codons: [{
        ...stop, amino_acid: '*', codon: [84, 65, 65], is_start: false, is_stop: true,
      }] },
    })
    expect(context.fillText).toHaveBeenCalledWith('*', 105, 90)
  })
  it('positions search highlights on nucleotide and frame tracks', () => {
    const nucleotide: SequenceSearchMatchDto = {
      start: 10, end: 20, strand: 'Reverse', frame: null, matchType: 'nucleotide', matchedSequence: 'ACGT', geneticCode: null,
    }
    const nucleotideGeometry = searchHighlightGeometry(nucleotide, { start: 0, end: 100, width: 1000 })
    expect(nucleotideGeometry).toMatchObject({ x: 100, width: 100, y: 168, height: 22, label: 'match reverse' })
    const peptideGeometry = searchHighlightGeometry(
      { ...nucleotide, strand: 'Forward', frame: -2, matchType: 'amino_acid', geneticCode: 11 },
      { start: 0, end: 100, width: 1000 },
    )
    expect(peptideGeometry).toMatchObject({ x: 100, width: 100, y: 222, height: 18, label: 'match frame -2' })
  })
  it('draws a non-colour search cue without adding feature hit regions', () => {
    const match: SequenceSearchMatchDto = {
      start: 10, end: 20, strand: 'Forward', frame: null, matchType: 'nucleotide', matchedSequence: 'AAAAAAAAAA', geneticCode: null,
    }
    const result = renderGenome(context, genome, { start: 0, end: 100, width: 1000 }, { ...state, searchMatch: match })
    expect(context.rect).toHaveBeenCalled()
    expect(context.fillText).toHaveBeenCalledWith('match forward', expect.any(Number), expect.any(Number))
    expect(result.hitRegions.map((region) => region.featureId)).toEqual([7, 7])
  })
})
