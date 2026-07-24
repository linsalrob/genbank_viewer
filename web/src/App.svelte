<script lang="ts">
  import FileLoader from './components/FileLoader.svelte'
  import GenomeCanvas from './components/GenomeCanvas.svelte'
  import FeatureInspector from './components/FeatureInspector.svelte'
  import type { BrowserError, FeatureDto, GenomeRecordDto } from './lib/genomeTypes'
  import { parseGenbankWithWasm } from './lib/wasm'
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
  $: genome = records[recordIndex]

  async function loadFile(content: string, file: File) {
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
</script>

<svelte:head><title>Webtemis — local-first genome viewer</title></svelte:head>
<header><div><h1>Webtemis</h1><p>Local-first GenBank genome viewer</p></div><span class="privacy">Sequence data stays in your browser</span></header>
<main>
  <FileLoader onLoad={loadFile} />
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
      <label>Genetic code <select bind:value={geneticCode}><option value={11}>11 — Bacterial</option><option value={1}>1 — Standard</option></select></label>
      <label><input type="checkbox" bind:checked={showLabels} /> Labels</label>
      <label><input type="checkbox" bind:checked={showStarts} /> Start codons</label>
      <output>{Math.floor(viewport.start + 1).toLocaleString()}..{Math.ceil(viewport.end).toLocaleString()} · {bpPerPixel(viewport).toFixed(2)} bp/px</output>
    </nav>
    <div class="workspace">
      <section aria-label="Genome canvas">
        <GenomeCanvas {genome} bind:viewport {geneticCode} {showLabels} {showStarts} selectedFeature={selected}
          on:viewport={(event) => viewport = event.detail} on:select={(event) => selected = event.detail} />
        <p class="canvas-alt">Visible range {Math.floor(viewport.start + 1)}..{Math.ceil(viewport.end)}. Forward CDSs point right; reverse CDSs point left. Stops are red and marked “*”.</p>
      </section>
      <FeatureInspector feature={selected} />
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
  .workspace { display:grid; grid-template-columns:minmax(0,3fr) minmax(240px,1fr); gap:1rem }
  .canvas-alt { margin:.35rem 0; font-size:.85rem } .warnings { padding:1rem; background:#fff8db; border-left:5px solid #ad7400 }
  .error { padding:1rem; background:#fff0f1; border-left:5px solid #b31b34 } footer { padding:.55rem; color:#fff; background:#344b5e; border-radius:.3rem }
  @media (max-width:800px) { header,.workspace { display:block } .privacy { display:block; margin-top:.5rem } }
  @media (prefers-reduced-motion:reduce) { :global(*) { scroll-behavior:auto !important } }
</style>
