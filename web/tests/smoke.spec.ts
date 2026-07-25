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
  await page.getByLabel('Genetic code').selectOption('1')
  await page.getByLabel('Record').selectOption('1')
  await expect(page.getByRole('heading', { name: 'SECOND' })).toBeVisible()
  await page.locator('canvas[aria-label^="Genome viewer"]').click({ position: { x: 100, y: 40 } })

  expect(requests.some((url) => url.includes('/genbank_viewer/assets/') && url.endsWith('.wasm'))).toBe(true)
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true)
})
