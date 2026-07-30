# Contributing

Open an issue before large scope changes. Branch from current `main`, keep crate boundaries intact, add small synthetic tests, run `make check` and `make docs`, and describe biological conventions explicitly.

Avoid backends, uploads, annotation editing, and format expansion without prior design agreement. Do not include real sequence data without accession, retrieval date, and redistribution/provenance notes. Contributions are accepted under the repository’s MIT licence.

Every change should consider user/reference documentation, architecture, accessibility, privacy/data flow, tests and fixtures, release notes, and roadmap limitations. Regenerate deterministic screenshots when visible controls or layout change; backend-only work with no visible effect does not require screenshots. Use the checklist in [Maintaining documentation](documentation.md#feature-pull-request-checklist) and complete the repository pull-request template.
