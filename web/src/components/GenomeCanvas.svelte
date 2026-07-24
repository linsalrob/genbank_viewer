<script lang="ts">
  import { onMount } from 'svelte'
  import type { ParsedGenome } from '../lib/genomeTypes'
  import { renderGenome } from '../lib/renderer'
  import { bindInteractions } from '../lib/interactions'
  import type { Viewport } from '../lib/viewport'

  export let genome: ParsedGenome | null
  let canvas: HTMLCanvasElement
  let view: Viewport = { start: 0, end: 1, width: 1000 }

  function redraw() {
    if (!canvas || !genome) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    view.width = canvas.width
    renderGenome(ctx, genome, view)
  }

  $: if (genome) {
    view = { start: 0, end: Math.min(genome.sequence.length, 5000), width: canvas?.width ?? 1000 }
    redraw()
  }

  onMount(() => {
    const cleanup = bindInteractions(
      canvas,
      () => view,
      (v) => {
        view = v
        redraw()
      },
      () => genome?.sequence.length ?? 1,
    )
    redraw()
    return cleanup
  })
</script>

<canvas bind:this={canvas} width="1200" height="420" style="border: 1px solid #ddd; width: 100%;"></canvas>
