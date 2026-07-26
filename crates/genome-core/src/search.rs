use crate::translation::{codon_to_aa_with_code, reverse_complement, GeneticCode};
use crate::Strand;
use serde::Serialize;

pub const MIN_NUCLEOTIDE_QUERY: usize = 3;
pub const MIN_AMINO_ACID_QUERY: usize = 2;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SearchMatchType {
    Nucleotide,
    AminoAcid,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SequenceSearchMatch {
    pub start: u64,
    pub end: u64,
    pub strand: Strand,
    pub frame: Option<i8>,
    pub match_type: SearchMatchType,
    pub matched_sequence: String,
    pub genetic_code: Option<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum SearchError {
    EmptyQuery,
    QueryTooShort { minimum: usize, actual: usize },
    QueryLongerThanSequence,
    InvalidNucleotideCharacter { character: char },
    InvalidAminoAcidCharacter { character: char },
}

impl std::fmt::Display for SearchError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EmptyQuery => write!(formatter, "enter a sequence to search"),
            Self::QueryTooShort { minimum, actual } => write!(
                formatter,
                "query has {actual} symbols; enter at least {minimum}"
            ),
            Self::QueryLongerThanSequence => write!(formatter, "query is longer than the record"),
            Self::InvalidNucleotideCharacter { character } => write!(
                formatter,
                "invalid nucleotide character '{character}'; use IUPAC nucleotide symbols"
            ),
            Self::InvalidAminoAcidCharacter { character } => write!(
                formatter,
                "invalid amino-acid character '{character}'; use one-letter amino-acid symbols, *, X, B, Z, or J"
            ),
        }
    }
}

impl std::error::Error for SearchError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SearchQueryType {
    Nucleotide,
    AminoAcid,
}

pub fn normalize_query(input: &str, query_type: SearchQueryType) -> Result<Vec<u8>, SearchError> {
    let mut normalized = Vec::new();
    for line in input.lines() {
        if line.trim_start().starts_with('>') {
            continue;
        }
        for character in line.chars() {
            if character.is_whitespace() {
                continue;
            }
            let upper = character.to_ascii_uppercase();
            let valid = match query_type {
                SearchQueryType::Nucleotide => matches!(
                    upper,
                    'A' | 'C'
                        | 'G'
                        | 'T'
                        | 'U'
                        | 'R'
                        | 'Y'
                        | 'S'
                        | 'W'
                        | 'K'
                        | 'M'
                        | 'B'
                        | 'D'
                        | 'H'
                        | 'V'
                        | 'N'
                ),
                SearchQueryType::AminoAcid => matches!(
                    upper,
                    'A' | 'C'
                        | 'D'
                        | 'E'
                        | 'F'
                        | 'G'
                        | 'H'
                        | 'I'
                        | 'K'
                        | 'L'
                        | 'M'
                        | 'N'
                        | 'P'
                        | 'Q'
                        | 'R'
                        | 'S'
                        | 'T'
                        | 'V'
                        | 'W'
                        | 'Y'
                        | '*'
                        | 'X'
                        | 'B'
                        | 'Z'
                        | 'J'
                ),
            };
            if !valid {
                return Err(match query_type {
                    SearchQueryType::Nucleotide => {
                        SearchError::InvalidNucleotideCharacter { character }
                    }
                    SearchQueryType::AminoAcid => {
                        SearchError::InvalidAminoAcidCharacter { character }
                    }
                });
            }
            normalized.push(if upper == 'U' { b'T' } else { upper as u8 });
        }
    }
    if normalized.is_empty() {
        return Err(SearchError::EmptyQuery);
    }
    let minimum = match query_type {
        SearchQueryType::Nucleotide => MIN_NUCLEOTIDE_QUERY,
        SearchQueryType::AminoAcid => MIN_AMINO_ACID_QUERY,
    };
    if normalized.len() < minimum {
        return Err(SearchError::QueryTooShort {
            minimum,
            actual: normalized.len(),
        });
    }
    Ok(normalized)
}

fn nucleotide_mask(base: u8) -> Option<u8> {
    Some(match base.to_ascii_uppercase() {
        b'A' => 0b0001,
        b'C' => 0b0010,
        b'G' => 0b0100,
        b'T' | b'U' => 0b1000,
        b'R' => 0b0101,
        b'Y' => 0b1010,
        b'S' => 0b0110,
        b'W' => 0b1001,
        b'K' => 0b1100,
        b'M' => 0b0011,
        b'B' => 0b1110,
        b'D' => 0b1101,
        b'H' => 0b1011,
        b'V' => 0b0111,
        b'N' => 0b1111,
        _ => return None,
    })
}

fn complement_iupac(base: u8) -> u8 {
    match base {
        b'A' => b'T',
        b'C' => b'G',
        b'G' => b'C',
        b'T' => b'A',
        b'R' => b'Y',
        b'Y' => b'R',
        b'S' => b'S',
        b'W' => b'W',
        b'K' => b'M',
        b'M' => b'K',
        b'B' => b'V',
        b'D' => b'H',
        b'H' => b'D',
        b'V' => b'B',
        _ => b'N',
    }
}

fn reverse_complement_iupac(query: &[u8]) -> Vec<u8> {
    query
        .iter()
        .rev()
        .map(|base| complement_iupac(*base))
        .collect()
}

fn nucleotide_matches(reference: &[u8], query: &[u8]) -> bool {
    reference.iter().zip(query).all(|(reference, query)| {
        nucleotide_mask(*reference)
            .zip(nucleotide_mask(*query))
            .is_some_and(|(left, right)| left & right != 0)
    })
}

pub fn search_nucleotides(
    sequence: &[u8],
    query_input: &str,
) -> Result<Vec<SequenceSearchMatch>, SearchError> {
    let query = normalize_query(query_input, SearchQueryType::Nucleotide)?;
    if query.len() > sequence.len() {
        return Err(SearchError::QueryLongerThanSequence);
    }
    let reverse_query = reverse_complement_iupac(&query);
    let palindrome = query == reverse_query;
    let mut matches = Vec::new();
    for start in 0..=sequence.len() - query.len() {
        let reference = &sequence[start..start + query.len()];
        let forward = nucleotide_matches(reference, &query);
        let reverse = nucleotide_matches(reference, &reverse_query);
        if forward {
            matches.push(nucleotide_match(
                start,
                query.len(),
                if palindrome || reverse {
                    Strand::Unknown
                } else {
                    Strand::Forward
                },
                reference,
            ));
        } else if reverse {
            matches.push(nucleotide_match(
                start,
                query.len(),
                Strand::Reverse,
                reference,
            ));
        }
    }
    Ok(matches)
}

fn nucleotide_match(
    start: usize,
    length: usize,
    strand: Strand,
    reference: &[u8],
) -> SequenceSearchMatch {
    SequenceSearchMatch {
        start: start as u64,
        end: (start + length) as u64,
        strand,
        frame: None,
        match_type: SearchMatchType::Nucleotide,
        matched_sequence: String::from_utf8_lossy(reference).to_ascii_uppercase(),
        genetic_code: None,
    }
}

fn amino_acid_matches(translated: &[u8], query: &[u8]) -> bool {
    translated
        .iter()
        .zip(query)
        .all(|(actual, query)| match query {
            b'X' => *actual != b'*',
            b'B' => matches!(actual, b'D' | b'N'),
            b'Z' => matches!(actual, b'E' | b'Q'),
            b'J' => matches!(actual, b'I' | b'L'),
            _ => actual == query,
        })
}

pub fn search_amino_acids(
    sequence: &[u8],
    query_input: &str,
    genetic_code: GeneticCode,
) -> Result<Vec<SequenceSearchMatch>, SearchError> {
    let query = normalize_query(query_input, SearchQueryType::AminoAcid)?;
    let nucleotide_span = query.len() * 3;
    if nucleotide_span > sequence.len() {
        return Err(SearchError::QueryLongerThanSequence);
    }
    let mut matches = Vec::new();
    search_strand_frames(
        sequence,
        &query,
        genetic_code,
        Strand::Forward,
        sequence.len(),
        &mut matches,
    );
    let reverse = reverse_complement(sequence);
    search_strand_frames(
        &reverse,
        &query,
        genetic_code,
        Strand::Reverse,
        sequence.len(),
        &mut matches,
    );
    matches.sort_by_key(|item| (item.start, item.end, item.frame.unwrap_or_default()));
    Ok(matches)
}

fn search_strand_frames(
    oriented_sequence: &[u8],
    query: &[u8],
    genetic_code: GeneticCode,
    strand: Strand,
    genome_length: usize,
    matches: &mut Vec<SequenceSearchMatch>,
) {
    for offset in 0..3 {
        let translated = oriented_sequence[offset..]
            .chunks_exact(3)
            .map(|codon| codon_to_aa_with_code(codon, genetic_code) as u8)
            .collect::<Vec<_>>();
        if query.len() > translated.len() {
            continue;
        }
        for amino_start in 0..=translated.len() - query.len() {
            let actual = &translated[amino_start..amino_start + query.len()];
            if !amino_acid_matches(actual, query) {
                continue;
            }
            let oriented_start = offset + amino_start * 3;
            let oriented_end = oriented_start + query.len() * 3;
            let (start, end, frame) = match strand {
                Strand::Forward => (oriented_start, oriented_end, offset as i8 + 1),
                Strand::Reverse => (
                    genome_length - oriented_end,
                    genome_length - oriented_start,
                    -(offset as i8 + 1),
                ),
                Strand::Unknown => unreachable!(),
            };
            matches.push(SequenceSearchMatch {
                start: start as u64,
                end: end as u64,
                strand,
                frame: Some(frame),
                match_type: SearchMatchType::AminoAcid,
                matched_sequence: String::from_utf8_lossy(actual).into_owned(),
                genetic_code: Some(genetic_code.id()),
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn code(id: u8) -> GeneticCode {
        GeneticCode::try_from(id).unwrap()
    }

    #[test]
    fn normalizes_fasta_whitespace_case_and_u() {
        assert_eq!(
            normalize_query(">query\nac gu\tN", SearchQueryType::Nucleotide).unwrap(),
            b"ACGTN"
        );
        assert_eq!(
            normalize_query(">peptide\nmk\n w", SearchQueryType::AminoAcid).unwrap(),
            b"MKW"
        );
    }

    #[test]
    fn rejects_empty_short_and_invalid_queries() {
        assert_eq!(
            normalize_query(" >header\n", SearchQueryType::Nucleotide),
            Err(SearchError::EmptyQuery)
        );
        assert!(matches!(
            normalize_query("AC", SearchQueryType::Nucleotide),
            Err(SearchError::QueryTooShort { .. })
        ));
        assert!(matches!(
            normalize_query("AC1", SearchQueryType::Nucleotide),
            Err(SearchError::InvalidNucleotideCharacter { .. })
        ));
        assert!(matches!(
            normalize_query("MO", SearchQueryType::AminoAcid),
            Err(SearchError::InvalidAminoAcidCharacter { .. })
        ));
    }

    #[test]
    fn finds_forward_reverse_multiple_overlapping_and_boundaries() {
        let result = search_nucleotides(b"AAAAACCCGGG", "AAA").unwrap();
        assert_eq!(
            result
                .iter()
                .map(|item| (item.start, item.end))
                .collect::<Vec<_>>(),
            vec![(0, 3), (1, 4), (2, 5)]
        );
        assert!(result.iter().all(|item| item.strand == Strand::Forward));
        let reverse = search_nucleotides(b"AAAGCATTT", "ATGC").unwrap();
        assert_eq!(
            (reverse[0].start, reverse[0].end, reverse[0].strand),
            (3, 7, Strand::Reverse)
        );
        assert!(search_nucleotides(b"ACGT", "TTT").unwrap().is_empty());
        assert_eq!(
            search_nucleotides(b"ACGT", "ACGT").unwrap()[0].strand,
            Strand::Unknown
        );
    }

    #[test]
    fn uses_iupac_set_intersection_on_query_and_reference() {
        assert_eq!(search_nucleotides(b"AGC", "ARC").unwrap().len(), 1);
        assert_eq!(search_nucleotides(b"ANC", "AGC").unwrap().len(), 1);
        assert_eq!(search_nucleotides(b"AYC", "AGC").unwrap().len(), 0);
    }

    #[test]
    fn reports_query_longer_than_record() {
        assert_eq!(
            search_nucleotides(b"ACG", "ACGT"),
            Err(SearchError::QueryLongerThanSequence)
        );
        assert_eq!(
            search_amino_acids(b"ATG", "MM", code(11)),
            Err(SearchError::QueryLongerThanSequence)
        );
    }

    #[test]
    fn finds_peptides_in_all_six_frames_with_exact_spans() {
        for frame in [-3_i8, -2, -1, 1, 2, 3] {
            let mut oriented = b"CCCCCCCCCCCCCCC".to_vec();
            let offset = frame.unsigned_abs() as usize - 1;
            oriented[offset..offset + 6].copy_from_slice(b"ATGAAA");
            let sequence = if frame > 0 {
                oriented
            } else {
                reverse_complement(&oriented)
            };
            let found = search_amino_acids(&sequence, "MK", code(11)).unwrap();
            let hit = found.iter().find(|item| item.frame == Some(frame)).unwrap();
            assert_eq!(hit.end - hit.start, 6);
        }
    }

    #[test]
    fn handles_reverse_coordinates_stops_wildcards_and_ambiguity() {
        let reverse = search_amino_acids(b"GGGTTTCATCCC", "MK", code(11)).unwrap();
        assert!(reverse
            .iter()
            .any(|item| item.start == 3 && item.end == 9 && item.frame == Some(-1)));
        assert!(!search_amino_acids(b"ATGTAA", "M*", code(11))
            .unwrap()
            .is_empty());
        assert!(!search_amino_acids(b"ATGNNN", "MX", code(11))
            .unwrap()
            .is_empty());
        assert!(search_amino_acids(b"ATGTAA", "MX", code(11))
            .unwrap()
            .is_empty());
        assert!(!search_amino_acids(b"GATGAT", "BB", code(11))
            .unwrap()
            .is_empty());
    }

    #[test]
    fn selected_genetic_code_changes_peptide_results() {
        assert!(search_amino_acids(b"TGATGA", "WW", code(1))
            .unwrap()
            .is_empty());
        assert_eq!(
            search_amino_acids(b"TGATGA", "WW", code(4)).unwrap().len(),
            1
        );
    }
}
