# Translation

genbank_viewer supports NCBI table 1 (Standard) and table 11 (Bacterial, Archaeal and Plant Plastid), defaulting to table 11. Amino-acid mappings and stop codons are centralised; the table distinction currently affects accepted start codons. A start codon can translate to an amino acid other than `M` because start recognition and ordinary codon translation are separate facts.

Frames `+1..+3` begin at global reference offsets 0, 1, and 2. Frames `-1..-3` begin at offsets 0, 1, and 2 of the complete reverse complement. Reverse codons return increasing forward-reference intervals but codon letters in translated 5′→3′ orientation.

`TAA`, `TAG`, and `TGA` display as `*`. Ambiguous codons display `X`. Input is case-insensitive and RNA `U` is intentionally normalised to `T`.

Only the visible region plus a three-base flank is requested. Rust derives codons from global frame alignment and includes any codon intersecting that region, so moving a viewport by one base never resets the frame.
