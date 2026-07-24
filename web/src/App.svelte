<script lang="ts">
  import FileLoader from './components/FileLoader.svelte'
  import GenomeCanvas from './components/GenomeCanvas.svelte'
  import FeatureInspector from './components/FeatureInspector.svelte'
  import StatusBar from './components/StatusBar.svelte'
  import type { ParsedGenome } from './lib/genomeTypes'
  import { parseGenbankWithWasm } from './lib/wasm'

  let genome: ParsedGenome | null = null
  let status = 'Open a GenBank file'

  async function loadFile(content: string) {
    status = 'Parsing...'
    try {
      genome = await parseGenbankWithWasm(content)
      status = `Loaded ${genome.id} (${genome.sequence.length} bp)`
    } catch (err) {
      status = `Parse failed: ${String(err)}`
    }
  }
</script>

<main>
  <h1>Webtemis</h1>
  <FileLoader onLoad={loadFile} />
  <GenomeCanvas {genome} />
  <FeatureInspector {genome} />
  <StatusBar {status} />
</main>
