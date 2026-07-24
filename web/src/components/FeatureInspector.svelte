<script lang="ts">
  import type { FeatureDto } from '../lib/genomeTypes'
  export let feature: FeatureDto | null
  const coordinates = (item: FeatureDto) => `${(item.start + 1).toLocaleString()}..${item.end.toLocaleString()}`
</script>

<aside aria-label="Feature inspector">
  <h2>Feature inspector</h2>
  {#if feature}
    <h3>{feature.label}</h3>
    <dl>
      <dt>Type</dt><dd>{feature.type}</dd>
      <dt>Coordinates (1-based)</dt><dd>{coordinates(feature)}</dd>
      <dt>Strand</dt><dd>{feature.strand === 1 ? 'Forward →' : feature.strand === -1 ? 'Reverse ←' : 'Unknown'}</dd>
      <dt>Length</dt><dd>{feature.parts.reduce((sum, part) => sum + part.end - part.start, 0).toLocaleString()} bp</dd>
      {#if feature.locusTag}<dt>Locus tag</dt><dd>{feature.locusTag}</dd>{/if}
      {#if feature.gene}<dt>Gene</dt><dd>{feature.gene}</dd>{/if}
      {#if feature.proteinId}<dt>Protein ID</dt><dd>{feature.proteinId}</dd>{/if}
      {#if feature.product}<dt>Product</dt><dd>{feature.product}</dd>{/if}
    </dl>
    <h4>Constituent intervals</h4>
    <ol>{#each feature.parts as part}<li>{part.start + 1}..{part.end}{part.partialStart || part.partialEnd ? ' (partial)' : ''}</li>{/each}</ol>
    {#if feature.translation}<details><summary>Translation qualifier</summary><code>{feature.translation}</code></details>{/if}
    <details><summary>All qualifiers</summary><dl>{#each feature.qualifiers as qualifier}<dt>/{qualifier.key}</dt><dd>{qualifier.value ?? '(valueless)'}</dd>{/each}</dl></details>
    <details><summary>Technical coordinates</summary><code>[{feature.start}, {feature.end})</code></details>
  {:else}
    <p>Select a feature arrow in the viewer to inspect it.</p>
  {/if}
</aside>

<style>
  aside { padding:1rem; background:#f8fafc; border:1px solid #d5dde5; border-radius:.5rem; overflow-wrap:anywhere }
  h2 { margin-top:0 } dl { display:grid; grid-template-columns:max-content 1fr; gap:.35rem .7rem } dt { font-weight:700 } dd { margin:0 }
  code { white-space:pre-wrap }
</style>
