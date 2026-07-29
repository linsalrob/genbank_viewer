# Install on Chromebook

genbank_viewer is **not currently an installable PWA**. It has no web-app manifest or service worker, so opening the hosted site once does not establish a reliable offline installation and no genbank_viewer entry is expected in the ChromeOS app launcher.

The available offline option is the advanced Linux development environment (also called Crostini). Its availability, storage, and administrative permissions depend on the Chromebook model and organisation policy.

## Linux-container local build

Prerequisites are a Chromebook that supports the Linux development environment, permission to enable it, sufficient storage, and compatible Linux versions of Git, Rust 1.85 or newer, Node.js 20 or newer, and npm 10 or newer.

1. In ChromeOS settings, enable the Linux development environment if it is available and approved. This creates a separate Linux container.
2. Open the Linux Terminal.
3. While online, install the prerequisites using the method approved for the container.
4. Clone and build:

    ```bash
    git clone https://github.com/linsalrob/genbank_viewer.git
    cd genbank_viewer
    rustup target add wasm32-unknown-unknown
    cargo install wasm-pack
    cd web
    npm ci
    npm run build
    ```

5. Confirm that `dist/index.html` exists and `dist/assets` contains a `.wasm` file.

## Launch offline

1. In the Linux Terminal, enter the retained `genbank_viewer/web` directory.
2. Run:

    ```bash
    npm run preview -- --host 127.0.0.1
    ```

3. Open <http://127.0.0.1:4173/genbank_viewer/> in Chrome.
4. Choose a GenBank file to which Chrome has access.
5. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> in the Linux Terminal to stop the server.

Files under **Downloads** may be available to Chrome directly. Files under **Linux files** or removable storage can require ChromeOS sharing or file-picker permission. Google Drive content is not guaranteed offline: mark a file available offline before disconnecting, or copy it into local Downloads/Linux storage and confirm it can be opened.

The Linux container consumes storage, does not create a native ChromeOS/PWA launcher, and may be disabled on managed devices. Browser cache can be cleared by ChromeOS and is not a substitute for the retained local build.

Follow [Offline verification](offline-verification.md), then see [Updating and uninstalling](updating-and-uninstalling.md).
