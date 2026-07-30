//! Conversion and bounds helpers for zero-based, half-open genomic intervals.

use crate::model::Interval;

/// Converts a valid GenBank-style one-based inclusive range to `[start, end)`.
pub fn one_based_inclusive_to_zero_based_half_open(start: u64, end: u64) -> Interval {
    let zero_start = start.saturating_sub(1);
    Interval {
        start: zero_start,
        end,
    }
}

/// Converts a one-based single-base position to a one-base half-open interval.
pub fn one_based_single_to_zero_based_half_open(pos: u64) -> Interval {
    let zero_start = pos.saturating_sub(1);
    Interval {
        start: zero_start,
        end: zero_start + 1,
    }
}

/// Intersects an interval with a sequence, returning `None` when no bases remain.
pub fn clamp_interval(interval: &Interval, seq_len: u64) -> Option<Interval> {
    let start = interval.start.min(seq_len);
    let end = interval.end.min(seq_len);
    (start < end).then_some(Interval { start, end })
}
