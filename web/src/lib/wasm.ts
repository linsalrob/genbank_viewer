import type { ParsedGenome } from './genomeTypes'

export async function parseGenbankWithWasm(text: string): Promise<ParsedGenome> {
  const mod = await import('../../../crates/genome-wasm/pkg/genome_wasm.js')
  return mod.parse_genbank_record(text) as ParsedGenome
}
