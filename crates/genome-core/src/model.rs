use crate::coordinates::clamp_interval;
use crate::translation::reverse_complement;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Strand {
    Forward,
    Reverse,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Topology {
    Linear,
    Circular,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct Interval {
    pub start: u64,
    pub end: u64,
}

impl Interval {
    pub fn len(&self) -> u64 {
        self.end.saturating_sub(self.start)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
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
}

impl Location {
    pub fn intervals(&self) -> Vec<Interval> {
        match self {
            Location::Interval { interval, .. } => vec![interval.clone()],
            Location::Join { parts, .. } => parts.iter().flat_map(|p| p.intervals()).collect(),
        }
    }

    pub fn strand(&self) -> Strand {
        match self {
            Location::Interval { strand, .. } | Location::Join { strand, .. } => *strand,
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
pub struct Qualifier {
    pub key: String,
    pub value: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
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

    pub fn extract_sequence(&self, sequence: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        for interval in self.intervals() {
            if let Some(i) = clamp_interval(&interval, sequence.len() as u64) {
                out.extend_from_slice(&sequence[i.start as usize..i.end as usize]);
            }
        }
        out
    }

    pub fn extract_strand_aware_sequence(&self, sequence: &[u8]) -> Vec<u8> {
        let seq = self.extract_sequence(sequence);
        match self.strand() {
            Strand::Reverse => reverse_complement(&seq),
            _ => seq,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct GenomeRecord {
    pub id: String,
    pub accession: Option<String>,
    pub description: Option<String>,
    pub sequence: Vec<u8>,
    pub topology: Topology,
    pub features: Vec<Feature>,
    pub warnings: Vec<String>,
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
}
