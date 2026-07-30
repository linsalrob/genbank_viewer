import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/genbank_viewer/',
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://127.0.0.1:4173' },
})
