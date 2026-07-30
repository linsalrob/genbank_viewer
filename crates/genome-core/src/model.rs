//! Parsed genome records and biological feature/location models.

use crate::coordinates::clamp_interval;
use crate::translation::reverse_complement;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
/// Direction relative to the forward reference sequence.
pub enum Strand {
    Forward,
    Reverse,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
/// Record topology declared by the GenBank `LOCUS` line.
pub enum Topology {
    Linear,
    Circular,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
/// A zero-based, half-open interval on the forward reference.
pub struct Interval {
    pub start: u64,
    pub end: u64,
}

impl Interval {
    pub fn len(&self) -> u64 {
        self.end.saturating_sub(self.start)
    }

    pub fn is_empty(&self) -> bool {
        self.start >= self.end
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
/// A supported location tree or preserved unsupported source expression.
///
/// Joined locations retain their constituent parts. Unsupported syntax retains
/// its original text and deliberately exposes no intervals, preventing coercion
/// into a biologically misleading bounding range.
pub enum Location {
    Interval {
        interval: Interval,
        strand: Strand,
        partial_start: bool,
        partial_end: bool,
    },
    Join {
        parts: Vec<Location>,
        strand: Strand,
    },
    Unsupported {
        original: String,
        strand: Strand,
    },
}

impl Location {
    pub fn intervals(&self) -> Vec<Interval> {
        match self {
            Location::Interval { interval, .. } => vec![interval.clone()],
            Location::Join { parts, .. } => parts.iter().flat_map(|p| p.intervals()).collect(),
            Location::Unsupported { .. } => Vec::new(),
        }
    }

    pub fn strand(&self) -> Strand {
        match self {
            Location::Interval { strand, .. }
            | Location::Join { strand, .. }
            | Location::Unsupported { strand, .. } => *strand,
        }
    }

    pub fn bounding_interval(&self) -> Option<Interval> {
        let intervals = self.intervals();
        if intervals.is_empty() {
            return None;
        }
        let start = intervals.iter().map(|i| i.start).min()?;
        let end = intervals.iter().map(|i| i.end).max()?;
        Some(Interval { start, end })
    }

    pub fn feature_len(&self) -> u64 {
        self.intervals().into_iter().map(|i| i.len()).sum()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
/// A GenBank qualifier, including valueless qualifiers.
pub struct Qualifier {
    pub key: String,
    pub value: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
/// A parsed feature with its original key, location, and ordered qualifiers.
pub struct Feature {
    pub feature_type: String,
    pub location: Location,
    pub qualifiers: Vec<Qualifier>,
}

impl Feature {
    pub fn bounding_interval(&self) -> Option<Interval> {
        self.location.bounding_interval()
    }

    pub fn intervals(&self) -> Vec<Interval> {
        self.location.intervals()
    }

    pub fn strand(&self) -> Strand {
        self.location.strand()
    }

    pub fn feature_len(&self) -> u64 {
        self.location.feature_len()
    }

    pub fn qualifier_values<'a>(&'a self, key: &str) -> Vec<&'a str> {
        self.qualifiers
            .iter()
            .filter(|q| q.key == key)
            .filter_map(|q| q.value.as_deref())
            .collect()
    }

    pub fn display_label(&self) -> String {
        for key in ["locus_tag", "gene", "protein_id", "product"] {
            if let Some(v) = self.qualifier_values(key).into_iter().next() {
                return v.to_string();
            }
        }
        self.feature_type.clone()
    }

    /// Extracts constituent parts in stored order without strand transformation.
    pub fn extract_sequence(&self, sequence: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        for interval in self.intervals() {
            if let Some(i) = clamp_interval(&interval, sequence.len() as u64) {
                out.extend_from_slice(&sequence[i.start as usize..i.end as usize]);
            }
        }
        out
    }

    /// Extracts a feature in biological 5′→3′ orientation.
    ///
    /// Reverse joins are assembled in forward-reference order and then reverse
    /// complemented, yielding reverse transcript order.
    pub fn extract_strand_aware_sequence(&self, sequence: &[u8]) -> Vec<u8> {
        let seq = self.extract_sequence(sequence);
        match self.strand() {
            Strand::Reverse => reverse_complement(&seq),
            _ => seq,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
/// One parsed GenBank record and its non-fatal diagnostics.
pub struct GenomeRecord {
    pub id: String,
    pub accession: Option<String>,
    pub description: Option<String>,
    pub sequence: Vec<u8>,
    pub topology: Topology,
    pub features: Vec<Feature>,
    pub reported_sequence_length: Option<u64>,
    pub warnings: Vec<ParseWarning>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
/// Stable categories for non-fatal parser diagnostics.
pub enum ParseWarningCode {
    SequenceLengthMismatch,
    UnterminatedQuotedQualifier,
    UnsupportedLocation,
    EmptyRecord,
    FeatureOutsideSequenceBounds,
    UnsupportedMetadata,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
/// A non-fatal parser diagnostic, optionally tied to a record and source line.
pub struct ParseWarning {
    pub record_id: Option<String>,
    pub line: Option<usize>,
    pub code: ParseWarningCode,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
/// CDS coverage and strand counts for one record.
pub struct CodingSummary {
    pub sequence_length: u64,
    pub cds_count: usize,
    pub forward_cds_count: usize,
    pub reverse_cds_count: usize,
    pub covered_bases: u64,
    pub coding_density: f64,
}

impl GenomeRecord {
    /// Calculates coding density from the union of in-bounds CDS parts.
    ///
    /// Overlapping CDS bases are counted once; joined parts contribute each
    /// covered interval, and the result is divided by observed sequence length.
    pub fn coding_summary(&self) -> CodingSummary {
        let cds = self
            .features
            .iter()
            .filter(|feature| feature.feature_type.eq_ignore_ascii_case("CDS"))
            .collect::<Vec<_>>();
        let mut intervals = cds
            .iter()
            .flat_map(|feature| feature.intervals())
            .filter_map(|interval| clamp_interval(&interval, self.sequence.len() as u64))
            .collect::<Vec<_>>();
        intervals.sort_by_key(|interval| (interval.start, interval.end));
        let mut covered_bases = 0;
        let mut current: Option<Interval> = None;
        for interval in intervals {
            match &mut current {
                Some(active) if interval.start <= active.end => {
                    active.end = active.end.max(interval.end)
                }
                Some(active) => {
                    covered_bases += active.len();
                    *active = interval;
                }
                None => current = Some(interval),
            }
        }
        covered_bases += current.map_or(0, |interval| interval.len());
        let sequence_length = self.sequence.len() as u64;
        CodingSummary {
            sequence_length,
            cds_count: cds.len(),
            forward_cds_count: cds
                .iter()
                .filter(|feature| feature.strand() == Strand::Forward)
                .count(),
            reverse_cds_count: cds
                .iter()
                .filter(|feature| feature.strand() == Strand::Reverse)
                .count(),
            covered_bases,
            coding_density: if sequence_length == 0 {
                0.0
            } else {
                covered_bases as f64 / sequence_length as f64
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_display_label_priority() {
        let feature = Feature {
            feature_type: "CDS".to_string(),
            location: Location::Interval {
                interval: Interval { start: 0, end: 3 },
                strand: Strand::Forward,
                partial_start: false,
                partial_end: false,
            },
            qualifiers: vec![
                Qualifier {
                    key: "product".to_string(),
                    value: Some("protein".to_string()),
                },
                Qualifier {
                    key: "gene".to_string(),
                    value: Some("abc".to_string()),
                },
            ],
        };
        assert_eq!(feature.display_label(), "abc");
    }

    #[test]
    fn coding_summary_uses_interval_union() {
        let feature = |start, end| Feature {
            feature_type: "CDS".into(),
            location: Location::Interval {
                interval: Interval { start, end },
                strand: Strand::Forward,
                partial_start: false,
                partial_end: false,
            },
            qualifiers: vec![],
        };
        let record = GenomeRecord {
            id: "test".into(),
            accession: None,
            description: None,
            sequence: vec![b'A'; 10],
            topology: Topology::Linear,
            features: vec![feature(0, 6), feature(4, 8), feature(5, 7)],
            reported_sequence_length: Some(10),
            warnings: vec![],
        };
        let summary = record.coding_summary();
        assert_eq!(summary.cds_count, 3);
        assert_eq!(summary.covered_bases, 8);
        assert_eq!(summary.coding_density, 0.8);
    }

    #[test]
    fn coding_summary_counts_joined_parts_and_handles_empty_records() {
        let record = GenomeRecord {
            id: "joined".into(),
            accession: None,
            description: None,
            sequence: vec![b'A'; 20],
            topology: Topology::Linear,
            features: vec![Feature {
                feature_type: "CDS".into(),
                location: Location::Join {
                    parts: vec![
                        Location::Interval {
                            interval: Interval { start: 0, end: 5 },
                            strand: Strand::Reverse,
                            partial_start: false,
                            partial_end: false,
                        },
                        Location::Interval {
                            interval: Interval { start: 10, end: 15 },
                            strand: Strand::Reverse,
                            partial_start: false,
                            partial_end: false,
                        },
                    ],
                    strand: Strand::Reverse,
                },
                qualifiers: vec![],
            }],
            reported_sequence_length: Some(20),
            warnings: vec![],
        };
        let summary = record.coding_summary();
        assert_eq!(summary.covered_bases, 10);
        assert_eq!(summary.reverse_cds_count, 1);

        let empty = GenomeRecord {
            sequence: vec![],
            features: vec![],
            reported_sequence_length: Some(0),
            ..record
        }
        .coding_summary();
        assert_eq!(empty.covered_bases, 0);
        assert_eq!(empty.coding_density, 0.0);
    }
}
