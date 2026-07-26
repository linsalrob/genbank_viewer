# Privacy and security

Selected files are read with browser file APIs, gzip-decompressed in the browser when necessary, parsed in local WebAssembly, and rendered locally. Nucleotide and peptide queries are normalized and searched against the selected record by the same local Rust/WASM module. Neither files, decompressed sequence content, nor search queries are uploaded. genbank_viewer has no backend, upload, remote-fetch, or analytics code. A hosting provider, modified deployment, browser extension, or compromised dependency can change that property, so verify the deployed build before loading sensitive material.

Browser-local processing does not guarantee confidentiality: data remains in browser memory, may appear in screenshots, and is subject to device, browser, and extension security. Use a trusted offline build and an appropriately secured device for clinical, regulated, unpublished, or otherwise sensitive sequences. Clear the tab and browser data when required by local policy.
