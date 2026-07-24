import type { ParsedGenome } from './genomeTypes'
import init, { parse_genbank_record } from './wasm-pkg/genome_wasm'

let initialization: Promise<void> | undefined

function initializeWasm(): Promise<void> {
  initialization ??= init().then(() => undefined)
  return initialization
}

export async function parseGenbankWithWasm(text: string): Promise<ParsedGenome> {
  await initializeWasm()
  return parse_genbank_record(text) as ParsedGenome
}
