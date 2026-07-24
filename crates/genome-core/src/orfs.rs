use crate::translation::{reverse_complement, translate_frame};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SixFrameTranslation {
    pub forward: [String; 3],
    pub reverse: [String; 3],
}

pub fn six_frame_translation(sequence: &[u8]) -> SixFrameTranslation {
    let rc = reverse_complement(sequence);
    SixFrameTranslation {
        forward: [
            translate_frame(sequence, 0),
            translate_frame(sequence, 1),
            translate_frame(sequence, 2),
        ],
        reverse: [
            translate_frame(&rc, 0),
            translate_frame(&rc, 1),
            translate_frame(&rc, 2),
        ],
    }
}
