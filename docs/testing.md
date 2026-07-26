# Testing

Run Rust model, parser, DTO, and integration tests with `cargo test --workspace`. Run frontend transformation and render-geometry tests with `cd web && npm test`; checks and production compilation use `npm run check` and `npm run build`.

Install Playwright Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. The smoke tests build and preview the production site at `/genbank_viewer/`, load plain and gzip synthetic fixtures through the browser file input, confirm parsed metadata and Canvas output, exercise source visibility and `/transl_table`, switch code and record, verify stop-track and detailed sequence modes, and assert that the WASM request uses the local Pages asset path. `test-data/stop_tracks.gbk` is a small synthetic TGA/TAA-rich record used to verify code-dependent whole-record bars without committing biological data.

The deployment workflow also fails unless `web/dist/index.html` exists, at least one `.wasm` file is present, generated asset URLs start with `/genbank_viewer/assets/`, and no HTML asset URL incorrectly starts at `/assets/`.

Documentation must pass `python -m mkdocs build --strict`. Synthetic fixtures are intentionally compact and manually reviewable; no fixture claims to be a real accession.

`test-data/simple_linear.gbk.gz` is generated from the adjacent synthetic text fixture with the same `fflate` dependency used by the frontend fallback:

```bash
cd web
node -e "const fs=require('fs');const {gzipSync}=require('fflate');fs.writeFileSync('../test-data/simple_linear.gbk.gz',Buffer.from(gzipSync(fs.readFileSync('../test-data/simple_linear.gbk'))))"
```
