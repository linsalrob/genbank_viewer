# Updating and uninstalling

genbank_viewer currently has no automatic update check, updater, installer database, persistent application settings, or central sequence database. Updating is manual and needs internet access on a preparation computer. GenBank files stay in their original locations and are not removed by uninstalling the application.

## Hosted site

The hosted GitHub Pages site can change when a new version is deployed. Reloading while online obtains whatever version the browser and host provide; normal browser-cache rules apply. It is not an installed PWA and offers no guaranteed offline cache.

To remove hosted-site data, close the tab and use the browser's site-data controls if institutional policy requires it. The current application does not deliberately persist sequence data or settings, but browser cache can retain application assets.

## Local production build

### Learn about updates

The project has no in-application notification. Check the repository or its Releases page while online. The current release entry contains no prebuilt assets, so a newer source revision must be built again.

### Update safely

1. Keep the working installation until the replacement is tested.
2. On an internet-connected preparation computer, obtain a fresh checkout of the desired revision rather than overwriting an installation that may contain local changes.
3. From its `web` directory, run `npm ci` and `npm run build`.
4. Run the project tests and the [offline verification procedure](offline-verification.md).
5. For an air-gapped destination, checksum and transfer the new complete build using approved media.
6. Stop the old local server, start the new build, and confirm the expected version or behavior.
7. Remove the old checkout only after validation and any local changes have been preserved.

Updates are not automatic and need renewed downloads of source or dependencies. Application state is memory-only, so settings such as the selected genetic code and open record do not migrate; original GenBank files are unaffected.

### Uninstall

1. In the terminal running Vite, press <kbd>Ctrl</kbd>+<kbd>C</kbd>.
2. Close browser tabs using its `127.0.0.1` address.
3. Delete the retained `genbank_viewer` checkout or transferred application directory.
4. Remove any user-created shortcut or launcher.
5. Optionally clear browser site data for `127.0.0.1:4173`. Be aware that another local application using the same origin could share that browser storage, although current genbank_viewer does not use it.
6. Remove Git, Rust, Node.js, or npm only if they were installed solely for this build and no other software needs them. Follow each tool vendor's supported removal method.

There is no Windows Settings → Apps entry, macOS Applications item, Linux package-manager record, ChromeOS PWA cache, desktop-wrapper storage, or service-worker registration to remove.

## Development server

`npm run dev` has the same manual source-update and directory-removal model, but it recompiles and serves development assets. It is intended for software development rather than a stable end-user offline installation.
