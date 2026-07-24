<script lang="ts">
  import type { ParsedGenome } from '../lib/genomeTypes'
  export let genome: ParsedGenome | null
</script>

{#if genome}
  <p>{genome.features.length} CDS features loaded.</p>
{/if}
