import { expect, test } from '@playwright/test'
import path from 'node:path'

test('loads a local multi-record GenBank file and operates the viewer', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))

  await page.goto('/genbank_viewer/')
  await page.getByTestId('file-input').setInputFiles(path.resolve('../test-data/two_records.gbk'))
  await expect(page.getByRole('heading', { name: 'FIRST' })).toBeVisible()
  await expect(page.getByText('2 records')).toBeVisible()
  await expect(page.locator('canvas[aria-label^="Genome viewer"]')).toBeVisible()
  await page.getByRole('textbox', { name: 'Sequence', exact: true }).fill('ATG')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText(/match.*nucleotide query/)).toBeVisible()
  await page.getByRole('combobox', { name: 'Genetic code', exact: true }).selectOption('1')
  await page.getByLabel('Record').selectOption('1')
  await expect(page.getByRole('heading', { name: 'SECOND' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Sequence', exact: true })).toHaveValue('')
  await expect(page.locator('canvas[aria-label^="Genome viewer"]')).toHaveAttribute('aria-label', /No sequence search match highlighted/)
  await page.locator('canvas[aria-label^="Genome viewer"]').click({ position: { x: 100, y: 40 } })

  expect(requests.some((url) => url.includes('/genbank_viewer/assets/') && url.endsWith('.wasm'))).toBe(true)
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true)
})

test('loads gzip locally and supports grouped source visibility and feature genetic codes', async ({ page }) => {
  await page.goto('/genbank_viewer/')
  await page.getByTestId('file-input').setInputFiles(path.resolve('../test-data/simple_linear.gbk.gz'))
  await expect(page.getByRole('heading', { name: 'SIMPLE1' })).toBeVisible()

  const canvas = page.locator('canvas[aria-label^="Genome viewer"]')
  await expect(canvas).toHaveAttribute('aria-label', /Visible track groups: genes, rna.*Genetic code 11/)
  const canvasBox = await canvas.boundingBox()
  const inspectorBox = await page.getByLabel('Feature inspector region').boundingBox()
  expect(canvasBox).not.toBeNull()
  expect(inspectorBox).not.toBeNull()
  expect(inspectorBox!.y).toBeGreaterThan(canvasBox!.y + canvasBox!.height)
  expect(canvasBox!.width).toBeGreaterThan(1000)

  await canvas.click({ position: { x: canvasBox!.width * 0.2, y: 40 } })
  await expect(page.getByText('Declared translation table: 4')).toBeVisible()
  await page.getByRole('button', { name: 'Use feature code 4' }).click()
  await expect(page.getByRole('combobox', { name: 'Genetic code', exact: true })).toHaveValue('4')

  await page.getByLabel(/Assembly, source, and variation/).check()
  await expect(canvas).toHaveAttribute('data-visible-groups', /assembly_variation/)
  const rows = JSON.parse((await canvas.getAttribute('data-track-rows'))!) as { id: string; y: number; height: number }[]
  const assembly = rows.find((row) => row.id.startsWith('assembly_variation:'))!
  await canvas.click({ position: { x: 8, y: assembly.y + assembly.height / 2 } })
  await expect(page.getByLabel('Feature inspector').getByRole('heading', { name: 'source' })).toBeVisible()
  await page.getByLabel(/Assembly, source, and variation/).uncheck()
  await expect(page.getByText('Select a feature in the genome view to inspect its annotations.')).toBeVisible()
})

test('toggles grouped annotation tracks and inspects an unknown feature', async ({ page }) => {
  await page.goto('/genbank_viewer/')
  await page.getByTestId('file-input').setInputFiles(path.resolve('../test-data/grouped_tracks.gbk'))
  await expect(page.getByRole('heading', { name: 'TRACKTEST' })).toBeVisible()
  const canvas = page.locator('canvas[aria-label^="Genome viewer"]')
  await expect(canvas).toHaveAttribute('data-visible-groups', 'genes,rna')
  await expect(canvas).toHaveAttribute('data-visible-feature-types', /gene,CDS,tRNA,rRNA/)
  await expect(canvas).not.toHaveAttribute('data-visible-feature-types', /source|regulatory|custom_track/)

  await page.getByLabel(/Regulatory and genomic regions/).check()
  await expect(canvas).toHaveAttribute('data-visible-feature-types', /regulatory/)
  await page.getByLabel(/Assembly, source, and variation/).check()
  await expect(canvas).toHaveAttribute('data-visible-feature-types', /source/)
  await page.getByRole('checkbox', { name: /Other/ }).check()
  await expect(canvas).toHaveAttribute('data-visible-feature-types', /custom_track/)

  const rows = JSON.parse((await canvas.getAttribute('data-track-rows'))!) as { id: string; y: number; height: number }[]
  const other = rows.find((row) => row.id.startsWith('other:1:'))!
  const box = await canvas.boundingBox()
  await canvas.click({ position: { x: box!.width * 78 / 360, y: other.y + other.height / 2 } })
  const inspector = page.getByLabel('Feature inspector')
  await expect(inspector.getByRole('heading', { name: 'custom_track' })).toBeVisible()
  await expect(inspector.getByText('Track group: Other')).toBeVisible()
  await inspector.getByText('All qualifiers').click()
  await expect(inspector.getByText('preserved unknown annotation')).toBeVisible()

  await page.getByLabel('Position or range (1-based)').fill('1-120')
  await page.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(canvas).toHaveAttribute('data-render-mode', 'sequence')
  await expect.poll(async () => Number(await canvas.getAttribute('data-translated-codon-count'))).toBeGreaterThan(0)
})

test('searches nucleotides and six-frame peptides locally and navigates matches', async ({ page }) => {
  await page.goto('/genbank_viewer/')
  await page.getByTestId('file-input').setInputFiles(path.resolve('../test-data/simple_linear.gbk.gz'))
  await expect(page.getByRole('heading', { name: 'SIMPLE1' })).toBeVisible()

  const sequence = page.getByRole('textbox', { name: 'Sequence', exact: true })
  await sequence.fill('>palindrome\natgc at')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText(/29 matches · nucleotide query · 6 bases/)).toBeVisible()
  await expect(page.getByText('1 of 29')).toBeVisible()
  await expect(page.locator('canvas[aria-label^="Genome viewer"]')).toHaveAttribute(
    'aria-label', /Sequence search match 1 through 6 highlighted/,
  )
  await expect(page.getByRole('navigation', { name: 'Genome controls' }).locator('output')).toContainText('1..60')
  await page.getByRole('button', { name: 'Next sequence match' }).click()
  await expect(page.getByText('2 of 29')).toBeVisible()

  await page.getByRole('combobox', { name: 'Sequence search type' }).selectOption('amino_acid')
  await sequence.fill('MH')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText(/amino acid query · 2 residues · genetic code 11/)).toBeVisible()
  await expect(page.getByRole('button', { name: /1..6 — frame \+1/ }).first()).toBeVisible()
  await expect(page.locator('canvas[aria-label^="Genome viewer"]')).toHaveAttribute(
    'aria-label', /Sequence search match 1 through 6 highlighted/,
  )
  await page.getByRole('combobox', { name: 'Genetic code', exact: true }).selectOption('4')
  await expect(page.getByText(/amino acid query · 2 residues · genetic code 4/)).toBeVisible()

  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(page.locator('canvas[aria-label^="Genome viewer"]')).toHaveAttribute(
    'aria-label', /No sequence search match highlighted/,
  )
})

test('shows genetic-code-aware stop tracks before the detailed sequence view', async ({ page }) => {
  await page.goto('/genbank_viewer/')
  await page.getByTestId('file-input').setInputFiles(path.resolve('../test-data/stop_tracks.gbk'))
  await expect(page.getByRole('heading', { name: 'STOPTRACK' })).toBeVisible()

  const canvas = page.locator('canvas[aria-label^="Genome viewer"]')
  await expect(canvas).toHaveAttribute('data-render-mode', 'stop_tracks')
  await expect(canvas).toHaveAttribute('aria-label', /vertical bars in six reading-frame tracks/)
  await expect.poll(async () => Number(await canvas.getAttribute('data-stop-count'))).toBeGreaterThan(0)

  const code = page.getByRole('combobox', { name: 'Genetic code', exact: true })
  await code.selectOption('1')
  await expect(canvas).toHaveAttribute('data-render-data-code', '1')
  await expect.poll(async () => Number(await canvas.getAttribute('data-stop-count'))).toBeGreaterThan(0)
  const standardStops = Number(await canvas.getAttribute('data-stop-count'))
  await code.selectOption('4')
  await expect(canvas).toHaveAttribute('data-render-data-code', '4')
  await expect.poll(async () => Number(await canvas.getAttribute('data-stop-count'))).not.toBe(standardStops)

  await page.getByLabel('Position or range (1-based)').fill('1-120')
  await page.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(canvas).toHaveAttribute('data-render-mode', 'sequence')
  await expect(canvas).toHaveAttribute('aria-label', /nucleotide and amino-acid sequences in six reading frames/)
  await expect.poll(async () => Number(await canvas.getAttribute('data-translated-codon-count'))).toBeGreaterThan(0)
})

test('moves peptide and nucleotide highlights between shared low- and high-zoom rows', async ({ page }) => {
  await page.goto('/genbank_viewer/')
  await page.getByTestId('file-input').setInputFiles(path.resolve('../test-data/stop_tracks.gbk'))
  await expect(page.getByRole('heading', { name: 'STOPTRACK' })).toBeVisible()
  const canvas = page.locator('canvas[aria-label^="Genome viewer"]')
  const query = page.getByRole('textbox', { name: 'Sequence', exact: true })

  await page.getByRole('combobox', { name: 'Sequence search type' }).selectOption('amino_acid')
  await query.fill('XX')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const plusTwo = page.getByRole('button', { name: /frame \+2/ }).first()
  await plusTwo.click()
  await expect(canvas).toHaveAttribute('data-render-mode', 'sequence')
  await expect(canvas).toHaveAttribute('data-search-highlight-targets', 'frame:+2')
  await page.getByRole('button', { name: 'Whole genome' }).click()
  await expect(canvas).toHaveAttribute('data-render-mode', 'stop_tracks')
  await expect(canvas).toHaveAttribute('data-search-highlight-targets', 'frame:+2')
  await expect(canvas).toHaveAttribute('aria-label', /highlights only reading frame \+2/)
  await plusTwo.click()
  await expect(canvas).toHaveAttribute('data-render-mode', 'sequence')
  await expect(canvas).toHaveAttribute('data-search-highlight-targets', 'frame:+2')
  await page.getByRole('button', { name: 'Whole genome' }).click()
  await page.getByRole('button', { name: /frame -[123]/ }).first().click()
  await page.getByRole('button', { name: 'Whole genome' }).click()
  await expect(canvas).toHaveAttribute('data-search-highlight-targets', /frame:-[123]/)

  await page.getByRole('combobox', { name: 'Sequence search type' }).selectOption('nucleotide')
  await query.fill('TGATAATAGCCC')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(canvas).toHaveAttribute('data-search-highlight-targets', 'nucleotide:forward')
  await page.getByRole('button', { name: 'Whole genome' }).click()
  await expect(canvas).toHaveAttribute('data-search-highlight-mode', 'stop_tracks')
  await expect(canvas).toHaveAttribute('data-search-highlight-targets', 'nucleotide:forward')

  await query.fill('GGGCTATTATCA')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(canvas).toHaveAttribute('data-search-highlight-targets', 'nucleotide:reverse')
  await page.getByRole('button', { name: 'Whole genome' }).click()
  await expect(canvas).toHaveAttribute('data-search-highlight-mode', 'stop_tracks')
  await expect(canvas).toHaveAttribute('data-search-highlight-targets', 'nucleotide:reverse')
})
