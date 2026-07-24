import { describe, expect, it } from 'vitest'
import { genomeToScreen, pan, parseCoordinateInput, screenToGenome, zoom } from './viewport'

const view = { start: 100, end: 200, width: 1000 }
describe('viewport', () => {
  it('round trips genome and screen coordinates', () => {
    expect(screenToGenome(genomeToScreen(137, view), view)).toBeCloseTo(137)
  })
  it('keeps the cursor anchor stable while zooming', () => {
    const next = zoom(view, 250, 2, 1000)
    expect(screenToGenome(250, next)).toBeCloseTo(screenToGenome(250, view))
  })
  it('pans and clamps at boundaries', () => {
    expect(pan(view, 2000, 1000).start).toBe(0)
    expect(pan(view, -20000, 1000).end).toBe(1000)
  })
  it('parses one-based user ranges', () => {
    expect(parseCoordinateInput('5,000-10,000', 20_000)).toEqual({ start: 4999, end: 10000 })
    expect(parseCoordinateInput('5000..10000', 20_000)).toEqual({ start: 4999, end: 10000 })
    expect(parseCoordinateInput('5000', 20_000)).toEqual({ start: 4999, end: 5000 })
    expect(parseCoordinateInput('0', 20_000)).toBeNull()
  })
})
