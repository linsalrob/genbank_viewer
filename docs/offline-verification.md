# Verify offline operation and local processing

Complete this test with non-sensitive sample files before relying on genbank_viewer in a restricted environment. The repository includes `test-data/simple_linear.gbk` and `test-data/simple_linear.gbk.gz` for this purpose.

## Basic user test

1. Build the local production application and open it once.
2. Stop the local server and close the browser tab.
3. Disconnect Wi-Fi and Ethernet, or enable airplane mode.
4. Restart the server with `npm run preview -- --host 127.0.0.1` and reopen <http://127.0.0.1:4173/genbank_viewer/>.
5. Load a local uncompressed GenBank file and confirm its record name and annotations appear.
6. Load a local gzip-compressed GenBank file and confirm it produces the same record.
7. Select feature arrows and inspect their qualifiers.
8. At whole-genome scale, confirm the six reading-frame stop tracks appear. Zoom to a short interval and confirm nucleotide and amino-acid letters appear.
9. Run an exact nucleotide search and navigate between results.
10. Switch to amino-acid search and run an exact peptide search.
11. Change the **Genetic code** control and confirm the stop/translation display updates.
12. Confirm all these operations work while external networking remains disabled.

Successful completion verifies the tested build and browser on that computer. It does not prove that every browser extension, operating-system service, or future application version is network-silent.

## Browser developer-tools test

1. Keep the production server bound to `127.0.0.1` and the external network disconnected.
2. Open the browser's Developer Tools and select **Network**.
3. Clear previous entries, enable preservation of the log if available, and reload the application.
4. Filter by **Fetch/XHR** and `wasm`, then repeat file loading, search, translation, and genetic-code switching.
5. Inspect every request. Expected application requests use `http://127.0.0.1:4173/genbank_viewer/` and its local `assets` paths. The WASM response must come from that local origin, not a content-delivery network (CDN).
6. Confirm no request body, URL, header added by the application, or remote connection contains a filename, sequence, annotation, or search query.

Browser extensions and browser-owned services can create unrelated requests. Repeat in a clean browser profile with extensions disabled if attribution is unclear. A request to a public `http://` or `https://` origin is not expected from current application code; investigate it before loading sensitive data.

## Production-file audit

After `npm run build`, run this search from the repository root:

```bash
grep -RInE 'https?://|fonts\.googleapis\.com|fonts\.gstatic\.com|cdn|analytics|telemetry|raw\.githubusercontent\.com|unpkg|jsdelivr' web/dist
```

No output is the clearest result. A match is not automatically a runtime dependency: generated libraries can contain standards-namespace strings, source metadata, licence text, or error messages. Inspect the surrounding HTML, CSS, or JavaScript. In particular:

- external HTML `<script src>`, stylesheet `<link href>`, CSS `@import`, or CSS `url(...)` references are runtime assets;
- JavaScript `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or beacon calls to a remote URL are runtime connections;
- strings such as XML namespace identifiers can be inert metadata.

The audited production build contained the HTML entry point, local JavaScript and CSS, and a local `.wasm` asset. The broad text search did find `https://svelte.dev/e/...` strings used only in framework error messages and `http://www.w3.org/1999/xhtml`, an inert standards namespace. Vite's generated module-preload helper contains `fetch(e.href)`, where `e.href` is the locally declared JavaScript asset. These matches are not remote runtime dependencies. Repository source inspection found no application XHR, WebSocket, beacon, analytics, telemetry, external font, CDN, or remote API code. The end-to-end smoke test records browser requests and requires every request to use `http://127.0.0.1:4173`.

## Operating-system firewall test

An institution may block the browser or Node.js from external network access and repeat the basic test. Firewall interfaces and policy differ by operating system and managed environment, so this project does not prescribe platform-specific firewall commands. Preserve access to loopback (`127.0.0.1`) or the local browser will be unable to reach the application server.

## Build and transfer checksums

The project does not publish release checksums. For an institutional transfer, create a SHA-256 manifest on the trusted preparation computer, transfer it separately according to policy, and verify it on the destination. See [Standalone and offline installation](offline-installation.md#checksums) for platform commands.
