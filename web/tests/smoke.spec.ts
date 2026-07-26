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

test('loads gzip locally and supports source visibility and feature genetic codes', async ({ page }) => {
  await page.goto('/genbank_viewer/')
  await page.getByTestId('file-input').setInputFiles(path.resolve('../test-data/simple_linear.gbk.gz'))
  await expect(page.getByRole('heading', { name: 'SIMPLE1' })).toBeVisible()

  const canvas = page.locator('canvas[aria-label^="Genome viewer"]')
  await expect(canvas).toHaveAttribute('aria-label', /Source features are hidden. Genetic code 11/)
  const canvasBox = await canvas.boundingBox()
  const inspectorBox = await page.getByLabel('Feature inspector region').boundingBox()
  expect(canvasBox).not.toBeNull()
  expect(inspectorBox).not.toBeNull()
  expect(inspectorBox!.y).toBeGreaterThan(canvasBox!.y + canvasBox!.height)
  expect(canvasBox!.width).toBeGreaterThan(1000)

  await canvas.click({ position: { x: canvasBox!.width * 0.2, y: 52 } })
  await expect(page.getByText('Declared translation table: 4')).toBeVisible()
  await page.getByRole('button', { name: 'Use feature code 4' }).click()
  await expect(page.getByRole('combobox', { name: 'Genetic code', exact: true })).toHaveValue('4')

  await page.getByLabel('Show source feature').check()
  await expect(canvas).toHaveAttribute('aria-label', /Source features are visible/)
  await canvas.click({ position: { x: 8, y: 40 } })
  await expect(page.getByLabel('Feature inspector').getByRole('heading', { name: 'source' })).toBeVisible()
  await page.getByLabel('Show source feature').uncheck()
  await expect(page.getByText('Select a feature in the genome view to inspect its annotations.')).toBeVisible()
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
