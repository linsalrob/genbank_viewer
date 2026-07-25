<script lang="ts">
  import { readGenbankFile } from '../lib/readGenomeFile'

  export let onLoad: (content: string, file: File) => Promise<void>
  export let onError: (error: unknown) => void
  let dragging = false

  async function load(file?: File) {
    if (!file) return
    try {
      await onLoad(await readGenbankFile(file), file)
    } catch (error) {
      onError(error)
    }
  }
  async function pick(event: Event) {
    await load((event.target as HTMLInputElement).files?.[0])
  }
  async function drop(event: DragEvent) {
    event.preventDefault()
    dragging = false
    await load(event.dataTransfer?.files[0])
  }
</script>

<section role="group" aria-label="GenBank file loading" class:dragging class="loader" on:dragover={(e) => { e.preventDefault(); dragging = true }} on:dragleave={() => dragging = false} on:drop={drop}>
  <label for="genbank-file">Open a local GenBank file</label>
  <input id="genbank-file" data-testid="file-input" type="file" accept=".gb,.gbk,.genbank,.gbff,.gb.gz,.gbk.gz,.genbank.gz,.gbff.gz,application/gzip" on:change={pick} />
  <span>Plain or gzip-compressed GenBank (.gz) — choose or drag and drop; files never leave this browser</span>
</section>

<style>
  .loader { display:grid; gap:.45rem; padding:1rem; border:2px dashed #8ca0b3; border-radius:.6rem; background:#f8fbfd }
  .loader.dragging { border-color:#0d705d; background:#e8f7f2 }
  label { font-weight:700 }
</style>
