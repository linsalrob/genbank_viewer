<script lang="ts">
  export let onLoad: (content: string) => Promise<void>

  async function pickFile(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    await onLoad(text)
  }
</script>

<label>
  Open GenBank:
  <input type="file" accept=".gb,.gbk,.genbank,.txt" on:change={pickFile} />
</label>
