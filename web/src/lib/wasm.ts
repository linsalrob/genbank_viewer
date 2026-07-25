import type { BrowserError, GeneticCodeMetadataDto, GenomeRecordDto, TranslationDto } from './genomeTypes'
import init, { parse_genbank_json, supported_genetic_codes_json, translate_region_json } from './wasm-pkg/genome_wasm'

let initialization: Promise<void> | undefined
const translationCache = new Map<string, TranslationDto>()
const CACHE_LIMIT = 24
const recordIdentities = new WeakMap<GenomeRecordDto, number>()
let nextRecordIdentity = 1

function recordIdentity(record: GenomeRecordDto): number {
  let identity = recordIdentities.get(record)
  if (identity === undefined) {
    identity = nextRecordIdentity++
    recordIdentities.set(record, identity)
  }
  return identity
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

export async function translateRegion(
  record: GenomeRecordDto,
  start: number,
  end: number,
  geneticCode: number,
): Promise<TranslationDto> {
  await initializeWasm()
  const flankStart = Math.max(0, Math.floor(start) - 3)
  const flankEnd = Math.min(record.sequenceLength, Math.ceil(end) + 3)
  const key = `${recordIdentity(record)}:${flankStart}:${flankEnd}:${geneticCode}`
  const cached = translationCache.get(key)
  if (cached) return cached
  const result = translate_region_json(new TextEncoder().encode(record.sequence), flankStart, flankEnd, geneticCode) as TranslationDto
  translationCache.set(key, result)
  while (translationCache.size > CACHE_LIMIT) translationCache.delete(translationCache.keys().next().value!)
  return result
}
