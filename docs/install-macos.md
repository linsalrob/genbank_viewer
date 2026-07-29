# Install on macOS

There is currently no `.dmg`, `.app`, archive package, desktop wrapper, code signing, or notarisation. Nothing is dragged to Applications, and there is no application icon or automatic updater. The supported offline option is an advanced local production build opened in an ordinary browser.

## Advanced local-build installation

Prerequisites are Git, Rust 1.85 or newer through `rustup`, Node.js 20 or newer, npm 10 or newer, and the native build tools required by Rust. Install Apple Silicon (`arm64`) tools on M-series Macs and Intel (`x64`) tools on Intel Macs. Administrator access is not inherently required for user-scoped installations, although managed Macs may restrict development tools.

1. While online, open Terminal and run:

    ```bash
    git clone https://github.com/linsalrob/genbank_viewer.git
    cd genbank_viewer
    rustup target add wasm32-unknown-unknown
    cargo install wasm-pack
    cd web
    npm ci
    npm run build
    ```

2. Confirm that `dist/index.html` exists and `dist/assets` contains a `.wasm` file.
3. Retain the checkout, `web/node_modules`, and Node.js installation.

## Launch offline

From the retained `genbank_viewer/web` directory:

```bash
npm run preview -- --host 127.0.0.1
```

Open <http://127.0.0.1:4173/genbank_viewer/>. Select `.gb`, `.gbk`, `.gbff`, `.genbank`, or the corresponding `.gz` form. Press <kbd>Control</kbd>+<kbd>C</kbd> in Terminal to stop the server.

Gatekeeper prompts, Control-click opening, and quarantine removal concern downloaded applications or executables. Because the project supplies no `.app`, any such package is an unofficial build. Do not remove quarantine attributes unless an authorised security review has established the package's source and integrity.

Follow [Offline verification](offline-verification.md), then see [Updating and uninstalling](updating-and-uninstalling.md). Deleting the retained project directory removes this source build; there is no Applications entry to drag to Trash.
