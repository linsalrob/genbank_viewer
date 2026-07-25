# Troubleshooting

- **`wasm-pack` not found:** run `cargo install wasm-pack` and ensure Cargo’s bin directory is on `PATH`.
- **WASM target missing:** run `rustup target add wasm32-unknown-unknown`.
- **Blank Canvas:** load a record, resize the window, check browser console/CSP, and rebuild WASM.
- **File rejected:** use a supported extension and confirm it is plain GenBank text.
- **Unsupported location:** inspect the warning; the text is preserved but not rendered.
- **Large file is slow:** begin at whole-genome view, close other tabs, and avoid excessive zoom changes.
- **Browser memory limit:** split exceptionally large multi-record files; all records live locally in browser memory.
- **Stale WASM:** remove `web/src/lib/wasm-pkg` and run `npm run build:wasm`.
- **WASM 404 on GitHub Pages:** run `npm run build`, confirm `web/dist/index.html` points to `/genbank_viewer/assets/`, and confirm a `.wasm` file exists beneath `web/dist/assets`.
- **WASM MIME or initialisation error:** open browser Developer Tools, filter the Network panel for `wasm`, and verify the request returns the binary with a successful status rather than a 404 or HTML document. Check Console for fetch, MIME-type, compilation, or initialisation details.
- **Wrong local preview URL:** after a production build, use `npm run preview` and open `http://localhost:4173/genbank_viewer/`, not the server root.
- **npm problems:** use the documented Node version and a fresh `npm ci`.
- **Chromebook permissions:** allow the browser to read the selected local file; genbank_viewer needs no folder-wide access.
- **Offline use:** after dependencies and production assets are installed/built, serve the static `web/dist` directory without network access.
