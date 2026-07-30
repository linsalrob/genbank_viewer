# Feature keys and display groups

A **feature key** names an annotated region, such as `CDS`, `tRNA`, or `repeat_region`. A **qualifier** is metadata attached to that feature, such as `/gene="recA"`. A **display group** is genbank_viewer's visual organisation of related feature keys.

Classification is case-insensitive for display, but the original feature-key spelling is preserved. Unknown, obsolete, or non-standard keys remain available under **Other**. This taxonomy is a viewer convention, not an official INSDC hierarchy, and genbank_viewer is not a complete INSDC validator.

| Display group | Initially visible | Implemented feature keys |
|---|---:|---|
| Genes and CDSs | Yes | `gene`, `cds` |
| RNAs and transcripts | Yes | `mrna`, `ncrna`, `misc_rna`, `precursor_rna`, `prim_transcript`, `rrna`, `trna`, `tmrna`, `exon`, `intron`, `5'utr`, `3'utr` |
| Protein processing | No | `mat_peptide`, `sig_peptide`, `transit_peptide`, `propeptide` |
| Regulatory and genomic regions | No | `operon`, `regulatory`, `protein_bind`, `primer_bind`, `misc_binding`, `polya_site`, `rep_origin`, `orit`, `d-loop`, `repeat_region`, `mobile_element`, `misc_recomb`, `stem_loop`, `misc_structure`, `misc_feature`, `idna`, `centromere`, `telomere`, `sts` |
| Assembly, source, and variation | No | `source`, `gap`, `assembly_gap`, `unsure`, `variation`, `misc_difference`, `modified_base`, `old_sequence` |
| Other | No | Every key absent from the registry above |

The authoritative implementation is `web/src/lib/featureGroups.ts`. `npm run docs:audit` verifies that every registered key remains listed here.
