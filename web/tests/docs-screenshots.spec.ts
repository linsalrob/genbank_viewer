import { expect, test } from '@playwright/test'
import path from 'node:path'

const assets = path.resolve('../docs/assets')
const fixture = (name: string) => path.resolve('../test-data', name)

async function capture(page: import('@playwright/test').Page, name: string) {
  await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto')
  await page.screenshot({ path: path.join(assets, name), animations: 'disabled', fullPage: false })
}

async function load(page: import('@playwright/test').Page, name: string, heading: string) {
  await page.goto('/genbank_viewer/')
  await page.getByTestId('file-input').setInputFiles(fixture(name))
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  await expect(page.locator('canvas[aria-label^="Genome viewer"]')).toBeVisible()
}

test.use({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 })

test('generate deterministic documentation screenshots', async ({ page }) => {
  await load(page, 'two_records.gbk', 'FIRST')
  await capture(page, 'viewer-loaded.png')

  await load(page, 'grouped_tracks.gbk', 'TRACKTEST')
  await capture(page, 'grouped-tracks-default.png')
  for (const label of [
    /Protein processing/, /Regulatory and genomic regions/,
    /Assembly, source, and variation/, /^Other/,
  ]) await page.getByRole('checkbox', { name: label }).check()
  await capture(page, 'grouped-tracks-all.png')
  const canvas = page.locator('canvas[aria-label^="Genome viewer"]')
  const box = await canvas.boundingBox()
  const rows = JSON.parse((await canvas.getAttribute('data-track-rows'))!) as { id: string; y: number; height: number }[]
  const geneRow = rows.find((row) => row.id.startsWith('genes:1:'))!
  await canvas.click({ position: { x: box!.width * 42 / 360, y: geneRow.y + geneRow.height / 2 } })
  const inspector = page.getByRole('complementary', { name: 'Feature inspector', exact: true })
  await expect(inspector.getByRole('heading', { level: 3 })).toBeVisible()
  await inspector.scrollIntoViewIfNeeded()
  await capture(page, 'feature-inspector.png')

  await load(page, 'stop_tracks.gbk', 'STOPTRACK')
  await expect(page.locator('canvas')).toHaveAttribute('data-render-mode', 'stop_tracks')
  await capture(page, 'low-zoom-stop-tracks.png')
  await page.getByLabel('Position or range (1-based)').fill('1-120')
  await page.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-render-mode', 'sequence')
  await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-translated-codon-count'))).toBeGreaterThan(0)
  await capture(page, 'high-zoom-six-frames.png')

  const query = page.getByRole('textbox', { name: 'Sequence', exact: true })
  await query.fill('TGATAATAGCCC')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-search-highlight-targets', 'nucleotide:forward')
  await page.locator('canvas').scrollIntoViewIfNeeded()
  await capture(page, 'search-nucleotide-forward.png')
  await query.fill('GGGCTATTATCA')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-search-highlight-targets', 'nucleotide:reverse')
  await page.locator('canvas').scrollIntoViewIfNeeded()
  await capture(page, 'search-nucleotide-reverse.png')

  await page.getByRole('combobox', { name: 'Sequence search type' }).selectOption('amino_acid')
  await query.fill('XX')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('button', { name: /frame \+2/ }).first().click()
  await page.getByRole('button', { name: 'Whole genome' }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-search-highlight-targets', 'frame:+2')
  await page.locator('canvas').scrollIntoViewIfNeeded()
  await capture(page, 'search-peptide-low-zoom.png')
  await page.getByRole('button', { name: /frame \+2/ }).first().click()
  await expect(page.locator('canvas')).toHaveAttribute('data-render-mode', 'sequence')
  await page.locator('canvas').scrollIntoViewIfNeeded()
  await capture(page, 'search-peptide-high-zoom.png')
  await page.getByRole('button', { name: 'Whole genome' }).click()
  await page.getByRole('button', { name: /frame -[123]/ }).first().click()
  await page.getByRole('button', { name: 'Whole genome' }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-search-highlight-targets', /frame:-[123]/)
  await page.locator('canvas').scrollIntoViewIfNeeded()
  await capture(page, 'search-peptide-reverse-frame.png')

  await load(page, 'simple_linear.gbk.gz', 'SIMPLE1')
  await expect(page.getByText('simple_linear.gbk.gz')).toBeVisible()
  await capture(page, 'viewer-layout-gzip.png')
})
