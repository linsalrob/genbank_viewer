<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { FeatureDto, SequenceSearchMatchDto, SequenceSearchType } from '../lib/genomeTypes'
  import { searchResultLabel } from '../lib/search'

  export let query: string
  export let searchType: SequenceSearchType
  export let matches: SequenceSearchMatchDto[]
  export let selectedIndex: number
  export let status: string
  export let error: string | null
  export let geneticCode: number
  export let features: FeatureDto[]
  const dispatch = createEventDispatcher<{
    search: void; clear: void; select: number; previous: void; next: void; typechange: void
  }>()
  const DISPLAY_LIMIT = 100

  function keyboard(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      dispatch('search')
    }
  }
  function overlaps(match: SequenceSearchMatchDto) {
    return features.filter((feature) => feature.start < match.end && feature.end > match.start).slice(0, 5)
  }
</script>

<section class="search-panel" aria-labelledby="sequence-search-heading">
  <h2 id="sequence-search-heading">Sequence search</h2>
  <div class="search-controls">
    <label>Search type
      <select bind:value={searchType} aria-label="Sequence search type" on:change={() => dispatch('typechange')}>
        <option value="nucleotide">Nucleotide</option>
        <option value="amino_acid">Amino acid</option>
      </select>
    </label>
    <label class="query">Sequence
      <textarea bind:value={query} on:keydown={keyboard} rows="3" placeholder="Paste sequence or FASTA text" aria-describedby="sequence-search-help"></textarea>
    </label>
    <div class="buttons">
      <button on:click={() => dispatch('search')}>Search</button>
      <button on:click={() => dispatch('clear')}>Clear search</button>
    </div>
  </div>
  <p id="sequence-search-help" class="help">FASTA headers and whitespace are ignored. Press Ctrl+Enter or Cmd+Enter to search.</p>
  <div class="status" role="status" aria-live="polite">
    {#if error}<span class="validation">{error}</span>{:else}{status}{/if}
  </div>
  {#if matches.length}
    <div class="navigation">
      <button aria-label="Previous sequence match" on:click={() => dispatch('previous')}>Previous</button>
      <strong>{selectedIndex + 1} of {matches.length}</strong>
      <button aria-label="Next sequence match" on:click={() => dispatch('next')}>Next</button>
      {#if matches.length > 1000}<span class="warning">This query produced {matches.length.toLocaleString()} matches. Refine the sequence to narrow the results.</span>{/if}
    </div>
    <ol class="results" aria-label="Sequence search results">
      {#each matches.slice(0, DISPLAY_LIMIT) as match, index}
        <li class:selected={index === selectedIndex}>
          <button aria-current={index === selectedIndex ? 'true' : undefined} on:click={() => dispatch('select', index)}>
            {searchResultLabel(match)}
          </button>
          {#if index === selectedIndex}
            <span class="details">Matched {match.matchedSequence}{match.matchType === 'amino_acid' ? ` · genetic code ${match.geneticCode ?? geneticCode}` : ''}</span>
            {@const annotations = overlaps(match)}
            {#if annotations.length}<span class="details">Overlaps: {annotations.map((feature) => feature.locusTag ?? feature.gene ?? feature.product ?? feature.type).join(', ')}</span>{/if}
          {/if}
        </li>
      {/each}
    </ol>
    {#if matches.length > DISPLAY_LIMIT}<p>Showing the first {DISPLAY_LIMIT} of {matches.length.toLocaleString()} matches. Previous and Next navigate the complete result set.</p>{/if}
  {/if}
</section>

<style>
  .search-panel { padding:.8rem 1rem; background:#fff; border:1px solid #c7d2dc; border-radius:.5rem }
  h2 { margin:0 0 .6rem; font-size:1.1rem }
  .search-controls { display:grid; grid-template-columns:minmax(10rem,auto) minmax(18rem,1fr) auto; gap:.7rem; align-items:end }
  label { display:grid; gap:.25rem; font-weight:700 } textarea { width:100%; resize:vertical; font:inherit; font-family:ui-monospace,monospace }
  .buttons,.navigation { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center }
  .help,.status { margin:.45rem 0 0; font-size:.88rem } .validation,.warning { color:#9b1c31; font-weight:700 }
  .results { max-height:15rem; margin:.6rem 0 0; padding-left:2rem; overflow:auto }
  .results li { margin:.2rem 0; padding:.25rem; border-left:4px solid transparent }
  .results li.selected { border-color:#147d64; background:#e8f7f2 }
  .results button { text-align:left } .details { display:block; margin:.2rem 0; overflow-wrap:anywhere }
  @media (max-width:800px) { .search-controls { grid-template-columns:1fr } }
</style>
