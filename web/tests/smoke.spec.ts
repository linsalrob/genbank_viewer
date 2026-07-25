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
  await page.getByRole('combobox', { name: 'Genetic code', exact: true }).selectOption('1')
  await page.getByLabel('Record').selectOption('1')
  await expect(page.getByRole('heading', { name: 'SECOND' })).toBeVisible()
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
