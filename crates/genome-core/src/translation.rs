use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum GeneticCode {
    Standard = 1,
    Bacterial = 11,
}

impl Default for GeneticCode {
    fn default() -> Self {
        Self::Bacterial
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
                write!(
                    formatter,
                    "unsupported NCBI genetic code {value}; supported codes are 1 and 11"
                )
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
        match value {
            1 => Ok(Self::Standard),
            11 => Ok(Self::Bacterial),
            value => Err(TranslationError::UnsupportedGeneticCode { value }),
        }
    }
}

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
pub struct SixFrameTranslation {
    pub region_start: u64,
    pub region_end: u64,
    pub codons: Vec<TranslatedCodon>,
}

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

fn amino_acid(codon: [u8; 3]) -> char {
    match &codon {
        b"TTT" | b"TTC" => 'F',
        b"TTA" | b"TTG" | b"CTT" | b"CTC" | b"CTA" | b"CTG" => 'L',
        b"ATT" | b"ATC" | b"ATA" => 'I',
        b"ATG" => 'M',
        b"GTT" | b"GTC" | b"GTA" | b"GTG" => 'V',
        b"TCT" | b"TCC" | b"TCA" | b"TCG" | b"AGT" | b"AGC" => 'S',
        b"CCT" | b"CCC" | b"CCA" | b"CCG" => 'P',
        b"ACT" | b"ACC" | b"ACA" | b"ACG" => 'T',
        b"GCT" | b"GCC" | b"GCA" | b"GCG" => 'A',
        b"TAT" | b"TAC" => 'Y',
        b"TAA" | b"TAG" | b"TGA" => '*',
        b"CAT" | b"CAC" => 'H',
        b"CAA" | b"CAG" => 'Q',
        b"AAT" | b"AAC" => 'N',
        b"AAA" | b"AAG" => 'K',
        b"GAT" | b"GAC" => 'D',
        b"GAA" | b"GAG" => 'E',
        b"TGT" | b"TGC" => 'C',
        b"TGG" => 'W',
        b"CGT" | b"CGC" | b"CGA" | b"CGG" | b"AGA" | b"AGG" => 'R',
        b"GGT" | b"GGC" | b"GGA" | b"GGG" => 'G',
        _ => 'X',
    }
}

fn is_start(codon: [u8; 3], code: GeneticCode) -> bool {
    match code {
        GeneticCode::Standard => codon == *b"ATG",
        GeneticCode::Bacterial => matches!(
            &codon,
            b"ATG" | b"GTG" | b"TTG" | b"CTG" | b"ATT" | b"ATC" | b"ATA"
        ),
    }
}

pub fn codon_to_aa(codon: &[u8]) -> char {
    normalized_codon(codon).map(amino_acid).unwrap_or('X')
}

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
    let amino_acid = valid.map(amino_acid).unwrap_or('X');
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
        let standard = translate_region_six_frames(b"GTG", 0, 3, GeneticCode::Standard).unwrap();
        let bacterial = translate_region_six_frames(b"GTG", 0, 3, GeneticCode::Bacterial).unwrap();
        let standard_plus_one = standard.codons.iter().find(|c| c.frame == 1).unwrap();
        let bacterial_plus_one = bacterial.codons.iter().find(|c| c.frame == 1).unwrap();
        assert!(!standard_plus_one.is_start);
        assert!(bacterial_plus_one.is_start);
        assert_eq!(standard_plus_one.amino_acid, 'V');
    }

    #[test]
    fn preserves_global_alignment_and_includes_intersections() {
        let a = translate_region_six_frames(b"ATGAAATAA", 0, 5, GeneticCode::Bacterial).unwrap();
        let b = translate_region_six_frames(b"ATGAAATAA", 1, 6, GeneticCode::Bacterial).unwrap();
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
            translate_region_six_frames(b"AAACCCCAT", 0, 9, GeneticCode::Bacterial).unwrap();
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
            translate_region_six_frames(b"AT", 0, 2, GeneticCode::Bacterial)
                .unwrap()
                .codons
                .is_empty()
        );
        let result = translate_region_six_frames(b"TAA", 0, 3, GeneticCode::Standard).unwrap();
        assert!(result.codons.iter().any(|c| c.frame == 1 && c.is_stop));
        assert!(
            translate_region_six_frames(b"ATG", 3, 3, GeneticCode::Standard)
                .unwrap()
                .codons
                .is_empty()
        );
    }

    #[test]
    fn emits_all_six_global_frames() {
        let result =
            translate_region_six_frames(b"ATGCCCTAA", 0, 9, GeneticCode::Bacterial).unwrap();
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
}
