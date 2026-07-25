import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/genbank_viewer/' : '/',
  plugins: [svelte()],
  test: {
    exclude: ['tests/**', 'node_modules/**'],
  },
}))
