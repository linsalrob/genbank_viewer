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
