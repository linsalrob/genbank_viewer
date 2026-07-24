import { describe, expect, it } from 'vitest'
import { featureGeometry, hitTest, rulerStep } from './renderer'
import type { FeatureDto } from './genomeTypes'

const feature: FeatureDto = {
  id: 7, type: 'CDS', strand: 1, start: 10, end: 40, label: 'abc',
  parts: [
    { start: 10, end: 20, partialStart: false, partialEnd: false },
    { start: 30, end: 40, partialStart: false, partialEnd: true },
  ],
  qualifiers: [],
}
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
})
