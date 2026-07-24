use crate::model::Interval;

pub fn one_based_inclusive_to_zero_based_half_open(start: u64, end: u64) -> Interval {
    let zero_start = start.saturating_sub(1);
    Interval {
        start: zero_start,
        end,
    }
}

pub fn one_based_single_to_zero_based_half_open(pos: u64) -> Interval {
    let zero_start = pos.saturating_sub(1);
    Interval {
        start: zero_start,
        end: zero_start + 1,
    }
}

pub fn clamp_interval(interval: &Interval, seq_len: u64) -> Option<Interval> {
    let start = interval.start.min(seq_len);
    let end = interval.end.min(seq_len);
    (start < end).then_some(Interval { start, end })
}
