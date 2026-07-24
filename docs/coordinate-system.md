# Coordinate system

Rust and TypeScript state use zero-based, half-open intervals:

| GenBank | Internal |
|---|---|
| `1..3` | `[0, 3)` |
| `10..12` | `[9, 12)` |
| `complement(10..12)` | `[9, 12)`, reverse strand |

Half-open coordinates make length `end - start`, adjacency unambiguous, and browser slicing direct. Inputs and ruler labels are one-based; `5000..10000` becomes `[4999,10000)`.

Reverse features retain `start < end` on the forward reference. Joined features keep each interval; reverse joined sequence is assembled then reverse-complemented, yielding biological transcript order. `<` and `>` become partial-boundary flags.

Viewport bounds use the same convention and clamp to `[0, sequence_length)`. A codon is positioned by its three-base genomic interval. Reverse-frame codons also use increasing forward-reference intervals, while the returned codon bases are in translated reverse-complement orientation.
