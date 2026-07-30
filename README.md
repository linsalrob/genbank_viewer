# genbank_viewer

[![Documentation Status](https://readthedocs.org/projects/genbank-viewer/badge/?version=latest)](https://genbank-viewer.readthedocs.io/en/latest/)

**[Live application](https://linsalrob.github.io/genbank_viewer/)** · **[Documentation](https://genbank-viewer.readthedocs.io/en/latest/)**

genbank_viewer is a local-first, Artemis-inspired GenBank genome viewer. Rust handles biological models, coordinates, parsing, translation, and coding statistics; WebAssembly exposes serialisable data; Svelte and Canvas 2D provide the interactive browser interface.

The live application runs the viewer; the Read the Docs site contains user, reference, installation, and contributor guidance.

![genbank_viewer showing a locally loaded gzip-compressed GenBank record](docs/assets/viewer-layout-gzip.png)

## Capabilities

- local `.gb`, `.gbk`, `.genbank`, and `.gbff` loading, including gzip-compressed files and multiple records;
- directional, joined CDS tracks with selection and qualifier inspection;
- cursor-centred zoom, drag/keyboard panning, coordinate jumps, and whole-genome reset;
- six-frame stop-codon tracks at whole-genome scale and base-resolution forward, reverse-complement, and amino-acid views;
- local exact nucleotide (both strands, IUPAC-aware) and six-frame peptide searching with match navigation and highlighting;
- all 27 currently defined NCBI genetic codes, with table 11 as the default and table-specific starts and stops;
- structured parser warnings and union-based coding density.

Files are processed inside the browser and are not uploaded. genbank_viewer currently makes no analytics or application network calls. Verify the build and deployment you use before opening sensitive clinical or unpublished sequence data.

Current evergreen Chrome, Edge, Firefox, and Safari releases are the supported targets. Chromium-based Chromebooks are supported subject to browser file permissions.

## Standalone and offline installation

The hosted GitHub Pages site and an offline installation are different. The hosted site needs a network connection to load and is not an installable Progressive Web App (PWA). Prebuilt desktop installers are not currently published, and the repository has no desktop wrapper.

The verified offline method is an advanced local production build: download the source and build dependencies while online, build the browser application, and later serve the generated files from `127.0.0.1` without internet access. See the [standalone and offline installation guide](docs/offline-installation.md) for the method comparison, platform instructions, privacy checks, updating, and removal.

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

## Production build and GitHub Pages

The Pages workflow builds and deploys `web/dist` after every push to `main`, and can also be started manually. It installs Rust, the `wasm32-unknown-unknown` target, `wasm-pack`, and Node.js; runs Rust and frontend checks; builds the site with Vite's `/genbank_viewer/` base; asserts that the HTML and WASM assets exist; runs a browser smoke test against the production build; and deploys the artifact with GitHub's official Pages actions.

`npm run build` first compiles `crates/genome-wasm` with `wasm-pack` into `web/src/lib/wasm-pkg`, then Vite bundles its ES-module loader and `.wasm` binary into `web/dist`. The browser reads selected files through the File API, decompresses gzip locally when needed, and passes plain text directly to `parse_genbank_json`. Exact nucleotide and six-frame peptide searches also run in Rust/WASM; no file or query sequence is sent to a server.

Reproduce the Pages build and preview locally:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
cd web
npm ci
npm run build
npm run preview -- --host 127.0.0.1
```

Open **http://127.0.0.1:4173/genbank_viewer/**. Vite's production mode selects the project-site base used in deployment, while normal `npm run dev` development continues to use `/`.

If WASM fails to initialise, confirm that `web/dist` contains a `.wasm` file and that `web/dist/index.html` uses `/genbank_viewer/assets/` URLs. In the browser's Network panel, filter for `wasm` and check for a successful response rather than a 404 or HTML response; in Console, look for MIME-type, fetch, compilation, or initialisation errors. The WASM URL must remain an asset emitted by Vite, not a CDN URL.

## Repository layout

- [`crates/genome-core`](crates/genome-core): biological models, coordinates, translation, exact sequence search, coding statistics
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

See the [documentation home](docs/index.md), [user tutorial](docs/how-to-use-genbank_viewer.md), [installation guide](docs/installation.md), [changelog](CHANGELOG.md), and [contribution guide](docs/contributing.md).

## Status and limitations

genbank_viewer is an active early-stage viewer, not an annotation editor. Complex GenBank locations such as `order`, `one-of`, remote accessions, and between-base positions are preserved with warnings but not drawn. Circular origin-spanning semantics, very large-file performance, and broader format support remain future work.

Contributions are welcome under the [MIT licence](LICENSE).
