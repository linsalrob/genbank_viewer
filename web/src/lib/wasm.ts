import type { ParsedGenome } from './genomeTypes'

export async function parseGenbankWithWasm(text: string): Promise<ParsedGenome> {
  const wasmModulePath = '../../../crates/genome-wasm/pkg/genome_wasm.js'
  const mod = (await import(/* @vite-ignore */ wasmModulePath)) as {
    parse_genbank_record: (input: string) => ParsedGenome
  }
  return mod.parse_genbank_record(text)
}
