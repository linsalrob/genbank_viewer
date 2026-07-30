import type { BrowserError, GeneticCodeMetadataDto, GenomeRecordDto, SequenceSearchMatchDto, SequenceSearchType, StopCodonDto, TranslationDto } from './genomeTypes'
import init, { parse_genbank_json, search_sequence_json, stop_codons_in_region_json, supported_genetic_codes_json, translate_region_json } from './wasm-pkg/genome_wasm'

let initialization: Promise<void> | undefined
const translationCache = new Map<string, TranslationDto>()
const stopCodonCache = new Map<string, StopCodonDto[]>()
const CACHE_LIMIT = 24
const recordIdentities = new WeakMap<GenomeRecordDto, number>()
const encodedSequences = new WeakMap<GenomeRecordDto, Uint8Array>()
let nextRecordIdentity = 1

function recordIdentity(record: GenomeRecordDto): number {
  let identity = recordIdentities.get(record)
  if (identity === undefined) {
    identity = nextRecordIdentity++
    recordIdentities.set(record, identity)
  }
  return identity
}

function encodedSequence(record: GenomeRecordDto): Uint8Array {
  let encoded = encodedSequences.get(record)
  if (!encoded) {
    encoded = new TextEncoder().encode(record.sequence)
    encodedSequences.set(record, encoded)
  }
  return encoded
}

function initializeWasm(): Promise<void> {
  initialization ??= init().then(() => undefined)
  return initialization!
}

function browserError(error: unknown): BrowserError {
  if (typeof error === 'object' && error && 'message' in error) return error as BrowserError
  return { code: 'unknown_error', message: String(error) }
}

export async function parseGenbankWithWasm(text: string): Promise<GenomeRecordDto[]> {
  await initializeWasm()
  try {
    return parse_genbank_json(text) as GenomeRecordDto[]
  } catch (error) {
    throw browserError(error)
  }
}

export async function supportedGeneticCodes(): Promise<GeneticCodeMetadataDto[]> {
  await initializeWasm()
  return supported_genetic_codes_json() as GeneticCodeMetadataDto[]
}

export async function searchSequence(
  record: GenomeRecordDto,
  query: string,
  searchType: SequenceSearchType,
  geneticCode: number,
): Promise<SequenceSearchMatchDto[]> {
  await initializeWasm()
  try {
    return search_sequence_json(
      encodedSequence(record), query, searchType, geneticCode,
    ) as SequenceSearchMatchDto[]
  } catch (error) {
    throw browserError(error)
  }
}

export async function translateRegion(
  record: GenomeRecordDto,
  start: number,
  end: number,
  geneticCode: number,
): Promise<TranslationDto> {
  await initializeWasm()
  // Record identity prevents collisions between files with equal coordinates.
  const flankStart = Math.max(0, Math.floor(start) - 3)
  const flankEnd = Math.min(record.sequenceLength, Math.ceil(end) + 3)
  const key = `${recordIdentity(record)}:${flankStart}:${flankEnd}:${geneticCode}`
  const cached = translationCache.get(key)
  if (cached) return cached
  const result = translate_region_json(encodedSequence(record), flankStart, flankEnd, geneticCode) as TranslationDto
  translationCache.set(key, result)
  while (translationCache.size > CACHE_LIMIT) translationCache.delete(translationCache.keys().next().value!)
  return result
}


export async function stopCodonsInRegion(
  record: GenomeRecordDto,
  start: number,
  end: number,
  geneticCode: number,
): Promise<StopCodonDto[]> {
  await initializeWasm()
  // GenomeCanvas rejects results from requests superseded by a newer viewport.
  const regionStart = Math.max(0, Math.floor(start))
  const regionEnd = Math.min(record.sequenceLength, Math.ceil(end))
  const key = `${recordIdentity(record)}:${regionStart}:${regionEnd}:${geneticCode}`
  const cached = stopCodonCache.get(key)
  if (cached) return cached
  const result = stop_codons_in_region_json(
    encodedSequence(record), regionStart, regionEnd, geneticCode,
  ) as StopCodonDto[]
  stopCodonCache.set(key, result)
  while (stopCodonCache.size > CACHE_LIMIT) stopCodonCache.delete(stopCodonCache.keys().next().value!)
  return result
}
