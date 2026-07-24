use genome_core::orfs::six_frame_translation;
use genome_core::{Feature, GenomeRecord, Strand};
use genome_formats::parse_genbank;
use wasm_bindgen::prelude::*;

#[derive(Debug, serde::Serialize)]
struct WasmParseResult {
    id: String,
    accession: Option<String>,
    description: Option<String>,
    topology: String,
    sequence: String,
    features: Vec<WasmFeature>,
    warnings: Vec<String>,
    frames: [String; 6],
}

#[derive(Debug, serde::Serialize)]
struct WasmFeature {
    feature_type: String,
    label: String,
    strand: String,
    start: u64,
    end: u64,
    intervals: Vec<WasmInterval>,
}

#[derive(Debug, serde::Serialize)]
struct WasmInterval {
    start: u64,
    end: u64,
}

#[derive(Debug, serde::Serialize)]
struct WasmParseError {
    record_id: Option<String>,
    line: usize,
    offending_text: String,
    message: String,
}

#[wasm_bindgen]
pub fn parse_genbank_record(input: &str) -> Result<JsValue, JsValue> {
    let record = parse_genbank(input).map_err(|e| {
        serde_wasm_bindgen::to_value(&WasmParseError {
            record_id: e.record_id,
            line: e.line,
            offending_text: e.offending_text,
            message: e.message,
        })
        .unwrap_or_else(|_| JsValue::from_str("failed to serialize parse error"))
    })?;

    let output = to_wasm_result(record);
    serde_wasm_bindgen::to_value(&output)
        .map_err(|e| JsValue::from_str(&format!("serialization failed: {e}")))
}

fn to_wasm_result(record: GenomeRecord) -> WasmParseResult {
    let six = six_frame_translation(&record.sequence);
    let frames = [
        six.forward[0].clone(),
        six.forward[1].clone(),
        six.forward[2].clone(),
        six.reverse[0].clone(),
        six.reverse[1].clone(),
        six.reverse[2].clone(),
    ];

    WasmParseResult {
        id: record.id,
        accession: record.accession,
        description: record.description,
        topology: format!("{:?}", record.topology),
        sequence: String::from_utf8_lossy(&record.sequence).to_string(),
        features: record
            .features
            .into_iter()
            .filter(|f| f.feature_type == "CDS")
            .map(to_wasm_feature)
            .collect(),
        warnings: record.warnings,
        frames,
    }
}

fn to_wasm_feature(feature: Feature) -> WasmFeature {
    let bounding = feature.bounding_interval().unwrap_or(genome_core::Interval { start: 0, end: 0 });
    WasmFeature {
        feature_type: feature.feature_type.clone(),
        label: feature.display_label(),
        strand: match feature.strand() {
            Strand::Forward => "forward",
            Strand::Reverse => "reverse",
            Strand::Unknown => "unknown",
        }
        .to_string(),
        start: bounding.start,
        end: bounding.end,
        intervals: feature
            .intervals()
            .into_iter()
            .map(|i| WasmInterval {
                start: i.start,
                end: i.end,
            })
            .collect(),
    }
}
