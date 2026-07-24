export type GenomeFeature = {
  feature_type: string
  label: string
  strand: 'forward' | 'reverse' | 'unknown'
  start: number
  end: number
  intervals: { start: number; end: number }[]
}

export type ParsedGenome = {
  id: string
  accession?: string
  description?: string
  topology: string
  sequence: string
  features: GenomeFeature[]
  warnings: string[]
  frames: [string, string, string, string, string, string]
}
