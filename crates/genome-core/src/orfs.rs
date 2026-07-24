//! Compatibility helpers. New callers should use coordinate-aware regional translation.

use crate::translation::{
    translate_region_six_frames, GeneticCode, SixFrameTranslation, TranslationError,
};

pub fn six_frame_translation(sequence: &[u8]) -> Result<SixFrameTranslation, TranslationError> {
    translate_region_six_frames(sequence, 0, sequence.len() as u64, GeneticCode::default())
}
