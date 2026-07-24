# Webtemis

Webtemis is a local-first, Artemis-inspired GenBank genome viewer. Rust handles biological models, coordinates, parsing, translation, and coding statistics; WebAssembly exposes serialisable data; Svelte and Canvas 2D provide the interactive browser interface.

![Webtemis viewer screenshot placeholder](docs/assets/webtemis-viewer-placeholder.svg)

> Screenshot placeholder: maintainers can replace this asset after running `npm run dev` and loading `test-data/two_records.gbk`.

## Capabilities

- local `.gb`, `.gbk`, `.genbank`, and `.gbff` loading, including multiple records;
- directional, joined CDS tracks with selection and qualifier inspection;
- cursor-centred zoom, drag/keyboard panning, coordinate jumps, and whole-genome reset;
- base-resolution forward, reverse-complement, and globally aligned six-frame views;
- NCBI genetic codes 11 (default) and 1, with start and stop markers;
- structured parser warnings and union-based coding density.

Files are processed inside the browser and are not uploaded. Webtemis currently makes no analytics or application network calls. Verify the build and deployment you use before opening sensitive clinical or unpublished sequence data.

Current evergreen Chrome, Edge, Firefox, and Safari releases are the supported targets. Chromium-based Chromebooks are supported subject to browser file permissions.

## Quick start

Prerequisites are Rust 1.85+, Node.js 20+, npm, `wasm-pack`, and the `wasm32-unknown-unknown` Rust target.

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
cd web
npm ci
npm run dev
```

Open the displayed local URL, choose a GenBank file, select a record, click a CDS arrow, and zoom to base resolution to inspect sequence and translations. No backend is required.

## Repository layout

- [`crates/genome-core`](crates/genome-core): biological models, coordinates, translation, coding statistics
- [`crates/genome-formats`](crates/genome-formats): GenBank parsing
- [`crates/genome-wasm`](crates/genome-wasm): thin browser DTO adapters
- [`web`](web): Svelte UI, viewport, interactions, and Canvas rendering
- [`test-data`](test-data): small synthetic fixtures
- [`docs`](docs): user and developer documentation

## Validation

```bash
make check
cd web && npm run test:e2e
python -m mkdocs build --strict
```

See the [documentation home](docs/index.md), [user tutorial](docs/how-to-use-webtemis.md), [installation guide](docs/installation.md), and [contribution guide](docs/contributing.md).

## Status and limitations

Webtemis is an active early-stage viewer, not an annotation editor. Complex GenBank locations such as `order`, `one-of`, remote accessions, and between-base positions are preserved with warnings but not drawn. Circular origin-spanning semantics, very large-file performance, and broader format support remain future work.

Contributions are welcome under the [MIT licence](LICENSE).
