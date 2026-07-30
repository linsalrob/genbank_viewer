# Development

The supported baseline is Rust 1.85+, Node.js 20+, npm 10+, `wasm-pack`, the Rust WASM target, and Python 3.10+ for docs. From the repository root:

```bash
cargo test --workspace
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings

cd web
npm ci
npm run dev
npm run check
npm run test
npm run build
```

Run all common checks with `make check`; build strict documentation with `make docs`. Keep biological coordinate and translation logic in Rust, serialisation in the WASM crate, and rendering/state in `web`.

## Rust API documentation

Generate developer API documentation with:

```bash
cargo doc --workspace --no-deps
```

Open `target/doc/genome_core/index.html`, `target/doc/genome_formats/index.html`, or `target/doc/genome_wasm/index.html`. Rustdoc remains separate from MkDocs because it represents code APIs rather than the user documentation site; CI builds both.

`npm run build` invokes `wasm-pack` for `crates/genome-wasm`, writes its generated ES module beneath `web/src/lib/wasm-pkg`, and lets Vite emit the loader and binary into `web/dist`. For a Pages-equivalent build and preview, run:

```bash
cd web
npm run build
npm run preview -- --host 127.0.0.1
```

Visit http://127.0.0.1:4173/genbank_viewer/. The GitHub Pages workflow repeats the checks, validates the generated HTML and WASM artifact, exercises the production bundle in Chromium, and deploys `web/dist` on pushes to `main`.
