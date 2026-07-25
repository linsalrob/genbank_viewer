# Testing

Run Rust model, parser, DTO, and integration tests with `cargo test --workspace`. Run frontend transformation and render-geometry tests with `cd web && npm test`; checks and production compilation use `npm run check` and `npm run build`.

Install Playwright Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. The smoke test builds and previews the production site at `/genbank_viewer/`, loads the synthetic `test-data/two_records.gbk` through the browser file input, confirms parsed metadata and Canvas output, switches code and record, and asserts that the WASM request uses the local Pages asset path.

The deployment workflow also fails unless `web/dist/index.html` exists, at least one `.wasm` file is present, generated asset URLs start with `/genbank_viewer/assets/`, and no HTML asset URL incorrectly starts at `/assets/`.

Documentation must pass `python -m mkdocs build --strict`. Synthetic fixtures are intentionally compact and manually reviewable; no fixture claims to be a real accession.
