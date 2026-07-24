use genome_core::coordinates::{
    one_based_inclusive_to_zero_based_half_open, one_based_single_to_zero_based_half_open,
};
use genome_core::{
    Feature, GenomeRecord, Location, ParseWarning, ParseWarningCode, Qualifier, Strand, Topology,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParseError {
    pub record_id: Option<String>,
    pub line: usize,
    pub offending_text: String,
    pub message: String,
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "GenBank parse error at line {}: {}",
            self.line, self.message
        )
    }
}

impl std::error::Error for ParseError {}

pub fn parse_genbank(input: &str) -> Result<Vec<GenomeRecord>, ParseError> {
    let normalized = input.replace("\r\n", "\n").replace('\r', "\n");
    let lines: Vec<&str> = normalized.lines().collect();
    let mut records = Vec::new();
    let mut start = 0;
    for end in 0..lines.len() {
        if lines[end].trim() == "//" {
            if lines[start..end].iter().any(|line| !line.trim().is_empty()) {
                records.push(parse_record(&lines[start..=end], start)?);
            }
            start = end + 1;
        }
    }
    if lines[start..].iter().any(|line| !line.trim().is_empty()) {
        records.push(parse_record(&lines[start..], start)?);
    }
    if records.is_empty() {
        return Err(ParseError {
            record_id: None,
            line: 1,
            offending_text: lines.first().copied().unwrap_or_default().into(),
            message: "file contains no GenBank records".into(),
        });
    }
    Ok(records)
}

pub fn parse_first_genbank_record(input: &str) -> Result<GenomeRecord, ParseError> {
    parse_genbank(input)?
        .into_iter()
        .next()
        .ok_or_else(|| ParseError {
            record_id: None,
            line: 1,
            offending_text: String::new(),
            message: "file contains no GenBank records".into(),
        })
}

fn parse_record(lines: &[&str], base_line: usize) -> Result<GenomeRecord, ParseError> {
    let locus_index = lines
        .iter()
        .position(|line| line.starts_with("LOCUS"))
        .ok_or_else(|| ParseError {
            record_id: None,
            line: base_line + 1,
            offending_text: lines.first().copied().unwrap_or_default().into(),
            message: "missing LOCUS identifier".into(),
        })?;
    let locus = lines[locus_index];
    let fields = locus.split_whitespace().collect::<Vec<_>>();
    let id = fields.get(1).copied().unwrap_or_default().to_string();
    if id.is_empty() {
        return Err(ParseError {
            record_id: None,
            line: base_line + locus_index + 1,
            offending_text: locus.into(),
            message: "missing LOCUS identifier".into(),
        });
    }
    let reported_sequence_length = fields.iter().find_map(|field| field.parse::<u64>().ok());
    let lower = locus.to_ascii_lowercase();
    let topology = if lower.contains("circular") {
        Topology::Circular
    } else if lower.contains("linear") {
        Topology::Linear
    } else {
        Topology::Unknown
    };

    let mut record = GenomeRecord {
        id: id.clone(),
        accession: None,
        description: None,
        sequence: Vec::new(),
        topology,
        features: Vec::new(),
        reported_sequence_length,
        warnings: Vec::new(),
    };
    let mut i = locus_index + 1;
    while i < lines.len() {
        let line = lines[i];
        if line.starts_with("DEFINITION") {
            let mut value = line.get(12..).unwrap_or_default().trim().to_string();
            i += 1;
            while i < lines.len() && lines[i].starts_with("            ") {
                value.push(' ');
                value.push_str(lines[i].trim());
                i += 1;
            }
            record.description = (!value.is_empty()).then_some(value);
            continue;
        }
        if line.starts_with("ACCESSION") {
            record.accession = line
                .get(12..)
                .unwrap_or_default()
                .split_whitespace()
                .next()
                .map(str::to_string);
        } else if line.starts_with("FEATURES") {
            let (features, consumed, mut warnings) =
                parse_features(&lines[i + 1..], &id, base_line + i + 1)?;
            record.features = features;
            record.warnings.append(&mut warnings);
            i += consumed + 1;
            continue;
        } else if line.starts_with("ORIGIN") {
            i += 1;
            while i < lines.len() && lines[i].trim() != "//" {
                record.sequence.extend(
                    lines[i]
                        .bytes()
                        .filter(|byte| byte.is_ascii_alphabetic())
                        .map(|byte| byte.to_ascii_uppercase()),
                );
                i += 1;
            }
            continue;
        }
        i += 1;
    }

    if let Some(reported) = record.reported_sequence_length {
        let observed = record.sequence.len() as u64;
        if reported != observed {
            record.warnings.push(warning(
                &id,
                Some(base_line + locus_index + 1),
                ParseWarningCode::SequenceLengthMismatch,
                format!("LOCUS reports {reported} bp but ORIGIN contains {observed} bp"),
            ));
        }
    }
    if record.sequence.is_empty() {
        record.warnings.push(warning(
            &id,
            None,
            ParseWarningCode::EmptyRecord,
            "record has no sequence".into(),
        ));
    }
    for feature in &record.features {
        if feature
            .intervals()
            .iter()
            .any(|interval| interval.end > record.sequence.len() as u64)
        {
            record.warnings.push(warning(
                &id,
                None,
                ParseWarningCode::FeatureOutsideSequenceBounds,
                format!(
                    "feature '{}' extends outside the sequence",
                    feature.display_label()
                ),
            ));
        }
    }
    Ok(record)
}

fn parse_features(
    lines: &[&str],
    record_id: &str,
    base_line: usize,
) -> Result<(Vec<Feature>, usize, Vec<ParseWarning>), ParseError> {
    let mut features = Vec::new();
    let mut warnings = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        if is_section(line) {
            break;
        }
        let Some(payload) = line.strip_prefix("     ") else {
            i += 1;
            continue;
        };
        let key = payload.get(..16).unwrap_or(payload).trim();
        if key.is_empty() || !key.starts_with(|c: char| c.is_ascii_alphabetic()) {
            i += 1;
            continue;
        }
        let location_line = base_line + i + 1;
        let mut location_text = payload.get(16..).unwrap_or_default().trim().to_string();
        i += 1;
        while i < lines.len() {
            let continuation = lines[i];
            let Some(content) = continuation.strip_prefix("     ") else {
                break;
            };
            if content.get(..16).unwrap_or(content).trim().is_empty()
                && !continuation.trim_start().starts_with('/')
            {
                location_text.push_str(continuation.trim());
                i += 1;
            } else {
                break;
            }
        }
        let (location, location_warning) = parse_location(&location_text);
        if let Some(message) = location_warning {
            warnings.push(warning(
                record_id,
                Some(location_line),
                ParseWarningCode::UnsupportedLocation,
                message,
            ));
        }
        let mut qualifiers = Vec::new();
        while i < lines.len() && !is_section(lines[i]) {
            let trimmed = lines[i].trim_start();
            if trimmed.starts_with('/') {
                let (qualifier, consumed, unterminated) = parse_qualifier(&lines[i..]);
                if unterminated {
                    warnings.push(warning(
                        record_id,
                        Some(base_line + i + 1),
                        ParseWarningCode::UnterminatedQuotedQualifier,
                        format!("unterminated quoted qualifier '/{}'", qualifier.key),
                    ));
                }
                qualifiers.push(qualifier);
                i += consumed;
            } else if lines[i]
                .strip_prefix("     ")
                .is_some_and(|content| !content.get(..16).unwrap_or(content).trim().is_empty())
            {
                break;
            } else {
                i += 1;
            }
        }
        features.push(Feature {
            feature_type: key.into(),
            location,
            qualifiers,
        });
    }
    Ok((features, i, warnings))
}

fn parse_qualifier(lines: &[&str]) -> (Qualifier, usize, bool) {
    let body = lines[0].trim().trim_start_matches('/');
    let Some((key, raw)) = body.split_once('=') else {
        return (
            Qualifier {
                key: body.into(),
                value: None,
            },
            1,
            false,
        );
    };
    if !raw.starts_with('"') {
        return (
            Qualifier {
                key: key.into(),
                value: Some(raw.into()),
            },
            1,
            false,
        );
    }
    let mut value = String::new();
    let mut consumed = 0;
    let mut closed = false;
    for line in lines {
        if consumed > 0 && (is_section(line) || line.trim_start().starts_with('/')) {
            break;
        }
        let text = if consumed == 0 {
            raw.trim_start_matches('"')
        } else {
            line.trim()
        };
        if !value.is_empty() {
            value.push(' ');
        }
        let mut chars = text.chars().peekable();
        while let Some(ch) = chars.next() {
            if ch == '"' {
                if chars.peek() == Some(&'"') {
                    value.push('"');
                    chars.next();
                } else {
                    closed = true;
                    break;
                }
            } else {
                value.push(ch);
            }
        }
        consumed += 1;
        if closed {
            break;
        }
    }
    (
        Qualifier {
            key: key.into(),
            value: Some(value),
        },
        consumed.max(1),
        !closed,
    )
}

fn parse_location(text: &str) -> (Location, Option<String>) {
    let compact = text
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect::<String>();
    if compact.starts_with("complement(") && compact.ends_with(')') {
        let (inner, warning) = parse_location(&compact[11..compact.len() - 1]);
        return (apply_strand(inner, Strand::Reverse), warning);
    }
    if compact.starts_with("join(") && compact.ends_with(')') {
        let mut parts = Vec::new();
        for part in split_top_level(&compact[5..compact.len() - 1], ',') {
            let (location, warning) = parse_location(part);
            if warning.is_some() {
                return unsupported(text);
            }
            parts.push(location);
        }
        let strand = parts
            .first()
            .map(Location::strand)
            .unwrap_or(Strand::Unknown);
        return (Location::Join { parts, strand }, None);
    }
    if let Some(location) = parse_simple_interval(&compact) {
        return (location, None);
    }
    unsupported(text)
}

fn unsupported(text: &str) -> (Location, Option<String>) {
    (
        Location::Unsupported {
            original: text.trim().into(),
            strand: Strand::Unknown,
        },
        Some(format!(
            "unsupported location '{}' was preserved without a bounding interval",
            text.trim()
        )),
    )
}

fn parse_simple_interval(text: &str) -> Option<Location> {
    if let Some((start, end)) = text.split_once("..") {
        let (partial_start, start) = parse_position(start)?;
        let (partial_end, end) = parse_position(end)?;
        return Some(Location::Interval {
            interval: one_based_inclusive_to_zero_based_half_open(start, end),
            strand: Strand::Forward,
            partial_start,
            partial_end,
        });
    }
    let (partial, position) = parse_position(text)?;
    Some(Location::Interval {
        interval: one_based_single_to_zero_based_half_open(position),
        strand: Strand::Forward,
        partial_start: partial,
        partial_end: partial,
    })
}

fn parse_position(text: &str) -> Option<(bool, u64)> {
    let partial = text.starts_with(['<', '>']);
    text.trim_start_matches(['<', '>'])
        .parse()
        .ok()
        .map(|position| (partial, position))
}

fn apply_strand(location: Location, strand: Strand) -> Location {
    match location {
        Location::Interval {
            interval,
            partial_start,
            partial_end,
            ..
        } => Location::Interval {
            interval,
            strand,
            partial_start,
            partial_end,
        },
        Location::Join { parts, .. } => Location::Join { parts, strand },
        Location::Unsupported { original, .. } => Location::Unsupported { original, strand },
    }
}

fn split_top_level(input: &str, separator: char) -> Vec<&str> {
    let (mut depth, mut start, mut parts) = (0_i32, 0, Vec::new());
    for (index, ch) in input.char_indices() {
        match ch {
            '(' => depth += 1,
            ')' => depth -= 1,
            _ if ch == separator && depth == 0 => {
                parts.push(input[start..index].trim());
                start = index + 1;
            }
            _ => {}
        }
    }
    parts.push(input[start..].trim());
    parts
}

fn is_section(line: &str) -> bool {
    [
        "LOCUS",
        "DEFINITION",
        "ACCESSION",
        "VERSION",
        "FEATURES",
        "ORIGIN",
        "//",
    ]
    .iter()
    .any(|header| line.starts_with(header))
}

fn warning(
    record_id: &str,
    line: Option<usize>,
    code: ParseWarningCode,
    message: String,
) -> ParseWarning {
    ParseWarning {
        record_id: Some(record_id.into()),
        line,
        code,
        message,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(body: &str) -> String {
        format!("LOCUS       TEST       12 bp    DNA     linear\n{body}//\n")
    }

    #[test]
    fn parses_multiple_records_crlf_and_no_features() {
        let input = format!(
            "{}{}",
            record("ORIGIN\n  1 atgc\n"),
            record("ORIGIN\n  1 aaaa\n")
        )
        .replace('\n', "\r\n");
        let records = parse_genbank(&input).unwrap();
        assert_eq!(records.len(), 2);
        assert_eq!(records[0].sequence, b"ATGC");
    }

    #[test]
    fn warns_for_length_and_preserves_unsupported_location() {
        let input = record("FEATURES             Location/Qualifiers\n     misc_feature    order(1..2,4..5)\nORIGIN\n  1 atgc\n");
        let parsed = parse_first_genbank_record(&input).unwrap();
        assert!(matches!(
            parsed.features[0].location,
            Location::Unsupported { .. }
        ));
        assert!(parsed
            .warnings
            .iter()
            .any(|warning| warning.code == ParseWarningCode::SequenceLengthMismatch));
        assert!(parsed
            .warnings
            .iter()
            .any(|warning| warning.code == ParseWarningCode::UnsupportedLocation));
    }

    #[test]
    fn handles_multiline_qualifier_doubled_quotes_and_valueless() {
        let input = record("FEATURES             Location/Qualifiers\n     CDS             <1..>6\n                     /product=\"alpha \"\"quoted\"\"\n                     protein\"\n                     /pseudo\nORIGIN\n  1 atgaaaatgaaa\n");
        let parsed = parse_first_genbank_record(&input).unwrap();
        assert_eq!(
            parsed.features[0].qualifiers[0].value.as_deref(),
            Some("alpha \"quoted\" protein")
        );
        assert_eq!(parsed.features[0].qualifiers[1].value, None);
    }

    #[test]
    fn reverse_join_extraction_has_transcript_order() {
        let input = record("FEATURES             Location/Qualifiers\n     CDS             complement(join(1..3,10..12))\nORIGIN\n  1 aaaccccccatg\n");
        let parsed = parse_first_genbank_record(&input).unwrap();
        assert_eq!(
            parsed.features[0].extract_strand_aware_sequence(&parsed.sequence),
            b"CATTTT"
        );
    }

    #[test]
    fn error_line_is_global_and_accurate() {
        let input = "LOCUS       ONE 1 bp DNA\nORIGIN\n1 a\n//\nnot a record\n";
        let error = parse_genbank(input).unwrap_err();
        assert_eq!(error.line, 5);
        assert!(error.message.contains("LOCUS"));
    }
}
