# Installation

Install Rust 1.85 or newer, the `wasm32-unknown-unknown` target, `wasm-pack`, Node.js 20 or newer, and npm 10 or newer.

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
git clone https://github.com/linsalrob/genbank_viewer.git
cd genbank_viewer/web
npm ci
npm run dev
```

For documentation, use Python 3.10+ and `python -m pip install -r requirements-docs.txt`. Production assets are created by `npm run build`.
