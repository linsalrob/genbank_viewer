import { pan, zoom, type Viewport } from './viewport'

export function bindInteractions(
  canvas: HTMLCanvasElement,
  getView: () => Viewport,
  setView: (view: Viewport) => void,
  getGenomeLength: () => number,
): () => void {
  let dragging = false
  let lastX = 0

  const onDown = (e: MouseEvent) => {
    dragging = true
    lastX = e.clientX
  }
  const onUp = () => {
    dragging = false
  }
  const onMove = (e: MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    lastX = e.clientX
    setView(pan(getView(), dx, getGenomeLength()))
  }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15
    setView(zoom(getView(), x, factor, getGenomeLength()))
  }

  canvas.addEventListener('mousedown', onDown)
  window.addEventListener('mouseup', onUp)
  canvas.addEventListener('mousemove', onMove)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  return () => {
    canvas.removeEventListener('mousedown', onDown)
    window.removeEventListener('mouseup', onUp)
    canvas.removeEventListener('mousemove', onMove)
    canvas.removeEventListener('wheel', onWheel)
  }
}
