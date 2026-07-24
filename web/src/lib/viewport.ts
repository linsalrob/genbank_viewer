export type Viewport = {
  start: number
  end: number
  width: number
}

export function bpPerPixel(view: Viewport): number {
  return (view.end - view.start) / Math.max(1, view.width)
}

export function pan(view: Viewport, deltaPx: number, genomeLen: number): Viewport {
  const deltaBp = deltaPx * bpPerPixel(view)
  const span = view.end - view.start
  const nextStart = Math.max(0, Math.min(genomeLen - span, view.start - deltaBp))
  return { ...view, start: nextStart, end: nextStart + span }
}

export function zoom(view: Viewport, anchorPx: number, factor: number, genomeLen: number): Viewport {
  const anchorBp = view.start + anchorPx * bpPerPixel(view)
  const span = Math.max(20, Math.min(genomeLen, (view.end - view.start) / factor))
  const frac = anchorPx / Math.max(1, view.width)
  let nextStart = anchorBp - span * frac
  nextStart = Math.max(0, Math.min(genomeLen - span, nextStart))
  return { ...view, start: nextStart, end: nextStart + span }
}
