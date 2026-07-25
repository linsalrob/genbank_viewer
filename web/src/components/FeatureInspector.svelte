<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { FeatureDto, GeneticCodeMetadataDto } from '../lib/genomeTypes'

  export let feature: FeatureDto | null
  export let geneticCode: number
  export let supportedCodes: GeneticCodeMetadataDto[]
  const dispatch = createEventDispatcher<{ usecode: number }>()
  const coordinates = (item: FeatureDto) => `${(item.start + 1).toLocaleString()}..${item.end.toLocaleString()}`
  $: declaredCodeText = feature?.qualifiers.find(
    (qualifier) => qualifier.key.toLowerCase() === 'transl_table',
  )?.value
  $: declaredCode = declaredCodeText && /^\d+$/.test(declaredCodeText)
    ? Number(declaredCodeText)
    : undefined
  $: declaredMetadata = supportedCodes.find((code) => code.id === declaredCode)
</script>

<aside aria-label="Feature inspector">
  <h2>Feature inspector</h2>
  {#if feature}
    <h3>{feature.label}</h3>
    {#if declaredCodeText}
      <div class="declared-code">
        <strong>Declared translation table: {declaredCodeText}{declaredMetadata ? ` — ${declaredMetadata.short_name}` : ' (unsupported)'}</strong>
        {#if declaredMetadata && declaredCode !== geneticCode}
          <button on:click={() => dispatch('usecode', declaredCode!)}>Use feature code {declaredCode}</button>
        {/if}
      </div>
    {/if}
    <dl class="facts">
      <div><dt>Type</dt><dd>{feature.type}</dd></div>
      <div><dt>Coordinates (1-based)</dt><dd>{coordinates(feature)}</dd></div>
      <div><dt>Strand</dt><dd>{feature.strand === 1 ? 'Forward →' : feature.strand === -1 ? 'Reverse ←' : 'Unknown'}</dd></div>
      <div><dt>Length</dt><dd>{feature.parts.reduce((sum, part) => sum + part.end - part.start, 0).toLocaleString()} bp</dd></div>
      {#if feature.locusTag}<div><dt>Locus tag</dt><dd>{feature.locusTag}</dd></div>{/if}
      {#if feature.gene}<div><dt>Gene</dt><dd>{feature.gene}</dd></div>{/if}
      {#if feature.proteinId}<div><dt>Protein ID</dt><dd>{feature.proteinId}</dd></div>{/if}
      {#if feature.product}<div class="wide"><dt>Product</dt><dd>{feature.product}</dd></div>{/if}
    </dl>
    <h4>Constituent intervals</h4>
    <ol>{#each feature.parts as part}<li>{part.start + 1}..{part.end}{part.partialStart || part.partialEnd ? ' (partial)' : ''}</li>{/each}</ol>
    {#if feature.translation}<details><summary>Translation qualifier</summary><code>{feature.translation}</code></details>{/if}
    <details><summary>All qualifiers</summary><dl class="qualifiers">{#each feature.qualifiers as qualifier}<dt>/{qualifier.key}</dt><dd>{qualifier.value ?? '(valueless)'}</dd>{/each}</dl></details>
    <details><summary>Technical coordinates</summary><code>[{feature.start}, {feature.end})</code></details>
  {:else}
    <p>Select a feature in the genome view to inspect its annotations.</p>
  {/if}
</aside>

<style>
  aside { min-width:0; padding:1rem; background:#f8fafc; border:1px solid #b9c6d2; border-radius:.5rem; overflow-wrap:anywhere }
  h2 { margin-top:0 } .facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr)); gap:.7rem 1rem }
  .facts div { min-width:0; padding:.5rem; background:#fff; border-radius:.3rem } .facts .wide { grid-column:1/-1 }
  dt { font-weight:700 } dd { min-width:0; margin:.15rem 0 0; overflow-wrap:anywhere }
  .qualifiers { display:grid; grid-template-columns:minmax(7rem,max-content) minmax(0,1fr); gap:.35rem .7rem }
  .declared-code { display:flex; flex-wrap:wrap; gap:.7rem; align-items:center; margin:.5rem 0 1rem; padding:.65rem; border-left:4px solid #147d64; background:#e8f7f2 }
  code { display:block; max-width:100%; white-space:pre-wrap; overflow-wrap:anywhere }
  @media (max-width:600px) { .qualifiers { grid-template-columns:1fr } }
</style>
