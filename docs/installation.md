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

For normal development, open the URL printed by Vite. The hosted application is available at https://linsalrob.github.io/genbank_viewer/.

For documentation, use Python 3.10+ and `python -m pip install -r requirements-docs.txt`.

To reproduce and preview the GitHub Pages production build:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
cd web
npm ci
npm run build
npm run preview
```

Open http://localhost:4173/genbank_viewer/. Vite's production mode selects the deployed `/genbank_viewer/` base path; ordinary `npm run dev` continues to use `/`.
