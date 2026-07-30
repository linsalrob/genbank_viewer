//! Parsers that convert textual sequence formats into `genome-core` models.

pub mod genbank;

pub use genbank::{parse_first_genbank_record, parse_genbank, ParseError};
