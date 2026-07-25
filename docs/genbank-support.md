# GenBank support

| Construct | Status |
|---|---|
| Plain `.gb`, `.gbk`, `.genbank`, `.gbff` transport | Supported |
| Gzip-compressed forms ending in `.gz` | Supported; gzip is compression, not a biological format |
| LOCUS ID, length, topology | Supported |
| DEFINITION, ACCESSION | Supported |
| VERSION and other metadata | Partially supported |
| FEATURES, ORIGIN | Supported |
| Simple intervals, single bases | Supported |
| `complement`, `join`, nested `complement(join(...))` | Supported |
| Partial `<` / `>` coordinates | Supported |
| Multiple `//`-separated records | Supported |
| Valueless and multiline quoted qualifiers, doubled quotes | Supported |
| Lowercase sequence, CRLF | Supported |
| Empty feature table or sequence | Supported with warning |
| LOCUS length mismatch, out-of-bounds feature | Preserved with warning |
| `order`, `one-of` | Preserved with warning |
| Remote locations such as `J00194.1:100..200` | Preserved with warning |
| Between-base `123^124` | Preserved with warning |
| Circular origin-spanning feature semantics | Not yet tested |

Unsupported location text is stored in an explicit variant with no intervals. It is not replaced by a bounding interval, so it cannot be accidentally rendered or extracted as a different biological feature.

Gzip bytes are decompressed in the browser before UTF-8 decoding and parsing. Both file-picker and drag-and-drop inputs use the same reader. Compression does not change the GenBank grammar or Rust parser.
