# Maintaining documentation

## Structure

`mkdocs.yml` defines metadata and navigation. User, reference, architecture, development, and project pages live under `docs/`; screenshots live under `docs/assets/`. `README.md` is the repository landing page, and `CHANGELOG.md` records release-facing changes.

## Local setup and strict build

Use Python 3.10 or newer in an isolated environment:

```bash
python -m pip install -r requirements-docs.txt
python -m mkdocs build --strict
```

The build writes `site/`. It is generated output and is not committed.

## Add or change a page

1. Put the Markdown file under `docs/`.
2. Add it to the appropriate section of `mkdocs.yml`.
3. Link it from a related task or reference page rather than duplicating canonical material.
4. Use visible UI labels exactly and distinguish one-based user coordinates from zero-based half-open internal coordinates.
5. Run the strict build and documentation audit.

## Links and images

Use repository-relative paths. Give every image meaningful alternative text and avoid branch-specific raw GitHub URLs. From `web/`, run:

```bash
npm run docs:audit
```

This checks local Markdown/image targets, stale names/placeholders, asset references, the expected screenshot inventory, feature-group keys, and genetic-code table identifiers/names.

## Regenerate screenshots

Install the project dependencies and Playwright Chromium, then run the deterministic production-build capture:

```bash
cd web
npm ci
npx playwright install chromium
npm run docs:screenshots
```

`web/tests/docs-screenshots.spec.ts` uses repository fixtures, a 1440 × 1200 viewport, disabled animations, stable selectors, and explicit WASM/Canvas waits. It writes directly to `docs/assets/`. Review every image visually after generation; the automated check intentionally avoids brittle pixel-perfect comparisons.

### Screenshot inventory

| Asset | Fixture/state | Used by |
|---|---|---|
| `viewer-loaded.png` | `two_records.gbk`, first record | Quick start |
| `viewer-layout-gzip.png` | `simple_linear.gbk.gz` loaded | README, loading files |
| `grouped-tracks-default.png` | `grouped_tracks.gbk`, default groups | Annotation tracks |
| `grouped-tracks-all.png` | all six groups visible | Annotation tracks |
| `feature-inspector.png` | selected grouped-track feature | Feature inspection |
| `low-zoom-stop-tracks.png` | `stop_tracks.gbk`, whole record | Six reading frames |
| `high-zoom-six-frames.png` | `stop_tracks.gbk`, bases 1–120 | Six reading frames |
| `search-nucleotide-forward.png` | forward nucleotide hit | Search semantics |
| `search-nucleotide-reverse.png` | reverse nucleotide hit | Search semantics |
| `search-peptide-low-zoom.png` | frame +2 hit, whole record | Search semantics |
| `search-peptide-high-zoom.png` | same frame +2 hit, detailed mode | Search semantics |
| `search-peptide-reverse-frame.png` | selected negative-frame hit | Search semantics |

## Registry-backed reference tables

When `GENETIC_CODES` changes, update [Genetic-code support](genetic-codes.md) from the Rust registry and run `npm run docs:audit`; CI rejects missing table IDs or short names. When `FEATURE_TYPES` changes, update [Feature keys and display groups](feature-groups.md); the same audit rejects omitted keys.

## Read the Docs

Pull requests validate MkDocs locally without an API token. See [Read the Docs integration](readthedocs.md) for previews, publication, manual triggers, version policy, and failed-build diagnosis.

## Feature pull-request checklist

- [ ] User guide updated
- [ ] Reference docs updated
- [ ] Architecture docs updated
- [ ] Accessibility docs updated
- [ ] Privacy implications reviewed
- [ ] Screenshots regenerated when the visible UI changed
- [ ] Tests and fixtures documented
- [ ] Roadmap/limitations updated
