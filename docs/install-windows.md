# Install on Windows

There is currently no Windows `.msi`, `.exe`, desktop wrapper, Start Menu entry, signing certificate, or automatic updater. The supported offline option is the advanced local production build below. The project does not establish a specific Windows version or offer ARM64/x86-64 packages; compatibility depends on obtaining compatible Rust, Node.js, npm, and a current browser for the computer.

## Advanced local-build installation

Prerequisites: Git, Rust 1.85 or newer installed with `rustup`, Node.js 20 or newer with npm 10 or newer, and enough storage for the build. Install the x64 versions on an ordinary Intel/AMD Windows computer or ARM64 versions on Windows on Arm. Administrator rights are not inherently required when these tools are installed for the current user, although an organisation's software policy may require approval.

1. Open a terminal supplied by the installed development tools.
2. Clone and enter the project:

    ```powershell
    git clone https://github.com/linsalrob/genbank_viewer.git
    cd genbank_viewer
    ```

3. Install the WASM target and `wasm-pack`:

    ```powershell
    rustup target add wasm32-unknown-unknown
    cargo install wasm-pack
    ```

4. Install the locked web dependencies and build:

    ```powershell
    cd web
    npm ci
    npm run build
    ```

5. Confirm that `dist\index.html` and a `.wasm` file under `dist\assets` exist.

## Launch offline

1. Disconnect the computer from the network.
2. Open a terminal in the retained `genbank_viewer\web` directory.
3. Run:

    ```powershell
    npm run preview -- --host 127.0.0.1
    ```

4. Open <http://127.0.0.1:4173/genbank_viewer/> in a current browser.
5. Select `.gb`, `.gbk`, `.gbff`, or `.genbank`, or the corresponding filename followed by `.gz`, using **Choose GenBank file** or drag and drop.
6. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> in the terminal to stop the server.

There is no default application installation directory, Start Menu entry, file association, or application executable. Microsoft SmartScreen warnings normally apply to downloaded executables; this project does not currently supply one. Treat any website offering a genbank_viewer installer as an unofficial build and verify its provenance.

Follow [Offline verification](offline-verification.md), then see [Updating and uninstalling](updating-and-uninstalling.md). Windows Settings → Apps does not list this source build; removal consists of deleting the retained project directory and separately removing tools only if they are no longer needed.
