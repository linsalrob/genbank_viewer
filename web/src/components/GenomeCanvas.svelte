<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import type { FeatureDto, GenomeRecordDto, TranslationDto } from '../lib/genomeTypes'
  import { hitTest, renderGenome, renderHeight, type HitRegion } from '../lib/renderer'
  import { bindInteractions } from '../lib/interactions'
  import { translateRegion } from '../lib/wasm'
  import type { GenomeViewport } from '../lib/viewport'

  export let genome: GenomeRecordDto
  export let viewport: GenomeViewport
  export let geneticCode = 11
  export let showLabels = true
  export let showStarts = true
  export let showSourceFeatures = false
  export let selectedFeature: FeatureDto | null = null
  const dispatch = createEventDispatcher<{ viewport: GenomeViewport; select: FeatureDto | null }>()
  let canvas: HTMLCanvasElement
  let translation: TranslationDto | undefined
  let hits: HitRegion[] = []
  let frame = 0
  let tooltip: { x: number; y: number; feature: FeatureDto } | null = null

  function queueDraw() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(draw)
  }
  function draw() {
    const context = canvas?.getContext('2d')
    if (!context) return
    const ratio = window.devicePixelRatio || 1
    const cssHeight = renderHeight(viewport)
    canvas.width = Math.round(viewport.width * ratio)
    canvas.height = Math.round(cssHeight * ratio)
    canvas.style.height = `${cssHeight}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    hits = renderGenome(context, genome, viewport, {
      selectedFeatureId: selectedFeature?.id, showLabels, showStarts, showSourceFeatures, translation,
    }).hitRegions
  }
  async function updateTranslation() {
    translation = await translateRegion(genome, viewport.start, viewport.end, geneticCode)
    queueDraw()
  }
  function setViewport(next: GenomeViewport) {
    viewport = next
    dispatch('viewport', next)
  }
  function pointer(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  function click(event: MouseEvent) {
    const point = pointer(event)
    const id = hitTest(hits, point.x, point.y)
    dispatch('select', genome.features.find((feature) => feature.id === id) ?? null)
  }
  function hover(event: MouseEvent) {
    const point = pointer(event)
    const id = hitTest(hits, point.x, point.y)
    const feature = genome.features.find((item) => item.id === id)
    tooltip = feature ? { ...point, feature } : null
  }

  $: if (canvas && genome && viewport && geneticCode) updateTranslation()
  $: if (canvas && showSourceFeatures !== undefined) queueDraw()

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      viewport = { ...viewport, width: Math.max(1, entry.contentRect.width) }
      dispatch('viewport', viewport)
      queueDraw()
    })
    observer.observe(canvas.parentElement!)
    const cleanup = bindInteractions(canvas, () => viewport, setViewport, () => genome.sequenceLength)
    queueDraw()
    return () => { observer.disconnect(); cleanup(); cancelAnimationFrame(frame) }
  })
</script>

<div class="canvas-shell">
  <canvas
    bind:this={canvas}
    tabindex="0"
    aria-label={`Genome viewer for ${genome.id}. ${genome.features.length} parsed features. Source features are ${showSourceFeatures ? 'visible' : 'hidden'}. Genetic code ${geneticCode}. Use arrows to pan, plus and minus to zoom, Home for the whole genome.`}
    on:click={click}
    on:mousemove={hover}
    on:mouseleave={() => tooltip = null}
  ></canvas>
  {#if tooltip}
    <div class="tooltip" style={`left:${tooltip.x + 12}px;top:${tooltip.y + 12}px`}>
      <strong>{tooltip.feature.label}</strong><br />
      {tooltip.feature.product ?? tooltip.feature.type}<br />
      {tooltip.feature.strand === 1 ? '→' : '←'} {tooltip.feature.start + 1}..{tooltip.feature.end}
    </div>
  {/if}
</div>

<style>
  .canvas-shell { position:relative; min-width:0 }
  canvas { display:block; width:100%; border:1px solid #aebbc7; background:#fff; cursor:crosshair; touch-action:none }
  canvas:focus { outline:3px solid #ffbf47; outline-offset:2px }
  .tooltip { position:absolute; z-index:3; pointer-events:none; padding:.45rem; border-radius:.3rem; color:#fff; background:#172433; font-size:.8rem; max-width:18rem }
</style>
