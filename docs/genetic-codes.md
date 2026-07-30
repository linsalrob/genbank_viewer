# Genetic-code support

The **Genetic code** control lists every table registered in `crates/genome-core/src/translation.rs`. Table 11 is the default. The selected table controls six-frame amino-acid rendering, start/stop markers, low-zoom stop tracks, and amino-acid search.

| Table | Short name | Full description |
|---:|---|---|
| 1 | Standard | The Standard Code |
| 2 | Vertebrate Mitochondrial | The Vertebrate Mitochondrial Code |
| 3 | Yeast Mitochondrial | The Yeast Mitochondrial Code |
| 4 | Mold/Protozoan Mitochondrial and Mycoplasma | Mold, Protozoan and Coelenterate Mitochondrial; Mycoplasma/Spiroplasma |
| 5 | Invertebrate Mitochondrial | The Invertebrate Mitochondrial Code |
| 6 | Ciliate Nuclear | Ciliate, Dasycladacean and Hexamita Nuclear |
| 9 | Echinoderm/Flatworm Mitochondrial | Echinoderm and Flatworm Mitochondrial |
| 10 | Euplotid Nuclear | The Euplotid Nuclear Code |
| 11 | Bacterial, Archaeal and Plant Plastid | The Bacterial, Archaeal and Plant Plastid Code |
| 12 | Alternative Yeast Nuclear | The Alternative Yeast Nuclear Code |
| 13 | Ascidian Mitochondrial | The Ascidian Mitochondrial Code |
| 14 | Alternative Flatworm Mitochondrial | The Alternative Flatworm Mitochondrial Code |
| 15 | Blepharisma Nuclear | The Blepharisma Nuclear Code |
| 16 | Chlorophycean Mitochondrial | The Chlorophycean Mitochondrial Code |
| 21 | Trematode Mitochondrial | The Trematode Mitochondrial Code |
| 22 | Scenedesmus Mitochondrial | Scenedesmus obliquus Mitochondrial |
| 23 | Thraustochytrium Mitochondrial | The Thraustochytrium Mitochondrial Code |
| 24 | Rhabdopleuridae Mitochondrial | The Rhabdopleuridae Mitochondrial Code |
| 25 | SR1 and Gracilibacteria | Candidate Division SR1 and Gracilibacteria |
| 26 | Pachysolen Nuclear | Pachysolen tannophilus Nuclear |
| 27 | Karyorelict Nuclear | The Karyorelict Nuclear Code |
| 28 | Condylostoma Nuclear | The Condylostoma Nuclear Code |
| 29 | Mesodinium Nuclear | The Mesodinium Nuclear Code |
| 30 | Peritrich Nuclear | The Peritrich Nuclear Code |
| 31 | Blastocrithidia Nuclear | The Blastocrithidia Nuclear Code |
| 32 | Balanophoraceae Plastid | The Balanophoraceae Plastid Code |
| 33 | Cephalodiscidae Mitochondrial | The Cephalodiscidae Mitochondrial UAA-Tyr Code |

The documentation audit validates table numbers and short names against the Rust registry. The code data was transcribed from NCBI `gc.prt` version 4.6, as recorded in the source.

## Feature-declared tables

The viewer scans `/transl_table` qualifiers and marks those table numbers with “record” in the selector. A valid table in the selected CDS appears in the inspector with **Use feature code N**. The application does not infer a table from taxonomy and does not automatically change the global selection merely because the file declares one.

## Biological limitations

The renderer translates bare codons with the selected table. It marks accepted initiator codons but does not model transcript editing, programmed frameshifts, selenocysteine/pyrrolysine context, stop-codon reassignment that depends on sequence context, splicing outside parsed joined locations, or organism-specific exceptions. Some NCBI tables describe context-dependent termination; a codon-only display cannot reproduce those biological rules fully.
