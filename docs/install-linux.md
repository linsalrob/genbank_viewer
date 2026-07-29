# Install on Linux

There is currently no AppImage, `.deb`, `.rpm`, tar package, desktop launcher, or desktop wrapper. AppImage execute permissions, distribution package installation, Wayland/X11 behavior, and system webview dependencies therefore do not apply. The supported offline option uses an ordinary browser and Vite's local server.

## Advanced local-build installation

Prerequisites are Git, Rust 1.85 or newer through `rustup`, Node.js 20 or newer, npm 10 or newer, and common native build tools needed by Rust. Exact operating-system package names vary by distribution and are not established by this repository. Install tools in a user account where possible; whether administrator access is needed depends on the distribution's package policy.

1. While online, clone and build:

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

From `genbank_viewer/web`, run:

```bash
npm run preview -- --host 127.0.0.1
```

Open <http://127.0.0.1:4173/genbank_viewer/>. The browser can select `.gb`, `.gbk`, `.gbff`, `.genbank`, and their `.gz` forms. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop the server.

No graphical launcher is installed. A user-created launcher must set its working directory to `genbank_viewer/web`, run the command above, and keep the terminal process alive. Do not configure `--host 0.0.0.0` by default; that exposes the server to other machines that can reach the computer.

Follow [Offline verification](offline-verification.md), then see [Updating and uninstalling](updating-and-uninstalling.md). Removing the retained checkout removes the local application. Node.js, Rust, and Git are independent tools and are not removed automatically.
