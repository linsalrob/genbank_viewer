<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import type { FeatureDto, GenomeRecordDto, SequenceSearchMatchDto, StopCodonDto, TranslationDto } from '../lib/genomeTypes'
  import { classifyFeatureType, displayFeatureLabel, type FeatureGroupId } from '../lib/featureGroups'
  import { buildViewerLayout, hitTest, renderGenome, renderHeight, renderMode, searchHighlightGeometries, type HitRegion } from '../lib/renderer'
  import { bindInteractions } from '../lib/interactions'
  import { stopCodonsInRegion, translateRegion } from '../lib/wasm'
  import type { GenomeViewport } from '../lib/viewport'

  export let genome: GenomeRecordDto
  export let viewport: GenomeViewport
  export let geneticCode = 11
  export let showLabels = true
  export let showStarts = true
  export let visibleGroups: Set<FeatureGroupId>
  export let selectedFeature: FeatureDto | null = null
  export let searchMatch: SequenceSearchMatchDto | null = null
  const dispatch = createEventDispatcher<{ viewport: GenomeViewport; select: FeatureDto | null }>()
  let canvas: HTMLCanvasElement
  let translation: TranslationDto | undefined
  let stopCodons: StopCodonDto[] = []
  let hits: HitRegion[] = []
  let frame = 0
  let translationRequest = 0
  let renderDataCode = geneticCode
  let tooltip: { x: number; y: number; feature: FeatureDto } | null = null

  function queueDraw() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(draw)
  }
  function draw() {
    const context = canvas?.getContext('2d')
    if (!context) return
    const ratio = window.devicePixelRatio || 1
    const cssHeight = renderHeight(viewport, visibleGroups, genome.features)
    canvas.width = Math.round(viewport.width * ratio)
    canvas.height = Math.round(cssHeight * ratio)
    canvas.style.height = `${cssHeight}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    const result = renderGenome(context, genome, viewport, {
      selectedFeatureId: selectedFeature?.id, showLabels, showStarts, visibleGroups,
      searchMatch, stopCodons, translation,
    })
    hits = result.hitRegions
    canvas.dataset.renderMode = renderMode(viewport)
    canvas.dataset.stopCount = String(renderMode(viewport) === 'stop_tracks' ? stopCodons.length : 0)
    canvas.dataset.translatedCodonCount = String(renderMode(viewport) === 'sequence' ? (translation?.codons.length ?? 0) : 0)
    canvas.dataset.renderDataCode = String(renderDataCode)
    const layout = buildViewerLayout(viewport, visibleGroups, { features: genome.features })
    const highlight = searchMatch ? searchHighlightGeometries(searchMatch, viewport, layout) : []
    canvas.dataset.searchHighlightMode = searchMatch ? renderMode(viewport) : 'none'
    canvas.dataset.searchHighlightTargets = highlight.map((geometry) =>
      geometry.target.kind === 'frame'
        ? `frame:${geometry.target.frame > 0 ? '+' : ''}${geometry.target.frame}`
        : `nucleotide:${geometry.target.strand}`
    ).join(',')
    canvas.dataset.visibleGroups = [...visibleGroups].sort().join(',')
    canvas.dataset.visibleFeatureTypes = genome.features.filter((feature) => visibleGroups.has(classifyFeatureType(feature.type))).map((feature) => feature.type).join(',')
    canvas.dataset.trackRows = JSON.stringify(layout.trackRows.map((row) => ({ id: row.id, y: row.y, height: row.height })))
  }
  async function updateRenderData() {
    const request = ++translationRequest
    const mode = renderMode(viewport)
    const data = mode === 'sequence'
      ? await translateRegion(genome, viewport.start, viewport.end, geneticCode)
      : await stopCodonsInRegion(genome, viewport.start, viewport.end, geneticCode)
    if (request !== translationRequest || mode !== renderMode(viewport)) return
    if (mode === 'sequence') {
      translation = data as TranslationDto
      stopCodons = []
    } else {
      stopCodons = data as StopCodonDto[]
      translation = undefined
    }
    renderDataCode = geneticCode
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
  function describeSearchMatch(match: SequenceSearchMatchDto | null, currentViewport: GenomeViewport) {
    if (!match) return 'No sequence search match highlighted.'
    const interval = `Sequence search match ${match.start + 1} through ${match.end} highlighted.`
    if (renderMode(currentViewport) === 'sequence') {
      return `${interval} The matched nucleotide or amino-acid sequence is highlighted directly in its detailed row.`
    }
    if (match.matchType === 'amino_acid') {
      return `${interval} The peptide match highlights only reading frame ${match.frame! > 0 ? '+' : ''}${match.frame}.`
    }
    return `${interval} ${match.strand === 'Unknown'
      ? 'The nucleotide match highlights both forward and reverse strand lanes.'
      : `The nucleotide match highlights only the ${match.strand.toLowerCase()} strand lane.`}`
  }

  $: if (canvas && genome && viewport && geneticCode) updateRenderData()
  $: if (canvas && visibleGroups && searchMatch !== undefined) queueDraw()
  $: searchDescription = describeSearchMatch(searchMatch, viewport)

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
    aria-label={`Genome viewer for ${genome.id}. ${genome.features.filter((feature) => visibleGroups.has(classifyFeatureType(feature.type))).length} visible annotations. Visible track groups: ${[...visibleGroups].join(', ')}. Forward and reverse annotation tracks are separated; broad regions are behind gene tracks. Genetic code ${geneticCode}. ${renderMode(viewport) === 'stop_tracks' ? 'Zoomed-out view shows stop codons as vertical bars in six reading-frame tracks.' : 'Zoomed-in view shows nucleotide and amino-acid sequences in six reading frames.'} ${searchDescription} Use arrows to pan, plus and minus to zoom, Home for the whole genome.`}
    on:click={click}
    on:mousemove={hover}
    on:mouseleave={() => tooltip = null}
  ></canvas>
  {#if tooltip}
    <div class="tooltip" style={`left:${tooltip.x + 12}px;top:${tooltip.y + 12}px`}>
      <strong>{displayFeatureLabel(tooltip.feature)}</strong><br />
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
