<script lang="ts">
  export let onLoad: (content: string, file: File) => Promise<void>
  let dragging = false
  const accepted = ['.gb', '.gbk', '.genbank', '.gbff']

  async function load(file?: File) {
    if (!file) return
    if (!accepted.some((extension) => file.name.toLowerCase().endsWith(extension))) {
      throw new Error(`Choose a GenBank file (${accepted.join(', ')})`)
    }
    await onLoad(await file.text(), file)
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

<section role="group" aria-label="GenBank file loading" class:dragging class="loader" on:dragover|preventDefault={() => dragging = true} on:dragleave={() => dragging = false} on:drop={drop}>
  <label for="genbank-file">Open a local GenBank file</label>
  <input id="genbank-file" data-testid="file-input" type="file" accept=".gb,.gbk,.genbank,.gbff" on:change={pick} />
  <span>or drag and drop it here — files never leave this browser</span>
</section>

<style>
  .loader { display:grid; gap:.45rem; padding:1rem; border:2px dashed #8ca0b3; border-radius:.6rem; background:#f8fbfd }
  .loader.dragging { border-color:#0d705d; background:#e8f7f2 }
  label { font-weight:700 }
</style>
