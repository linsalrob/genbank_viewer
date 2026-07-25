export interface ParseWarningDto {
  record_id?: string
  line?: number
  code: string
  message: string
}

export interface FeaturePartDto {
  start: number
  end: number
  partialStart: boolean
  partialEnd: boolean
}

export interface QualifierDto { key: string; value?: string }

export interface FeatureDto {
  id: number
  type: string
  strand: 1 | -1 | 0
  start: number
  end: number
  parts: FeaturePartDto[]
  label: string
  locusTag?: string
  gene?: string
  product?: string
  proteinId?: string
  translation?: string
  qualifiers: QualifierDto[]
}

export interface CodingSummaryDto {
  sequence_length: number
  cds_count: number
  forward_cds_count: number
  reverse_cds_count: number
  covered_bases: number
  coding_density: number
}

export interface GenomeRecordDto {
  id: string
  accession?: string
  description?: string
  sequenceLength: number
  sequence: string
  reverseComplement: string
  topology: 'linear' | 'circular' | 'unknown'
  features: FeatureDto[]
  warnings: ParseWarningDto[]
  codingSummary: CodingSummaryDto
}

export interface TranslatedCodonDto {
  genomic_start: number
  genomic_end: number
  amino_acid: string
  codon: number[]
  frame: 1 | 2 | 3 | -1 | -2 | -3
  is_start: boolean
  is_stop: boolean
}

export interface TranslationDto {
  region_start: number
  region_end: number
  codons: TranslatedCodonDto[]
}

export interface GeneticCodeMetadataDto {
  id: number
  short_name: string
  description: string
}

export interface BrowserError {
  code: string
  message: string
  recordId?: string
  line?: number
  offendingText?: string
}
