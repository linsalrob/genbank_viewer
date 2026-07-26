<script lang="ts">
  import { onMount } from 'svelte'
  import FileLoader from './components/FileLoader.svelte'
  import GenomeCanvas from './components/GenomeCanvas.svelte'
  import FeatureInspector from './components/FeatureInspector.svelte'
  import SequenceSearch from './components/SequenceSearch.svelte'
  import type { BrowserError, FeatureDto, GeneticCodeMetadataDto, GenomeRecordDto, SequenceSearchMatchDto, SequenceSearchType } from './lib/genomeTypes'
  import { adjacentResultIndex, normalizeQueryForDisplay, sortSearchResults, viewportForSearchMatch } from './lib/search'
  import { parseGenbankWithWasm, searchSequence, supportedGeneticCodes } from './lib/wasm'
  import { bpPerPixel, parseCoordinateInput, zoom, type GenomeViewport } from './lib/viewport'

  let records: GenomeRecordDto[] = []
  let recordIndex = 0
  let selected: FeatureDto | null = null
  let viewport: GenomeViewport = { start: 0, end: 1, width: 1000 }
  let filename = ''
  let fileSize = 0
  let state: 'idle' | 'parsing' | 'ready' | 'error' = 'idle'
  let error: BrowserError | null = null
  let coordinate = ''
  let geneticCode = 11
  let showLabels = true
  let showStarts = true
  let showSourceFeatures = false
  let geneticCodes: GeneticCodeMetadataDto[] = []
  let searchQuery = ''
  let searchType: SequenceSearchType = 'nucleotide'
  let searchMatches: SequenceSearchMatchDto[] = []
  let searchIndex = -1
  let searchStatus = ''
  let searchError: string | null = null
  let searchMatch: SequenceSearchMatchDto | null = null
  $: searchMatch = searchMatches[searchIndex] ?? null
  $: genome = records[recordIndex]
  $: recordCodeIds = new Set<number>((genome?.features ?? []).flatMap((feature) =>
    feature.qualifiers
      .filter((qualifier) => qualifier.key.toLowerCase() === 'transl_table' && /^\d+$/.test(qualifier.value ?? ''))
      .map((qualifier) => Number(qualifier.value)),
  ))

  onMount(async () => {
    geneticCodes = await supportedGeneticCodes()
  })

  function showFileError(caught: unknown) {
    const candidate = caught as Partial<BrowserError>
    error = {
      code: candidate.code ?? 'unreadable_file',
      message: candidate.message ?? String(caught),
    }
    state = 'error'
  }

  async function loadFile(content: string, file: File) {
    clearSearch()
    records = []
    recordIndex = 0
    selected = null
    state = 'parsing'; error = null; filename = file.name; fileSize = file.size
    try {
      records = await parseGenbankWithWasm(content)
      recordIndex = 0
      selectRecord()
      state = 'ready'
    } catch (caught) {
      error = caught as BrowserError
      state = 'error'
    }
  }
  function selectRecord() {
    const record = records[recordIndex]
    if (!record) return
    viewport = { ...viewport, start: 0, end: Math.max(1, record.sequenceLength) }
    selected = null
    clearSearch()
  }
  function wholeGenome() {
    viewport = { ...viewport, start: 0, end: Math.max(1, genome.sequenceLength) }
  }
  function jump() {
    const range = parseCoordinateInput(coordinate, genome.sequenceLength)
    if (range && range.end > range.start) viewport = { ...viewport, ...range }
  }
  function copyDetails() {
    if (error) navigator.clipboard.writeText(JSON.stringify(error, null, 2))
  }
  function toggleSource() {
    showSourceFeatures = !showSourceFeatures
    if (!showSourceFeatures && selected?.type.toLowerCase() === 'source') selected = null
  }
  function clearSearch() {
    searchQuery = ''
    clearSearchResults()
  }
  function clearSearchResults() {
    searchMatches = []
    searchIndex = -1
    searchStatus = ''
    searchError = null
  }
  function selectSearchMatch(index: number) {
    const match = searchMatches[index]
    if (!match || !genome) return
    searchIndex = index
    viewport = viewportForSearchMatch(match, genome.sequenceLength, viewport.width)
  }
  function moveSearchMatch(direction: -1 | 1) {
    selectSearchMatch(adjacentResultIndex(searchIndex, searchMatches.length, direction))
  }
  async function performSearch() {
    if (!genome) return
    searchError = null
    searchStatus = 'Searching locally…'
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    try {
      searchMatches = sortSearchResults(await searchSequence(genome, searchQuery, searchType, geneticCode))
      const length = normalizeQueryForDisplay(searchQuery, searchType).length
      if (searchMatches.length === 0) {
        searchIndex = -1
        searchStatus = `No matches found · ${searchType === 'nucleotide' ? 'nucleotide' : 'amino acid'} query · ${length} ${searchType === 'nucleotide' ? 'bases' : 'residues'}${searchType === 'amino_acid' ? ` · genetic code ${geneticCode}` : ''}`
        return
      }
      searchStatus = `${searchMatches.length.toLocaleString()} match${searchMatches.length === 1 ? '' : 'es'} · ${searchType === 'nucleotide' ? 'nucleotide' : 'amino acid'} query · ${length} ${searchType === 'nucleotide' ? 'bases' : 'residues'}${searchType === 'amino_acid' ? ` · genetic code ${geneticCode}` : ''}`
      selectSearchMatch(0)
    } catch (caught) {
      searchMatches = []
      searchIndex = -1
      const candidate = caught as Partial<BrowserError>
      searchError = candidate.message ?? String(caught)
      searchStatus = ''
    }
  }
  function geneticCodeChanged() {
    if (searchType === 'amino_acid' && searchQuery.trim()) void performSearch()
  }
  function useFeatureCode(code: number) {
    geneticCode = code
    geneticCodeChanged()
  }
</script>

<svelte:head><title>genbank_viewer — local-first genome viewer</title></svelte:head>
<header><div><h1>genbank_viewer</h1><p>Local-first GenBank genome viewer</p></div><span class="privacy">Sequence data stays in your browser</span></header>
<main>
  <FileLoader onLoad={loadFile} onError={showFileError} />
  {#if state === 'parsing'}<p role="status">Parsing {filename}…</p>{/if}
  {#if error}
    <section class="error" role="alert"><h2>Could not load file</h2><p>{error.message}</p>
      {#if error.line}<p>Line {error.line}{error.offendingText ? `: ${error.offendingText}` : ''}</p>{/if}
      <button on:click={copyDetails}>Copy details</button>
    </section>
  {/if}
  {#if genome}
    <section class="file-facts" aria-label="Loaded file details">
      <span><strong>{filename}</strong> ({fileSize.toLocaleString()} bytes)</span>
      <span>{records.length} record{records.length === 1 ? '' : 's'}</span>
      <label>Record
        <select bind:value={recordIndex} on:change={selectRecord}>
          {#each records as record, index}<option value={index}>{record.id} — {record.sequenceLength.toLocaleString()} bp — {record.features.length} features</option>{/each}
        </select>
      </label>
    </section>
    <section class="summary" aria-label="Genome summary">
      <h2>{genome.id}</h2><p>{genome.description ?? 'No description'}</p>
      <dl>
        <div><dt>Accession</dt><dd>{genome.accession ?? '—'}</dd></div>
        <div><dt>Topology</dt><dd>{genome.topology}</dd></div>
        <div><dt>Length</dt><dd>{genome.sequenceLength.toLocaleString()} bp</dd></div>
        <div><dt>CDSs</dt><dd>{genome.codingSummary.cds_count}</dd></div>
        <div><dt>Coding density</dt><dd>{(genome.codingSummary.coding_density * 100).toFixed(1)}%</dd></div>
        <div><dt>Forward / reverse</dt><dd>{genome.codingSummary.forward_cds_count} / {genome.codingSummary.reverse_cds_count}</dd></div>
      </dl>
    </section>
    <nav class="toolbar" aria-label="Genome controls">
      <button on:click={wholeGenome}>Whole genome</button>
      <button aria-label="Zoom in" on:click={() => viewport = zoom(viewport, viewport.width / 2, 1.5, genome.sequenceLength)}>+</button>
      <button aria-label="Zoom out" on:click={() => viewport = zoom(viewport, viewport.width / 2, 1 / 1.5, genome.sequenceLength)}>−</button>
      <label>Position or range (1-based) <input bind:value={coordinate} on:keydown={(event) => event.key === 'Enter' && jump()} placeholder="5,000-10,000" /></label>
      <button on:click={jump}>Go</button>
      <label>Genetic code <select bind:value={geneticCode} on:change={geneticCodeChanged}>
        {#each geneticCodes as code}<option value={code.id}>{code.id} — {code.short_name}{recordCodeIds.has(code.id) ? ' • record' : ''}</option>{/each}
      </select></label>
      <label><input type="checkbox" bind:checked={showLabels} /> Labels</label>
      <label><input type="checkbox" bind:checked={showStarts} /> Start codons</label>
      <label><input type="checkbox" checked={showSourceFeatures} on:change={toggleSource} /> Show source feature</label>
      <output>{Math.floor(viewport.start + 1).toLocaleString()}..{Math.ceil(viewport.end).toLocaleString()} · {bpPerPixel(viewport).toFixed(2)} bp/px</output>
    </nav>
    <SequenceSearch bind:query={searchQuery} bind:searchType {geneticCode} features={genome.features}
      matches={searchMatches} selectedIndex={searchIndex} status={searchStatus} error={searchError}
      on:search={performSearch} on:clear={clearSearch} on:typechange={clearSearchResults}
      on:select={(event) => selectSearchMatch(event.detail)} on:previous={() => moveSearchMatch(-1)} on:next={() => moveSearchMatch(1)} />
    <div class="workspace">
      <section aria-label="Genome canvas region">
        <GenomeCanvas {genome} bind:viewport {geneticCode} {showLabels} {showStarts} {showSourceFeatures} selectedFeature={selected} {searchMatch}
          on:viewport={(event) => viewport = event.detail} on:select={(event) => selected = event.detail} />
        <p class="canvas-alt">Visible range {Math.floor(viewport.start + 1)}..{Math.ceil(viewport.end)}. Source features are {showSourceFeatures ? 'visible' : 'hidden'}. Genetic code {geneticCode}.{searchMatch ? ` Sequence-search match highlighted at ${searchMatch.start + 1}..${searchMatch.end}.` : ''} Forward CDSs point right; reverse CDSs point left. Stops are red and marked “*”.</p>
      </section>
      <section aria-label="Feature inspector region">
        <FeatureInspector feature={selected} {geneticCode} supportedCodes={geneticCodes} on:usecode={(event) => useFeatureCode(event.detail)} />
      </section>
    </div>
    {#if genome.warnings.length}
      <details class="warnings" open><summary>{genome.warnings.length} parser warning{genome.warnings.length === 1 ? '' : 's'}</summary>
        <ul>{#each genome.warnings as warning}<li><strong>{warning.code.replaceAll('_', ' ')}</strong>{warning.line ? `, line ${warning.line}` : ''}: {warning.message}</li>{/each}</ul>
      </details>
    {/if}
    <footer role="status">{state === 'ready' ? `Loaded ${genome.id}: ${genome.sequenceLength.toLocaleString()} bp, ${genome.features.length} features, ${genome.warnings.length} warnings` : 'Open a GenBank file'}</footer>
  {/if}
</main>

<style>
  :global(*) { box-sizing:border-box } :global(body) { margin:0; color:#172433; background:#edf2f6; font-family:system-ui,sans-serif }
  :global(button), :global(input), :global(select) { font:inherit } :global(button:focus-visible), :global(input:focus-visible), :global(select:focus-visible) { outline:3px solid #ffbf47; outline-offset:2px }
  header { display:flex; justify-content:space-between; align-items:center; padding:.8rem max(1rem, calc((100% - 1500px)/2)); color:#fff; background:#173e51 }
  h1 { margin:0 } header p { margin:.1rem 0 } .privacy { padding:.4rem .7rem; border:1px solid #8ed7c4; border-radius:2rem }
  main { display:grid; gap:1rem; max-width:1500px; margin:auto; padding:1rem }
  .file-facts,.toolbar { display:flex; flex-wrap:wrap; gap:.7rem; align-items:center; padding:.7rem; background:#fff; border-radius:.5rem }
  .summary { padding:.8rem 1rem; background:#fff; border-radius:.5rem } .summary h2,.summary p { margin:.2rem 0 }
  dl { display:flex; flex-wrap:wrap; gap:1rem 2rem } dl div { min-width:8rem } dt { font-size:.8rem; color:#526475 } dd { margin:0; font-weight:700 }
  .workspace { display:grid; grid-template-columns:minmax(0,1fr); gap:1rem; min-width:0 }
  .canvas-alt { margin:.35rem 0; font-size:.85rem } .warnings { padding:1rem; background:#fff8db; border-left:5px solid #ad7400 }
  .error { padding:1rem; background:#fff0f1; border-left:5px solid #b31b34 } footer { padding:.55rem; color:#fff; background:#344b5e; border-radius:.3rem }
  @media (max-width:800px) { header { display:block } .privacy { display:block; margin-top:.5rem } }
  @media (prefers-reduced-motion:reduce) { :global(*) { scroll-behavior:auto !important } }
</style>
