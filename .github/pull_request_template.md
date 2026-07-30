## Summary

Describe the user or developer problem and the resulting behavior.

## Validation

- [ ] `cargo fmt --all --check`
- [ ] `cargo clippy --workspace --all-targets -- -D warnings`
- [ ] `cargo test --workspace`
- [ ] `cargo doc --workspace --no-deps`
- [ ] `cd web && npm run check`
- [ ] `cd web && npm run test`
- [ ] `cd web && npm run build`
- [ ] `cd web && npm run test:e2e`
- [ ] `python -m mkdocs build --strict`
- [ ] `cd web && npm run docs:audit`

Mark checks that do not apply and explain why.

## Documentation and impact review

- [ ] User guide and reference documentation updated, or not applicable
- [ ] Architecture documentation updated, or not applicable
- [ ] Accessibility impact reviewed
- [ ] Privacy and data-flow impact reviewed
- [ ] Tests and synthetic fixtures updated/documented
- [ ] Release notes or changelog updated when user-visible
- [ ] Screenshots regenerated for visible UI changes, or not applicable
- [ ] Roadmap and known limitations remain accurate

## Manual testing

List fixtures, browsers, operating systems, and workflows exercised.

## Screenshots

Include current screenshots for visible changes. Backend-only changes do not require screenshots.

## Known limitations

Describe deferred behavior, unsupported syntax, performance constraints, and anything not verified.
