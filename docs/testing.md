# Testing

Run Rust model, parser, DTO, and integration tests with `cargo test --workspace`. Run frontend transformation and render-geometry tests with `cd web && npm test`; checks and production compilation use `npm run check` and `npm run build`.

Install Playwright Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. The smoke tests build and preview the production site at `/genbank_viewer/`, load plain and gzip synthetic fixtures through the browser file input, confirm parsed metadata and Canvas output, exercise source visibility and `/transl_table`, switch code and record, verify stop-track and detailed sequence modes, and assert that the WASM request uses the local Pages asset path. `test-data/stop_tracks.gbk` is a small synthetic TGA/TAA-rich record used to verify code-dependent whole-record bars without committing biological data.

The deployment workflow also fails unless `web/dist/index.html` exists, at least one `.wasm` file is present, generated asset URLs start with `/genbank_viewer/assets/`, and no HTML asset URL incorrectly starts at `/assets/`.

Documentation must pass `python -m mkdocs build --strict` and `cd web && npm run docs:audit`. Rust public API documentation must pass `cargo doc --workspace --no-deps`. Synthetic fixtures are intentionally compact and manually reviewable; no fixture claims to be a real accession.

`npm run docs:screenshots` builds the production application and deterministically regenerates the documented UI images. It is separate from `npm run test:e2e` so ordinary CI does not rewrite tracked assets. See [Maintaining documentation](documentation.md).

## Fixture inventory

| Fixture | Purpose |
|---|---|
| `simple_linear.gbk` / `.gbk.gz` | plain/gzip parity, source feature, `/transl_table=4` |
| `two_records.gbk` | record selection, forward/reverse CDSs, partial joined CDS |
| `grouped_tracks.gbk` | all display groups, unknown key, subtype qualifiers, lane layout |
| `stop_tracks.gbk` | deterministic six-frame stops, render modes, searches, code changes |
| `joined_cds.gbk` | joined forward feature extraction |
| `reverse_cds.gbk` | reverse-strand feature extraction |
| `circular_origin.gbk` | preserved circular origin-spanning limitation fixture |

`test-data/simple_linear.gbk.gz` is generated from the adjacent synthetic text fixture with the same `fflate` dependency used by the frontend fallback:

```bash
cd web
node -e "const fs=require('fs');const {gzipSync}=require('fflate');fs.writeFileSync('../test-data/simple_linear.gbk.gz',Buffer.from(gzipSync(fs.readFileSync('../test-data/simple_linear.gbk'))))"
```
