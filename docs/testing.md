# Testing

Run Rust model, parser, DTO, and integration tests with `cargo test --workspace`. Run frontend transformation and render-geometry tests with `cd web && npm test`; checks and production compilation use `npm run check` and `npm run build`.

Install Playwright Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. The smoke test uploads `test-data/two_records.gbk`, checks metadata and Canvas, switches code and record.

Documentation must pass `python -m mkdocs build --strict`. Synthetic fixtures are intentionally compact and manually reviewable; no fixture claims to be a real accession.
