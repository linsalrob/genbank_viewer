# Troubleshooting

- **`wasm-pack` not found:** run `cargo install wasm-pack` and ensure Cargo’s bin directory is on `PATH`.
- **WASM target missing:** run `rustup target add wasm32-unknown-unknown`.
- **Blank Canvas:** load a record, resize the window, check browser console/CSP, and rebuild WASM.
- **File rejected:** use `.gb`, `.gbk`, `.genbank`, or `.gbff`, optionally followed by `.gz`.
- **Invalid or truncated gzip:** obtain a complete gzip file and retry; compressed bytes are never passed directly to the GenBank parser.
- **No native `DecompressionStream`:** the bundled, browser-compatible `fflate` fallback is used automatically. If decompression still fails, check Console and update the browser.
- **Large compressed file is slow:** decompression, decoded text, parsed records, and render data coexist in browser memory; use a smaller file or a device with more available memory.
- **Unsupported location:** inspect the warning; the text is preserved but not rendered.
- **Large file is slow:** begin at whole-genome view, close other tabs, and avoid excessive zoom changes.
- **Browser memory limit:** split exceptionally large multi-record files; all records live locally in browser memory.
- **Unexpected amino acids, starts, or stops:** check **Genetic code** and the selected CDS `/transl_table`; table 11 is the default and is not inferred from taxonomy.
- **Stale WASM:** remove `web/src/lib/wasm-pkg` and run `npm run build:wasm`.
- **WASM 404 on GitHub Pages:** run `npm run build`, confirm `web/dist/index.html` points to `/genbank_viewer/assets/`, and confirm a `.wasm` file exists beneath `web/dist/assets`.
- **WASM MIME or initialisation error:** open browser Developer Tools, filter the Network panel for `wasm`, and verify the request returns the binary with a successful status rather than a 404 or HTML document. Check Console for fetch, MIME-type, compilation, or initialisation details.
- **Wrong local preview URL:** after a production build, use `npm run preview` and open `http://localhost:4173/genbank_viewer/`, not the server root.
- **npm problems:** use the documented Node version and a fresh `npm ci`.
- **Chromebook permissions:** allow the browser to read the selected local file; genbank_viewer needs no folder-wide access.
- **Offline use:** after dependencies and production assets are installed/built, serve the static `web/dist` directory without network access.
