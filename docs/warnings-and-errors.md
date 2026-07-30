# Warnings and errors

An error prevents a file or query from being used. A warning preserves a record while describing information that could not be represented exactly.

## File and parser errors

The file loader reports unsupported extensions, unreadable files, and invalid/truncated gzip data. Parser errors are structured with a code, message, and line number where available; **Copy details** copies the diagnostic as JSON.

The parser rejects records without a usable `LOCUS` identifier, malformed locations that cannot be parsed into a supported or preserved form, missing record terminators in required contexts, and invalid sequence structure. See [GenBank support](genbank-support.md) for the precise subset.

## Parser warnings

Warnings can report:

- sequence length differing from the `LOCUS` declaration;
- an unterminated quoted qualifier;
- unsupported location syntax retained as original text;
- an empty record;
- a feature outside sequence bounds;
- unsupported metadata.

Warnings show their code, source line when known, and explanatory message beneath the viewer. Unsupported locations are not silently coerced into a misleading interval.

## Search errors

Search reports empty or too-short queries, queries longer than the record, and invalid nucleotide or amino-acid symbols. See [Search semantics](search-semantics.md) for accepted alphabets and minimum lengths.
