use genome_core::coordinates::{
    one_based_inclusive_to_zero_based_half_open, one_based_single_to_zero_based_half_open,
};
use genome_core::{Feature, GenomeRecord, Interval, Location, Qualifier, Strand, Topology};
use thiserror::Error;

#[derive(Debug, Error, Clone, PartialEq, Eq)]
#[error("GenBank parse error at line {line}: {message}")]
pub struct ParseError {
    pub record_id: Option<String>,
    pub line: usize,
    pub offending_text: String,
    pub message: String,
}

pub fn parse_genbank(input: &str) -> Result<GenomeRecord, ParseError> {
    let lines: Vec<&str> = input.lines().collect();
    let mut id = String::new();
    let mut accession = None;
    let mut definition = None;
    let mut topology = Topology::Unknown;
    let mut features: Vec<Feature> = Vec::new();
    let mut warnings = Vec::new();
    let mut sequence = Vec::new();

    let mut i = 0usize;
    while i < lines.len() {
        let line = lines[i];
        if line.starts_with("LOCUS") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                id = parts[1].to_string();
            }
            let lower = line.to_ascii_lowercase();
            topology = if lower.contains("linear") {
                Topology::Linear
            } else if lower.contains("circular") {
                Topology::Circular
            } else {
                Topology::Unknown
            };
            i += 1;
            continue;
        }

        if line.starts_with("DEFINITION") {
            let mut def = line.trim_start_matches("DEFINITION").trim().to_string();
            i += 1;
            while i < lines.len() {
                let next = lines[i];
                if next.starts_with(' ') && !is_header_line(next) {
                    if !def.is_empty() {
                        def.push(' ');
                    }
                    def.push_str(next.trim());
                    i += 1;
                } else {
                    break;
                }
            }
            definition = (!def.is_empty()).then_some(def);
            continue;
        }

        if line.starts_with("ACCESSION") {
            accession = line
                .trim_start_matches("ACCESSION")
                .split_whitespace()
                .next()
                .map(str::to_string);
            i += 1;
            continue;
        }

        if line.starts_with("FEATURES") {
            i += 1;
            let (parsed_features, consumed, mut section_warnings) = parse_features(&lines[i..], &id)?;
            features = parsed_features;
            warnings.append(&mut section_warnings);
            i += consumed;
            continue;
        }

        if line.starts_with("ORIGIN") {
            i += 1;
            while i < lines.len() {
                let seq_line = lines[i];
                if seq_line.starts_with("//") {
                    break;
                }
                sequence.extend(
                    seq_line
                        .chars()
                        .filter(|c| c.is_ascii_alphabetic())
                        .map(|c| c.to_ascii_uppercase() as u8),
                );
                i += 1;
            }
            continue;
        }

        i += 1;
    }

    if id.is_empty() {
        return Err(ParseError {
            record_id: None,
            line: 1,
            offending_text: lines.first().copied().unwrap_or_default().to_string(),
            message: "missing LOCUS identifier".to_string(),
        });
    }

    Ok(GenomeRecord {
        id,
        accession,
        description: definition,
        sequence,
        topology,
        features,
        warnings,
    })
}

fn parse_features(lines: &[&str], record_id: &str) -> Result<(Vec<Feature>, usize, Vec<String>), ParseError> {
    let mut features = Vec::new();
    let mut warnings = Vec::new();
    let mut i = 0usize;

    while i < lines.len() {
        let line = lines[i];
        if is_header_line(line) || line.starts_with("ORIGIN") || line.starts_with("//") {
            break;
        }
        if line.trim().is_empty() {
            i += 1;
            continue;
        }

        if line.starts_with("     ") {
            let payload = line.get(5..).unwrap_or("");
            let key = payload.get(..16).unwrap_or(payload).trim();
            let loc_text = payload.get(16..).unwrap_or("").trim();
            if key.is_empty() {
                i += 1;
                continue;
            }

            let location = parse_location(loc_text, i + 1, line, Some(record_id.to_string()))?;
            let mut qualifiers = Vec::new();
            i += 1;

            while i < lines.len() {
                let qline = lines[i];
                if qline.starts_with("     ") {
                    let payload = qline.get(5..).unwrap_or("");
                    let k = payload.get(..16).unwrap_or(payload).trim();
                    if !k.is_empty() {
                        break;
                    }
                }

                let trimmed = qline.trim_start();
                if !trimmed.starts_with('/') {
                    i += 1;
                    continue;
                }

                let (qual, consumed, maybe_warning) = parse_qualifier(&lines[i..], i + 1)?;
                qualifiers.push(qual);
                if let Some(w) = maybe_warning {
                    warnings.push(w);
                }
                i += consumed;
            }

            features.push(Feature {
                feature_type: key.to_string(),
                location,
                qualifiers,
            });
            continue;
        }

        i += 1;
    }

    Ok((features, i, warnings))
}

fn parse_qualifier(lines: &[&str], line_number: usize) -> Result<(Qualifier, usize, Option<String>), ParseError> {
    let first = lines[0].trim_start();
    let body = first.strip_prefix('/').unwrap_or(first);
    let mut parts = body.splitn(2, '=');
    let key = parts.next().unwrap_or("").trim().to_string();
    let value_part = parts.next().map(str::trim);

    if value_part.is_none() {
        return Ok((
            Qualifier { key, value: None },
            1,
            None,
        ));
    }

    let value_part = value_part.unwrap_or_default();
    if !value_part.starts_with('"') {
        return Ok((
            Qualifier {
                key,
                value: Some(value_part.to_string()),
            },
            1,
            None,
        ));
    }

    let mut consumed = 1usize;
    let mut value = String::new();
    let mut in_quote = true;
    let mut chars = value_part.chars();
    chars.next();
    for ch in chars {
        if ch == '"' {
            in_quote = false;
            break;
        }
        value.push(ch);
    }

    while in_quote && consumed < lines.len() {
        let next = lines[consumed].trim();
        if !value.is_empty() {
            value.push(' ');
        }
        if let Some(idx) = next.find('"') {
            value.push_str(next[..idx].trim());
            in_quote = false;
        } else {
            value.push_str(next);
        }
        consumed += 1;
    }

    let warning = in_quote.then_some(format!(
        "Unterminated quoted qualifier '{}' beginning near line {}",
        key, line_number
    ));

    Ok((
        Qualifier {
            key,
            value: Some(value),
        },
        consumed,
        warning,
    ))
}

fn parse_location(
    text: &str,
    line: usize,
    offending_line: &str,
    record_id: Option<String>,
) -> Result<Location, ParseError> {
    let t = text.trim();
    if t.starts_with("complement(") && t.ends_with(')') {
        let inner = &t[11..t.len() - 1];
        let inner_loc = parse_location(inner, line, offending_line, record_id.clone())?;
        return Ok(apply_strand(inner_loc, Strand::Reverse));
    }
    if t.starts_with("join(") && t.ends_with(')') {
        let inner = &t[5..t.len() - 1];
        let mut parts = Vec::new();
        for part in split_top_level(inner, ',') {
            let loc = parse_location(part, line, offending_line, record_id.clone())?;
            parts.push(loc);
        }
        let strand = infer_join_strand(&parts);
        return Ok(Location::Join { parts, strand });
    }

    parse_simple_interval(t).ok_or_else(|| ParseError {
        record_id,
        line,
        offending_text: offending_line.to_string(),
        message: format!("unsupported location syntax: '{t}'"),
    })
}

fn parse_simple_interval(text: &str) -> Option<Location> {
    let t = text.trim();

    if let Some((lhs, rhs)) = t.split_once("..") {
        let (partial_start, s) = parse_partial(lhs)?;
        let (partial_end, e) = parse_partial(rhs)?;
        let interval = one_based_inclusive_to_zero_based_half_open(s, e);
        return Some(Location::Interval {
            interval,
            strand: Strand::Forward,
            partial_start,
            partial_end,
        });
    }

    let (partial_start, pos) = parse_partial(t)?;
    let interval = one_based_single_to_zero_based_half_open(pos);
    Some(Location::Interval {
        interval,
        strand: Strand::Forward,
        partial_start,
        partial_end: partial_start,
    })
}

fn parse_partial(token: &str) -> Option<(bool, u64)> {
    let trimmed = token.trim();
    let partial = trimmed.starts_with('<') || trimmed.starts_with('>');
    let num = if partial { &trimmed[1..] } else { trimmed };
    num.parse::<u64>().ok().map(|v| (partial, v))
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
    }
}

fn infer_join_strand(parts: &[Location]) -> Strand {
    parts
        .iter()
        .map(Location::strand)
        .find(|s| *s != Strand::Unknown)
        .unwrap_or(Strand::Forward)
}

fn split_top_level(input: &str, sep: char) -> Vec<&str> {
    let mut out = Vec::new();
    let mut depth = 0isize;
    let mut start = 0usize;
    for (idx, ch) in input.char_indices() {
        match ch {
            '(' => depth += 1,
            ')' => depth -= 1,
            _ if ch == sep && depth == 0 => {
                out.push(input[start..idx].trim());
                start = idx + ch.len_utf8();
            }
            _ => {}
        }
    }
    out.push(input[start..].trim());
    out
}

fn is_header_line(line: &str) -> bool {
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
    .any(|h| line.starts_with(h))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_join_complement_and_qualifier() {
        let data = "LOCUS       TEST 100 bp DNA linear\nFEATURES             Location/Qualifiers\n     CDS             complement(join(10..12,20..22))\n                     /gene=\"abc\"\nORIGIN\n        1 atgcatgcatgcatgcatgcat\n//\n";
        let rec = parse_genbank(data).expect("should parse");
        assert_eq!(rec.id, "TEST");
        assert_eq!(rec.features.len(), 1);
        assert_eq!(rec.features[0].display_label(), "abc");
    }

    #[test]
    fn parses_partial_interval() {
        let loc = parse_location("<100..>300", 1, "x", None).expect("location parse");
        match loc {
            Location::Interval {
                interval,
                partial_start,
                partial_end,
                ..
            } => {
                assert_eq!(interval, Interval { start: 99, end: 300 });
                assert!(partial_start);
                assert!(partial_end);
            }
            _ => panic!("expected interval"),
        }
    }
}
