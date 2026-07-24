# webtemis

A local-first browser genome viewer inspired by Artemis, focused on GenBank inspection for bacterial/phage genomes.

## Current vertical slice

- Parse GenBank in Rust (`genome-formats`)
- Keep biological model/coordinates/translation in Rust (`genome-core`)
- Expose parse + six-frame data through WASM (`genome-wasm`)
- Render CDS forward/reverse tracks + six-frame stop codons on canvas in Svelte shell (`web`)

## Repository layout

- `/home/runner/work/webtemis/webtemis/crates/genome-core`: core model, coordinates, translation, ORF/six-frame logic
- `/home/runner/work/webtemis/webtemis/crates/genome-formats`: GenBank parser + structured parse errors
- `/home/runner/work/webtemis/webtemis/crates/genome-wasm`: serializable WASM boundary API
- `/home/runner/work/webtemis/webtemis/web`: Svelte + Vite browser app, framework-independent canvas renderer
- `/home/runner/work/webtemis/webtemis/test-data`: sample GenBank files for key cases

## Coordinate convention

Internal coordinates are always **zero-based, half-open**:

- `start` is inclusive
- `end` is exclusive
- length is `end - start`

GenBank one-based inclusive coordinates are converted only in the parser boundary:

- `100..300` -> `[99, 300)`
- `100` -> `[99, 100)`

## Development

### Rust

```bash
cargo test
```

### Web

```bash
cd web
npm install
npm run build
npm run dev
```

The web build invokes [`wasm-pack`](https://drager.github.io/wasm-pack/) to generate
the browser WASM package. Install it once with `cargo install wasm-pack` before
running the web commands.

## Notes

- The app is local-only in the browser; GenBank files are loaded from local file input.
- Unsupported or malformed parse constructs return structured errors/warnings instead of panics.
