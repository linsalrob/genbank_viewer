## Summary

Expands Webtemis from its initial proof of concept into a more complete interactive GenBank viewer and introduces a comprehensive user and developer documentation suite.

## Major changes

- coordinate-aware regional six-frame translation;
- translation tables 1 and 11;
- multi-record GenBank support;
- structured parser warnings;
- coding-density calculations;
- directional feature tracks;
- feature selection and inspection;
- nucleotide and reverse-complement display;
- improved zooming, panning, navigation, and accessibility;
- complete MkDocs documentation;
- expanded Rust, TypeScript, and browser tests;
- CI coverage for code and documentation.

## Validation

- [ ] `cargo fmt --all --check`
- [ ] `cargo clippy --workspace --all-targets -- -D warnings`
- [ ] `cargo test --workspace`
- [ ] `npm run check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Playwright smoke tests
- [ ] MkDocs strict build

## Manual testing

Describe the synthetic GenBank fixtures and browsers used.

## Known limitations

List remaining unsupported GenBank constructs, rendering limitations, performance constraints, and deferred work.

## Screenshots

Include before-and-after screenshots or a short GIF where practical.
