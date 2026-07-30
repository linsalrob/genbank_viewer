//! NCBI genetic-code metadata and coordinate-aware six-frame translation.

use serde::{Deserialize, Serialize};

/// Display metadata for an NCBI translation table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct GeneticCodeMetadata {
    pub id: u8,
    pub short_name: &'static str,
    pub description: &'static str,
}

#[derive(Debug)]
struct GeneticCodeDefinition {
    metadata: GeneticCodeMetadata,
    /// Amino acids in NCBI's canonical T,C,A,G codon order.
    amino_acids: &'static [u8; 64],
    /// `M` marks an accepted initiator in the same codon order.
    starts: &'static [u8; 64],
}

#[derive(Debug, Clone, Copy)]
/// A validated handle to one immutable registered NCBI genetic code.
pub struct GeneticCode(&'static GeneticCodeDefinition);

// Data transcribed from NCBI gc.prt version 4.6 / Genetic Codes page,
// retrieved 2026-07-25. Codon order is documented in docs/translation.md.
macro_rules! code {
    ($id:literal, $short:literal, $description:literal, $aa:literal, $starts:literal) => {
        GeneticCodeDefinition {
            metadata: GeneticCodeMetadata {
                id: $id,
                short_name: $short,
                description: $description,
            },
            amino_acids: $aa,
            starts: $starts,
        }
    };
}

static GENETIC_CODES: &[GeneticCodeDefinition] = &[
    code!(
        1,
        "Standard",
        "The Standard Code",
        b"FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"---M------**--*----M---------------M----------------------------"
    ),
    code!(
        2,
        "Vertebrate Mitochondrial",
        "The Vertebrate Mitochondrial Code",
        b"FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSS**VVVVAAAADDEEGGGG",
        b"----------**--------------------MMMM----------**---M------------"
    ),
    code!(
        3,
        "Yeast Mitochondrial",
        "The Yeast Mitochondrial Code",
        b"FFLLSSSSYY**CCWWTTTTPPPPHHQQRRRRIIMMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"----------**----------------------MM---------------M------------"
    ),
    code!(
        4,
        "Mold/Protozoan Mitochondrial and Mycoplasma",
        "Mold, Protozoan and Coelenterate Mitochondrial; Mycoplasma/Spiroplasma",
        b"FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"--MM------**-------M------------MMMM---------------M------------"
    ),
    code!(
        5,
        "Invertebrate Mitochondrial",
        "The Invertebrate Mitochondrial Code",
        b"FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSSSVVVVAAAADDEEGGGG",
        b"---M------**--------------------MMMM---------------M------------"
    ),
    code!(
        6,
        "Ciliate Nuclear",
        "Ciliate, Dasycladacean and Hexamita Nuclear",
        b"FFLLSSSSYYQQCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"--------------*--------------------M----------------------------"
    ),
    code!(
        9,
        "Echinoderm/Flatworm Mitochondrial",
        "Echinoderm and Flatworm Mitochondrial",
        b"FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG",
        b"----------**-----------------------M---------------M------------"
    ),
    code!(
        10,
        "Euplotid Nuclear",
        "The Euplotid Nuclear Code",
        b"FFLLSSSSYY**CCCWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"----------**-----------------------M----------------------------"
    ),
    code!(
        11,
        "Bacterial, Archaeal and Plant Plastid",
        "The Bacterial, Archaeal and Plant Plastid Code",
        b"FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"---M------**--*----M------------MMMM---------------M------------"
    ),
    code!(
        12,
        "Alternative Yeast Nuclear",
        "The Alternative Yeast Nuclear Code",
        b"FFLLSSSSYY**CC*WLLLSPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"----------**--*----M---------------M----------------------------"
    ),
    code!(
        13,
        "Ascidian Mitochondrial",
        "The Ascidian Mitochondrial Code",
        b"FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSGGVVVVAAAADDEEGGGG",
        b"---M------**----------------------MM---------------M------------"
    ),
    code!(
        14,
        "Alternative Flatworm Mitochondrial",
        "The Alternative Flatworm Mitochondrial Code",
        b"FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG",
        b"-----------*-----------------------M----------------------------"
    ),
    code!(
        15,
        "Blepharisma Nuclear",
        "The Blepharisma Nuclear Code",
        b"FFLLSSSSYY*QCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"----------*---*--------------------M----------------------------"
    ),
    code!(
        16,
        "Chlorophycean Mitochondrial",
        "The Chlorophycean Mitochondrial Code",
        b"FFLLSSSSYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"----------*---*--------------------M----------------------------"
    ),
    code!(
        21,
        "Trematode Mitochondrial",
        "The Trematode Mitochondrial Code",
        b"FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNNKSSSSVVVVAAAADDEEGGGG",
        b"----------**-----------------------M---------------M------------"
    ),
    code!(
        22,
        "Scenedesmus Mitochondrial",
        "Scenedesmus obliquus Mitochondrial",
        b"FFLLSS*SYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"------*---*---*--------------------M----------------------------"
    ),
    code!(
        23,
        "Thraustochytrium Mitochondrial",
        "The Thraustochytrium Mitochondrial Code",
        b"FF*LSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"--*-------**--*-----------------M--M---------------M------------"
    ),
    code!(
        24,
        "Rhabdopleuridae Mitochondrial",
        "The Rhabdopleuridae Mitochondrial Code",
        b"FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSSKVVVVAAAADDEEGGGG",
        b"---M------**-------M---------------M---------------M------------"
    ),
    code!(
        25,
        "SR1 and Gracilibacteria",
        "Candidate Division SR1 and Gracilibacteria",
        b"FFLLSSSSYY**CCGWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"---M------**-----------------------M---------------M------------"
    ),
    code!(
        26,
        "Pachysolen Nuclear",
        "Pachysolen tannophilus Nuclear",
        b"FFLLSSSSYY**CC*WLLLAPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"----------**--*----M---------------M----------------------------"
    ),
    code!(
        27,
        "Karyorelict Nuclear",
        "The Karyorelict Nuclear Code",
        b"FFLLSSSSYYQQCCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"--------------*--------------------M----------------------------"
    ),
    code!(
        28,
        "Condylostoma Nuclear",
        "The Condylostoma Nuclear Code",
        b"FFLLSSSSYYQQCCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"----------**--*--------------------M----------------------------"
    ),
    code!(
        29,
        "Mesodinium Nuclear",
        "The Mesodinium Nuclear Code",
        b"FFLLSSSSYYYYCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"--------------*--------------------M----------------------------"
    ),
    code!(
        30,
        "Peritrich Nuclear",
        "The Peritrich Nuclear Code",
        b"FFLLSSSSYYEECC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"--------------*--------------------M----------------------------"
    ),
    code!(
        31,
        "Blastocrithidia Nuclear",
        "The Blastocrithidia Nuclear Code",
        b"FFLLSSSSYYEECCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"----------**-----------------------M----------------------------"
    ),
    code!(
        32,
        "Balanophoraceae Plastid",
        "The Balanophoraceae Plastid Code",
        b"FFLLSSSSYY*WCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG",
        b"---M------*---*----M------------MMMM---------------M------------"
    ),
    code!(
        33,
        "Cephalodiscidae Mitochondrial",
        "The Cephalodiscidae Mitochondrial UAA-Tyr Code",
        b"FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSSKVVVVAAAADDEEGGGG",
        b"---M-------*-------M---------------M---------------M------------"
    ),
];

/// Returns metadata for every registered table in selector order.
pub fn supported_genetic_codes() -> Vec<GeneticCodeMetadata> {
    GENETIC_CODES.iter().map(|code| code.metadata).collect()
}

impl Default for GeneticCode {
    fn default() -> Self {
        Self::try_from(11).expect("NCBI table 11 is registered")
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum TranslationError {
    UnsupportedGeneticCode {
        value: u8,
    },
    InvalidRegion {
        start: u64,
        end: u64,
        sequence_length: u64,
    },
}

impl std::fmt::Display for TranslationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnsupportedGeneticCode { value } => {
                write!(formatter, "unsupported NCBI genetic code {value}")
            }
            Self::InvalidRegion {
                start,
                end,
                sequence_length,
            } => {
                write!(
                    formatter,
                    "invalid region [{start}, {end}) for a sequence of length {sequence_length}"
                )
            }
        }
    }
}

impl std::error::Error for TranslationError {}

impl TryFrom<u8> for GeneticCode {
    type Error = TranslationError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        GENETIC_CODES
            .iter()
            .find(|code| code.metadata.id == value)
            .map(Self)
            .ok_or(TranslationError::UnsupportedGeneticCode { value })
    }
}

impl GeneticCode {
    pub fn id(self) -> u8 {
        self.0.metadata.id
    }

    pub fn metadata(self) -> GeneticCodeMetadata {
        self.0.metadata
    }
}

/// One translated codon mapped to an increasing forward-reference interval.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TranslatedCodon {
    pub genomic_start: u64,
    pub genomic_end: u64,
    pub amino_acid: char,
    /// Codon bases in translated (5′→3′) orientation. Reverse-frame codons
    /// therefore contain the reverse complement of the forward reference.
    pub codon: [u8; 3],
    pub frame: i8,
    pub is_start: bool,
    pub is_stop: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
/// Codons intersecting a requested region in all six globally aligned frames.
pub struct SixFrameTranslation {
    pub region_start: u64,
    pub region_end: u64,
    pub codons: Vec<TranslatedCodon>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
/// A table-specific stop codon in one signed reading frame.
pub struct StopCodon {
    pub genomic_start: u64,
    pub genomic_end: u64,
    pub frame: i8,
}

/// Returns the uppercase DNA reverse complement; ambiguous symbols become `N`.
pub fn reverse_complement(input: &[u8]) -> Vec<u8> {
    input.iter().rev().map(|base| complement(*base)).collect()
}

fn complement(base: u8) -> u8 {
    match normalize(base) {
        b'A' => b'T',
        b'T' => b'A',
        b'G' => b'C',
        b'C' => b'G',
        _ => b'N',
    }
}

fn normalize(base: u8) -> u8 {
    match base.to_ascii_uppercase() {
        b'U' => b'T',
        base => base,
    }
}

fn normalized_codon(codon: &[u8]) -> Option<[u8; 3]> {
    let [a, b, c] = codon else { return None };
    let result = [normalize(*a), normalize(*b), normalize(*c)];
    result
        .iter()
        .all(|b| matches!(b, b'A' | b'C' | b'G' | b'T'))
        .then_some(result)
}

fn codon_index(codon: [u8; 3]) -> usize {
    fn base_index(base: u8) -> usize {
        match base {
            b'T' => 0,
            b'C' => 1,
            b'A' => 2,
            b'G' => 3,
            _ => unreachable!("codon was normalized"),
        }
    }
    base_index(codon[0]) * 16 + base_index(codon[1]) * 4 + base_index(codon[2])
}

fn amino_acid(codon: [u8; 3], code: GeneticCode) -> char {
    code.0.amino_acids[codon_index(codon)] as char
}

fn is_start(codon: [u8; 3], code: GeneticCode) -> bool {
    code.0.starts[codon_index(codon)] == b'M'
}

/// Translates one codon with the standard code; invalid/ambiguous input is `X`.
pub fn codon_to_aa(codon: &[u8]) -> char {
    codon_to_aa_with_code(
        codon,
        GeneticCode::try_from(1).expect("standard code is registered"),
    )
}

/// Translates one codon with a selected registered code.
pub fn codon_to_aa_with_code(codon: &[u8], code: GeneticCode) -> char {
    normalized_codon(codon)
        .map(|value| amino_acid(value, code))
        .unwrap_or('X')
}

/// Translates codons intersecting a zero-based half-open region in six frames.
///
/// Frame alignment is anchored to the complete record. Reverse codons expose
/// forward-reference coordinates while retaining bases in translated 5′→3′
/// orientation.
pub fn translate_region_six_frames(
    sequence: &[u8],
    region_start: u64,
    region_end: u64,
    genetic_code: GeneticCode,
) -> Result<SixFrameTranslation, TranslationError> {
    let len = sequence.len() as u64;
    if region_start > region_end || region_end > len {
        return Err(TranslationError::InvalidRegion {
            start: region_start,
            end: region_end,
            sequence_length: len,
        });
    }
    let mut codons = Vec::new();
    if region_start == region_end || len < 3 {
        return Ok(SixFrameTranslation {
            region_start,
            region_end,
            codons,
        });
    }

    for offset in 0..3_u64 {
        let first_index = region_start.saturating_sub(offset).saturating_sub(2) / 3;
        let mut start = offset + first_index * 3;
        while start + 3 <= len {
            if start >= region_end {
                break;
            }
            if start + 3 > region_start {
                push_codon(
                    &mut codons,
                    sequence,
                    start,
                    start + 3,
                    offset as i8 + 1,
                    genetic_code,
                    false,
                );
            }
            start += 3;
        }
    }

    // Reverse frame -n has offset n-1 on the full reverse complement. A codon's
    // forward-reference interval is [len - (offset + 3k + 3), len - (offset + 3k)).
    let reverse = reverse_complement(sequence);
    for offset in 0..3_u64 {
        let reverse_region_start = len - region_end;
        let first_index = reverse_region_start
            .saturating_sub(offset)
            .saturating_sub(2)
            / 3;
        let mut rc_start = offset + first_index * 3;
        while rc_start + 3 <= len {
            let start = len - (rc_start + 3);
            let end = len - rc_start;
            if end <= region_start {
                break;
            }
            if start < region_end && end > region_start {
                push_codon(
                    &mut codons,
                    &reverse,
                    rc_start,
                    rc_start + 3,
                    -(offset as i8 + 1),
                    genetic_code,
                    true,
                );
                let last = codons.last_mut().expect("codon was pushed");
                last.genomic_start = start;
                last.genomic_end = end;
            }
            rc_start += 3;
        }
    }
    codons.sort_by_key(|c| (c.frame, c.genomic_start));
    Ok(SixFrameTranslation {
        region_start,
        region_end,
        codons,
    })
}

/// Returns only stop-codon coordinates for the six global reading frames.
///
/// Unlike [`translate_region_six_frames`], this does not allocate DTOs for
/// non-stop codons, which keeps whole-genome overview requests tractable.
pub fn stop_codons_in_region(
    sequence: &[u8],
    region_start: u64,
    region_end: u64,
    genetic_code: GeneticCode,
) -> Result<Vec<StopCodon>, TranslationError> {
    let len = sequence.len() as u64;
    if region_start > region_end || region_end > len {
        return Err(TranslationError::InvalidRegion {
            start: region_start,
            end: region_end,
            sequence_length: len,
        });
    }
    if region_start == region_end || len < 3 {
        return Ok(Vec::new());
    }

    let mut stops = Vec::new();
    for offset in 0..3_u64 {
        let first_index = region_start.saturating_sub(offset).saturating_sub(2) / 3;
        let mut start = offset + first_index * 3;
        while start + 3 <= len && start < region_end {
            if start + 3 > region_start
                && codon_to_aa_with_code(
                    &sequence[start as usize..start as usize + 3],
                    genetic_code,
                ) == '*'
            {
                stops.push(StopCodon {
                    genomic_start: start,
                    genomic_end: start + 3,
                    frame: offset as i8 + 1,
                });
            }
            start += 3;
        }
    }

    let reverse = reverse_complement(sequence);
    for offset in 0..3_u64 {
        let reverse_region_start = len - region_end;
        let first_index = reverse_region_start
            .saturating_sub(offset)
            .saturating_sub(2)
            / 3;
        let mut rc_start = offset + first_index * 3;
        while rc_start + 3 <= len {
            let start = len - (rc_start + 3);
            let end = len - rc_start;
            if end <= region_start {
                break;
            }
            if start < region_end
                && codon_to_aa_with_code(
                    &reverse[rc_start as usize..rc_start as usize + 3],
                    genetic_code,
                ) == '*'
            {
                stops.push(StopCodon {
                    genomic_start: start,
                    genomic_end: end,
                    frame: -(offset as i8 + 1),
                });
            }
            rc_start += 3;
        }
    }
    stops.sort_by_key(|stop| (stop.frame, stop.genomic_start));
    Ok(stops)
}

fn push_codon(
    output: &mut Vec<TranslatedCodon>,
    source: &[u8],
    start: u64,
    end: u64,
    frame: i8,
    code: GeneticCode,
    _reverse: bool,
) {
    let raw = &source[start as usize..end as usize];
    let codon = [normalize(raw[0]), normalize(raw[1]), normalize(raw[2])];
    let valid = normalized_codon(&codon);
    let amino_acid = valid.map(|codon| amino_acid(codon, code)).unwrap_or('X');
    output.push(TranslatedCodon {
        genomic_start: start,
        genomic_end: end,
        amino_acid,
        codon,
        frame,
        is_start: valid.is_some_and(|c| is_start(c, code)),
        is_stop: amino_acid == '*',
    });
}

pub fn translate_frame(seq: &[u8], offset: usize) -> String {
    seq.get(offset..)
        .unwrap_or_default()
        .chunks_exact(3)
        .map(codon_to_aa)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_lowercase_rna_and_ambiguity() {
        assert_eq!(codon_to_aa(b"aug"), 'M');
        assert_eq!(codon_to_aa(b"NNN"), 'X');
        assert_eq!(reverse_complement(b"AUGCN"), b"NGCAT");
    }

    #[test]
    fn start_sets_differ_but_amino_acid_does_not() {
        let standard =
            translate_region_six_frames(b"GTG", 0, 3, GeneticCode::try_from(1).unwrap()).unwrap();
        let bacterial =
            translate_region_six_frames(b"GTG", 0, 3, GeneticCode::try_from(11).unwrap()).unwrap();
        let standard_plus_one = standard.codons.iter().find(|c| c.frame == 1).unwrap();
        let bacterial_plus_one = bacterial.codons.iter().find(|c| c.frame == 1).unwrap();
        assert!(!standard_plus_one.is_start);
        assert!(bacterial_plus_one.is_start);
        assert_eq!(standard_plus_one.amino_acid, 'V');
    }

    #[test]
    fn preserves_global_alignment_and_includes_intersections() {
        let a = translate_region_six_frames(b"ATGAAATAA", 0, 5, GeneticCode::default()).unwrap();
        let b = translate_region_six_frames(b"ATGAAATAA", 1, 6, GeneticCode::default()).unwrap();
        let coords = |r: &SixFrameTranslation| {
            r.codons
                .iter()
                .filter(|c| c.frame == 1)
                .map(|c| (c.genomic_start, c.genomic_end))
                .collect::<Vec<_>>()
        };
        assert_eq!(coords(&a), vec![(0, 3), (3, 6)]);
        assert_eq!(coords(&b), vec![(0, 3), (3, 6)]);
    }

    #[test]
    fn maps_reverse_codons_exactly_and_reports_translated_orientation() {
        let result =
            translate_region_six_frames(b"AAACCCCAT", 0, 9, GeneticCode::default()).unwrap();
        let minus_one = result
            .codons
            .iter()
            .filter(|c| c.frame == -1)
            .collect::<Vec<_>>();
        assert_eq!(
            (
                minus_one[0].genomic_start,
                minus_one[0].genomic_end,
                minus_one[0].codon
            ),
            (0, 3, *b"TTT")
        );
        assert_eq!(
            (
                minus_one[2].genomic_start,
                minus_one[2].genomic_end,
                minus_one[2].codon
            ),
            (6, 9, *b"ATG")
        );
    }

    #[test]
    fn handles_boundaries_short_sequences_and_stops() {
        assert!(
            translate_region_six_frames(b"AT", 0, 2, GeneticCode::default())
                .unwrap()
                .codons
                .is_empty()
        );
        let result =
            translate_region_six_frames(b"TAA", 0, 3, GeneticCode::try_from(1).unwrap()).unwrap();
        assert!(result.codons.iter().any(|c| c.frame == 1 && c.is_stop));
        assert!(
            translate_region_six_frames(b"ATG", 3, 3, GeneticCode::try_from(1).unwrap())
                .unwrap()
                .codons
                .is_empty()
        );
    }

    #[test]
    fn returns_stop_only_coordinates_in_all_six_frames() {
        let code = GeneticCode::try_from(1).unwrap();
        for frame in [-3_i8, -2, -1, 1, 2, 3] {
            let mut oriented = b"CCCCCCCCCCCCCCC".to_vec();
            let offset = frame.unsigned_abs() as usize - 1;
            oriented[offset..offset + 3].copy_from_slice(b"TAA");
            let sequence = if frame > 0 {
                oriented
            } else {
                reverse_complement(&oriented)
            };
            let full =
                translate_region_six_frames(&sequence, 0, sequence.len() as u64, code).unwrap();
            let stops = stop_codons_in_region(&sequence, 0, sequence.len() as u64, code).unwrap();
            let expected = full
                .codons
                .into_iter()
                .filter(|codon| codon.is_stop)
                .map(|codon| (codon.genomic_start, codon.genomic_end, codon.frame))
                .collect::<Vec<_>>();
            let actual = stops
                .iter()
                .map(|stop| (stop.genomic_start, stop.genomic_end, stop.frame))
                .collect::<Vec<_>>();
            assert_eq!(actual, expected);
            assert!(stops.iter().any(|stop| stop.frame == frame));
        }
    }

    #[test]
    fn stop_only_regions_handle_boundaries_short_sequences_and_codes() {
        let code1 = GeneticCode::try_from(1).unwrap();
        let code4 = GeneticCode::try_from(4).unwrap();
        assert_eq!(
            stop_codons_in_region(b"AT", 0, 2, code1).unwrap(),
            Vec::new()
        );
        assert_eq!(
            stop_codons_in_region(b"TGA", 0, 0, code1).unwrap(),
            Vec::new()
        );
        assert!(stop_codons_in_region(b"TGA", 0, 3, code1)
            .unwrap()
            .iter()
            .any(|stop| stop.frame == 1));
        assert!(!stop_codons_in_region(b"TGA", 0, 3, code4)
            .unwrap()
            .iter()
            .any(|stop| stop.frame == 1));
        assert!(stop_codons_in_region(b"CCCTAAGGG", 3, 6, code1)
            .unwrap()
            .iter()
            .all(|stop| stop.genomic_end > 3 && stop.genomic_start < 6));
    }

    #[test]
    fn emits_all_six_global_frames() {
        let result =
            translate_region_six_frames(b"ATGCCCTAA", 0, 9, GeneticCode::default()).unwrap();
        let mut frames = result
            .codons
            .iter()
            .map(|codon| codon.frame)
            .collect::<Vec<_>>();
        frames.sort_unstable();
        frames.dedup();
        assert_eq!(frames, vec![-3, -2, -1, 1, 2, 3]);
        for codon in result.codons {
            assert_eq!(codon.genomic_end - codon.genomic_start, 3);
            assert!(codon.genomic_start < codon.genomic_end);
        }
    }

    #[test]
    fn every_registered_code_translates_all_unambiguous_codons() {
        const BASES: &[u8] = b"TCAG";
        let metadata = supported_genetic_codes();
        assert_eq!(
            metadata.iter().map(|code| code.id).collect::<Vec<_>>(),
            vec![
                1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 28,
                29, 30, 31, 32, 33
            ]
        );
        for definition in GENETIC_CODES {
            let code = GeneticCode::try_from(definition.metadata.id).unwrap();
            for &first in BASES {
                for &second in BASES {
                    for &third in BASES {
                        let codon = [first, second, third];
                        let index = codon_index(codon);
                        let amino_acid = codon_to_aa_with_code(&codon, code);
                        assert!(
                            amino_acid == '*' || "ACDEFGHIKLMNPQRSTVWY".contains(amino_acid),
                            "table {} returned {amino_acid} for {:?}",
                            code.id(),
                            codon
                        );
                        assert_eq!(amino_acid == '*', definition.amino_acids[index] == b'*');
                        assert_eq!(is_start(codon, code), definition.starts[index] == b'M');
                    }
                }
            }
        }
    }

    #[test]
    fn known_table_differences_match_ncbi() {
        let standard = GeneticCode::try_from(1).unwrap();
        let vertebrate = GeneticCode::try_from(2).unwrap();
        let mold = GeneticCode::try_from(4).unwrap();
        let bacterial = GeneticCode::try_from(11).unwrap();
        let ciliate = GeneticCode::try_from(6).unwrap();

        assert_eq!(codon_to_aa_with_code(b"TGA", standard), '*');
        assert_eq!(codon_to_aa_with_code(b"TGA", mold), 'W');
        assert_eq!(codon_to_aa_with_code(b"AGA", vertebrate), '*');
        assert_eq!(codon_to_aa_with_code(b"AGG", vertebrate), '*');
        assert_eq!(codon_to_aa_with_code(b"ATA", standard), 'I');
        assert_eq!(codon_to_aa_with_code(b"ATA", vertebrate), 'M');
        assert!(is_start(*b"CTG", standard));
        assert!(is_start(*b"GTG", bacterial));
        assert_eq!(codon_to_aa_with_code(b"TAA", ciliate), 'Q');
    }
}
