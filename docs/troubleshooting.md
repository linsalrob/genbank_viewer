# Troubleshooting

- **`wasm-pack` not found:** run `cargo install wasm-pack` and ensure Cargo’s bin directory is on `PATH`.
- **WASM target missing:** run `rustup target add wasm32-unknown-unknown`.
- **Blank Canvas:** load a record, resize the window, check browser console/CSP, and rebuild WASM.
- **File rejected:** use a supported extension and confirm it is plain GenBank text.
- **Unsupported location:** inspect the warning; the text is preserved but not rendered.
- **Large file is slow:** begin at whole-genome view, close other tabs, and avoid excessive zoom changes.
- **Browser memory limit:** split exceptionally large multi-record files; all records live locally in browser memory.
- **Stale WASM:** remove `web/src/lib/wasm-pkg` and run `npm run build:wasm`.
- **npm problems:** use the documented Node version and a fresh `npm ci`.
- **Chromebook permissions:** allow the browser to read the selected local file; Webtemis needs no folder-wide access.
- **Offline use:** after dependencies and production assets are installed/built, serve the static `web/dist` directory without network access.
