# Release and deployment

## GitHub Pages application

Pushes to `main` run `.github/workflows/deploy-pages.yml`. The workflow checks Rust and frontend code, builds the WASM package and Vite site, verifies `/genbank_viewer/assets/` paths and a generated `.wasm` file, runs Chromium end-to-end tests, and deploys `web/dist` with GitHub Pages actions.

The hosted application URL is <https://linsalrob.github.io/genbank_viewer/>. Vite production mode uses `/genbank_viewer/`; development mode uses `/`. The header's **Documentation** link comes from `web/src/lib/config.ts`. Override it at build time with `VITE_DOCUMENTATION_URL` if the canonical documentation project moves.

## Read the Docs

The [Read the Docs integration](readthedocs.md) publishes documentation independently of the application. A `main` push requests the `latest` build. Publishing a GitHub release requests a build for its tag after version synchronisation. Manual runs accept an explicit version. The action validates locally before calling the API.

## Release notes

Update `CHANGELOG.md` before publishing a release. Move relevant **Unreleased** entries under the released version without inventing dates or historical details. A GitHub release currently does not create application installers; release assets and checksums must not be documented until a packaging workflow produces them.
