//! Thin wasm-bindgen exports and camel-case browser DTO conversion.

use genome_core::search::{search_amino_acids, search_nucleotides, SearchError};
use genome_core::translation::{
    stop_codons_in_region, supported_genetic_codes, translate_region_six_frames, GeneticCode,
};
use genome_core::{Feature, GenomeRecord, Location, Qualifier, Strand, Topology};
use genome_formats::parse_genbank;
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GenomeRecordDto {
    id: String,
    accession: Option<String>,
    description: Option<String>,
    sequence_length: usize,
    sequence: String,
    reverse_complement: String,
    topology: &'static str,
    features: Vec<FeatureDto>,
    warnings: Vec<genome_core::ParseWarning>,
    coding_summary: genome_core::CodingSummary,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FeatureDto {
    id: usize,
    #[serde(rename = "type")]
    feature_type: String,
    strand: i8,
    start: u64,
    end: u64,
    parts: Vec<PartDto>,
    label: String,
    locus_tag: Option<String>,
    gene: Option<String>,
    product: Option<String>,
    protein_id: Option<String>,
    translation: Option<String>,
    qualifiers: Vec<Qualifier>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PartDto {
    start: u64,
    end: u64,
    partial_start: bool,
    partial_end: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BrowserError {
    code: &'static str,
    message: String,
    record_id: Option<String>,
    line: Option<usize>,
    offending_text: Option<String>,
}

#[wasm_bindgen]
/// Parses all records and serializes browser DTOs or a structured browser error.
pub fn parse_genbank_json(input: &str) -> Result<JsValue, JsValue> {
    let records = parse_genbank(input).map_err(|error| {
        error_value(BrowserError {
            code: "genbank_parse_error",
            message: error.message,
            record_id: error.record_id,
            line: Some(error.line),
            offending_text: Some(error.offending_text),
        })
    })?;
    serialize(&records.into_iter().map(to_dto).collect::<Vec<_>>())
}

/// Backward-compatible alias retained for early integrations.
#[wasm_bindgen]
pub fn parse_genbank_record(input: &str) -> Result<JsValue, JsValue> {
    parse_genbank_json(input)
}

#[wasm_bindgen]
/// Returns a six-frame translation DTO for a zero-based half-open region.
pub fn translate_region_json(
    sequence: &[u8],
    start: u32,
    end: u32,
    genetic_code: u8,
) -> Result<JsValue, JsValue> {
    let code = GeneticCode::try_from(genetic_code).map_err(translation_error)?;
    let result = translate_region_six_frames(sequence, start.into(), end.into(), code)
        .map_err(translation_error)?;
    serialize(&result)
}

#[wasm_bindgen]
/// Returns selector metadata from the Rust genetic-code registry.
pub fn supported_genetic_codes_json() -> Result<JsValue, JsValue> {
    serialize(&supported_genetic_codes())
}

#[wasm_bindgen]
/// Returns only table-specific stops for the six global frames in a region.
pub fn stop_codons_in_region_json(
    sequence: &[u8],
    start: u32,
    end: u32,
    genetic_code: u8,
) -> Result<JsValue, JsValue> {
    let code = GeneticCode::try_from(genetic_code).map_err(translation_error)?;
    let result = stop_codons_in_region(sequence, start.into(), end.into(), code)
        .map_err(translation_error)?;
    serialize(&result)
}

#[wasm_bindgen]
/// Runs exact nucleotide or six-frame peptide search and returns match DTOs.
pub fn search_sequence_json(
    sequence: &[u8],
    query: &str,
    search_type: &str,
    genetic_code: u8,
) -> Result<JsValue, JsValue> {
    let matches = match search_type {
        "nucleotide" => search_nucleotides(sequence, query).map_err(search_error)?,
        "amino_acid" => {
            let code = GeneticCode::try_from(genetic_code).map_err(translation_error)?;
            search_amino_acids(sequence, query, code).map_err(search_error)?
        }
        _ => {
            return Err(error_value(BrowserError {
                code: "invalid_search_type",
                message: "search type must be nucleotide or amino_acid".to_string(),
                record_id: None,
                line: None,
                offending_text: None,
            }))
        }
    };
    serialize(&matches)
}

#[wasm_bindgen]
/// Deserializes a core record and returns union-based CDS coding statistics.
pub fn coding_summary_json(record_json: JsValue) -> Result<JsValue, JsValue> {
    let record: GenomeRecord = serde_wasm_bindgen::from_value(record_json).map_err(|error| {
        error_value(BrowserError {
            code: "invalid_record",
            message: error.to_string(),
            record_id: None,
            line: None,
            offending_text: None,
        })
    })?;
    serialize(&record.coding_summary())
}

fn translation_error(error: impl std::fmt::Display) -> JsValue {
    error_value(BrowserError {
        code: "translation_error",
        message: error.to_string(),
        record_id: None,
        line: None,
        offending_text: None,
    })
}

fn search_error(error: SearchError) -> JsValue {
    let code = match error {
        SearchError::EmptyQuery => "empty_query",
        SearchError::QueryTooShort { .. } => "query_too_short",
        SearchError::QueryLongerThanSequence => "query_longer_than_sequence",
        SearchError::InvalidNucleotideCharacter { .. } => "invalid_nucleotide_character",
        SearchError::InvalidAminoAcidCharacter { .. } => "invalid_amino_acid_character",
    };
    error_value(BrowserError {
        code,
        message: error.to_string(),
        record_id: None,
        line: None,
        offending_text: None,
    })
}

fn serialize(value: &impl Serialize) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(value).map_err(|error| {
        error_value(BrowserError {
            code: "serialization_error",
            message: error.to_string(),
            record_id: None,
            line: None,
            offending_text: None,
        })
    })
}

fn error_value(error: BrowserError) -> JsValue {
    serde_wasm_bindgen::to_value(&error)
        .unwrap_or_else(|_| JsValue::from_str("genbank_viewer error"))
}

fn to_dto(record: GenomeRecord) -> GenomeRecordDto {
    GenomeRecordDto {
        id: record.id.clone(),
        accession: record.accession.clone(),
        description: record.description.clone(),
        sequence_length: record.sequence.len(),
        sequence: String::from_utf8_lossy(&record.sequence).into_owned(),
        reverse_complement: String::from_utf8_lossy(&genome_core::translation::reverse_complement(
            &record.sequence,
        ))
        .into_owned(),
        topology: match record.topology {
            Topology::Linear => "linear",
            Topology::Circular => "circular",
            Topology::Unknown => "unknown",
        },
        features: record
            .features
            .iter()
            .enumerate()
            .map(|(id, feature)| feature_dto(id, feature))
            .collect(),
        warnings: record.warnings.clone(),
        coding_summary: record.coding_summary(),
    }
}

fn feature_dto(id: usize, feature: &Feature) -> FeatureDto {
    let bounds = feature
        .bounding_interval()
        .unwrap_or(genome_core::Interval { start: 0, end: 0 });
    let qualifier = |key: &str| {
        feature
            .qualifier_values(key)
            .first()
            .map(|value| (*value).to_string())
    };
    FeatureDto {
        id,
        feature_type: feature.feature_type.clone(),
        strand: match feature.strand() {
            Strand::Forward => 1,
            Strand::Reverse => -1,
            Strand::Unknown => 0,
        },
        start: bounds.start,
        end: bounds.end,
        parts: location_parts(&feature.location),
        label: feature.display_label(),
        locus_tag: qualifier("locus_tag"),
        gene: qualifier("gene"),
        product: qualifier("product"),
        protein_id: qualifier("protein_id"),
        translation: qualifier("translation"),
        qualifiers: feature.qualifiers.clone(),
    }
}

fn location_parts(location: &Location) -> Vec<PartDto> {
    match location {
        Location::Interval {
            interval,
            partial_start,
            partial_end,
            ..
        } => vec![PartDto {
            start: interval.start,
            end: interval.end,
            partial_start: *partial_start,
            partial_end: *partial_end,
        }],
        Location::Join { parts, .. } => parts.iter().flat_map(location_parts).collect(),
        Location::Unsupported { .. } => Vec::new(),
    }
}
