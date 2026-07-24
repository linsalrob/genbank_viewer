import { expect, test } from '@playwright/test'
import path from 'node:path'

test('loads a local multi-record GenBank file and operates the viewer', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input').setInputFiles(path.resolve('../test-data/two_records.gbk'))
  await expect(page.getByRole('heading', { name: 'FIRST' })).toBeVisible()
  await expect(page.locator('canvas[aria-label^="Genome viewer"]')).toBeVisible()
  await page.getByLabel('Genetic code').selectOption('1')
  await page.getByLabel('Record').selectOption('1')
  await expect(page.getByRole('heading', { name: 'SECOND' })).toBeVisible()
  await page.locator('canvas[aria-label^="Genome viewer"]').click({ position: { x: 100, y: 40 } })
})
