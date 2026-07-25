import { describe, expect, it, vi } from 'vitest'
import { featureGeometry, featuresForRendering, hitTest, renderGenome, renderHeight, rulerStep } from './renderer'
import type { FeatureDto, GenomeRecordDto } from './genomeTypes'

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
  strokeRect: vi.fn(), fillStyle: '', strokeStyle: '', font: '', textAlign: '', lineWidth: 1,
} as unknown as CanvasRenderingContext2D
const state = { showLabels: true, showStarts: true, showSourceFeatures: false }
describe('renderer geometry', () => {
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
    expect(hitTest(visible, 5, 40)).toBe(1)
  })
  it('uses taller responsive render layouts', () => {
    expect(renderHeight({ start: 0, end: 1000, width: 100 })).toBe(140)
    expect(renderHeight({ start: 0, end: 100, width: 100 })).toBe(312)
  })
})
