# Privacy and security

## Current data flows

The current application reads a file selected through the browser's local File API. Plain files are decoded locally. Gzip files are decompressed locally with the browser's `DecompressionStream` API or the bundled `fflate` fallback. Parsing, feature inspection, sequence rendering, stop-codon calculation, six-frame translation, and nucleotide or peptide search then run in the bundled Rust-generated WebAssembly (WASM) module.

The application source currently contains no upload or remote-fetch path, backend, analytics, telemetry, or automatic update check. It does not contact GitHub at application runtime and does not load external fonts, scripts, stylesheets, WASM, APIs, or other remote assets. The production-build audit is described in [Offline verification](offline-verification.md).

Application state is held in memory. The current code does not use `localStorage`, `sessionStorage`, IndexedDB, or cookies; it does not persist recently opened filenames, sequence contents, search queries, or settings. Closing the tab or local browser window discards this application state. The original GenBank files remain wherever the user stored them and are not imported into a central database.

## Hosting and downloads

The GitHub Pages host necessarily receives ordinary web requests for the application files and can observe network metadata such as an IP address and user agent. It does not receive sequence data through the application. Opening the hosted site requires internet access, and the site has no service worker for durable offline caching.

Downloading source code or any future release asset contacts GitHub. A GitHub release entry exists, but it has no downloadable assets; no desktop packages or checksums are currently published. A modified deployment, browser extension, compromised dependency, browser feature, or future version could change the observed behavior, so privacy claims apply only to the audited version and build.

## Sensitive sequences

Local processing is not an absolute confidentiality guarantee. Data exists in browser memory, may appear in screenshots or crash reports, and remains subject to operating-system, browser, extension, backup, and device security.

For sensitive, unpublished, clinical, regulated, or commercial sequence data:

1. Prepare a trusted local production build while connected to an approved network.
2. Record and verify checksums for all transferred files according to institutional policy.
3. Disconnect the destination computer from the network.
4. Follow the [offline verification test](offline-verification.md).
5. Inspect network activity or apply an application firewall rule if institutional policy requires it.

See [Standalone and offline installation](offline-installation.md) for supported installation status and [Updating and uninstalling](updating-and-uninstalling.md) for removing the local build.
