export interface GenomeViewport { start: number; end: number; width: number }
export type Viewport = GenomeViewport
export const MIN_VISIBLE_BASES = 3

export function bpPerPixel(view: GenomeViewport): number {
  return (view.end - view.start) / Math.max(1, view.width)
}

export function genomeToScreen(position: number, view: GenomeViewport): number {
  return (position - view.start) / bpPerPixel(view)
}

export function screenToGenome(pixel: number, view: GenomeViewport): number {
  return view.start + pixel * bpPerPixel(view)
}

export function clampViewport(view: GenomeViewport, genomeLength: number): GenomeViewport {
  const length = Math.max(1, genomeLength)
  const span = Math.min(length, Math.max(Math.min(MIN_VISIBLE_BASES, length), view.end - view.start))
  const start = Math.max(0, Math.min(length - span, view.start))
  return { ...view, start, end: start + span }
}

export function pan(view: GenomeViewport, deltaPixels: number, genomeLength: number): GenomeViewport {
  const delta = deltaPixels * bpPerPixel(view)
  return clampViewport({ ...view, start: view.start - delta, end: view.end - delta }, genomeLength)
}

export function zoom(view: GenomeViewport, anchorPixel: number, factor: number, genomeLength: number): GenomeViewport {
  const anchor = screenToGenome(anchorPixel, view)
  const span = Math.max(MIN_VISIBLE_BASES, Math.min(genomeLength, (view.end - view.start) / factor))
  const fraction = Math.max(0, Math.min(1, anchorPixel / Math.max(1, view.width)))
  return clampViewport({ ...view, start: anchor - span * fraction, end: anchor + span * (1 - fraction) }, genomeLength)
}

export function parseCoordinateInput(input: string, genomeLength: number): { start: number; end: number } | null {
  const normalized = input.trim().replaceAll(',', '').replace(/\s+/g, '')
  const match = normalized.match(/^(\d+)(?:(?:\.\.|-)(\d+))?$/)
  if (!match) return null
  const first = Number(match[1])
  const second = Number(match[2] ?? match[1])
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(second) || first < 1 || second < first) return null
  return { start: Math.min(genomeLength, first - 1), end: Math.min(genomeLength, second) }
}
