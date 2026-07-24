import { pan, zoom, type GenomeViewport } from './viewport'

export function bindInteractions(
  canvas: HTMLCanvasElement,
  getView: () => GenomeViewport,
  setView: (view: GenomeViewport) => void,
  getGenomeLength: () => number,
): () => void {
  let dragging = false
  let lastX = 0
  const localX = (event: MouseEvent | WheelEvent) => event.clientX - canvas.getBoundingClientRect().left
  const onDown = (event: MouseEvent) => { dragging = true; lastX = event.clientX }
  const onUp = () => { dragging = false }
  const onMove = (event: MouseEvent) => {
    if (!dragging) return
    const delta = event.clientX - lastX
    lastX = event.clientX
    setView(pan(getView(), delta, getGenomeLength()))
  }
  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    setView(zoom(getView(), localX(event), Math.exp(-event.deltaY * 0.002), getGenomeLength()))
  }
  const onDoubleClick = (event: MouseEvent) =>
    setView(zoom(getView(), localX(event), 2, getGenomeLength()))
  const onKey = (event: KeyboardEvent) => {
    const view = getView()
    if (event.key === 'ArrowLeft') setView(pan(view, view.width * -0.1, getGenomeLength()))
    else if (event.key === 'ArrowRight') setView(pan(view, view.width * 0.1, getGenomeLength()))
    else if (event.key === '+' || event.key === '=') setView(zoom(view, view.width / 2, 1.5, getGenomeLength()))
    else if (event.key === '-') setView(zoom(view, view.width / 2, 1 / 1.5, getGenomeLength()))
    else if (event.key === 'Home') setView({ ...view, start: 0, end: getGenomeLength() })
    else return
    event.preventDefault()
  }
  canvas.addEventListener('mousedown', onDown)
  window.addEventListener('mouseup', onUp)
  canvas.addEventListener('mousemove', onMove)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('dblclick', onDoubleClick)
  canvas.addEventListener('keydown', onKey)
  return () => {
    canvas.removeEventListener('mousedown', onDown)
    window.removeEventListener('mouseup', onUp)
    canvas.removeEventListener('mousemove', onMove)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('dblclick', onDoubleClick)
    canvas.removeEventListener('keydown', onKey)
  }
}
