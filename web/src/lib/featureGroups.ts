import type { FeatureDto } from './genomeTypes'

export type FeatureGroupId =
  | 'genes'
  | 'rna'
  | 'protein_processing'
  | 'regional'
  | 'assembly_variation'
  | 'other'

export interface FeatureGroupDefinition {
  id: FeatureGroupId
  label: string
  description: string
  defaultVisible: boolean
  trackOrder: number
}

export const FEATURE_GROUPS: readonly FeatureGroupDefinition[] = [
  { id: 'genes', label: 'Genes and CDSs', description: 'Gene spans and protein-coding sequences.', defaultVisible: true, trackOrder: 1 },
  { id: 'rna', label: 'RNAs and transcripts', description: 'RNA genes, transcripts, exons, introns, and untranslated regions.', defaultVisible: true, trackOrder: 2 },
  { id: 'protein_processing', label: 'Protein processing', description: 'Mature peptides, signal peptides, transit peptides, and propeptides.', defaultVisible: false, trackOrder: 3 },
  { id: 'regional', label: 'Regulatory and genomic regions', description: 'Operons, regulatory sites, repeats, mobile elements, and other broad regions.', defaultVisible: false, trackOrder: 4 },
  { id: 'assembly_variation', label: 'Assembly, source, and variation', description: 'Source spans, gaps, assembly uncertainty, and sequence variation.', defaultVisible: false, trackOrder: 5 },
  { id: 'other', label: 'Other', description: 'Unknown, obsolete, or non-standard feature keys retained by the parser.', defaultVisible: false, trackOrder: 6 },
]

// Viewer taxonomy only: unknown keys remain intact and fall through to Other.
const FEATURE_TYPES: Record<Exclude<FeatureGroupId, 'other'>, readonly string[]> = {
  genes: ['gene', 'cds'],
  rna: ['mrna', 'ncrna', 'misc_rna', 'precursor_rna', 'prim_transcript', 'rrna', 'trna', 'tmrna', 'exon', 'intron', "5'utr", "3'utr"],
  protein_processing: ['mat_peptide', 'sig_peptide', 'transit_peptide', 'propeptide'],
  regional: ['operon', 'regulatory', 'protein_bind', 'primer_bind', 'misc_binding', 'polya_site', 'rep_origin', 'orit', 'd-loop', 'repeat_region', 'mobile_element', 'misc_recomb', 'stem_loop', 'misc_structure', 'misc_feature', 'idna', 'centromere', 'telomere', 'sts'],
  assembly_variation: ['source', 'gap', 'assembly_gap', 'unsure', 'variation', 'misc_difference', 'modified_base', 'old_sequence'],
}

const TYPE_TO_GROUP = new Map<string, FeatureGroupId>(
  Object.entries(FEATURE_TYPES).flatMap(([group, types]) =>
    types.map((type) => [type, group as FeatureGroupId] as const),
  ),
)

/** Classifies a preserved feature key case-insensitively for display only. */
export function classifyFeatureType(featureType: string): FeatureGroupId {
  return TYPE_TO_GROUP.get(featureType.toLowerCase()) ?? 'other'
}

export function featureGroupDefinition(group: FeatureGroupId): FeatureGroupDefinition {
  return FEATURE_GROUPS.find((definition) => definition.id === group) ?? FEATURE_GROUPS.at(-1)!
}

export function featuresInGroup(features: FeatureDto[], group: FeatureGroupId): FeatureDto[] {
  return features.filter((feature) => classifyFeatureType(feature.type) === group)
}

export function defaultVisibleFeatureGroups(): Set<FeatureGroupId> {
  return new Set(FEATURE_GROUPS.filter((group) => group.defaultVisible).map((group) => group.id))
}

export function featureGroupCounts(features: FeatureDto[]): Record<FeatureGroupId, number> {
  const counts: Record<FeatureGroupId, number> = {
    genes: 0, rna: 0, protein_processing: 0, regional: 0, assembly_variation: 0, other: 0,
  }
  for (const feature of features) counts[classifyFeatureType(feature.type)]++
  return counts
}

export function qualifierValue(feature: FeatureDto, key: string): string | undefined {
  return feature.qualifiers.find((qualifier) => qualifier.key.toLowerCase() === key.toLowerCase())?.value
}

export function displayFeatureLabel(feature: FeatureDto): string {
  const type = feature.type.toLowerCase()
  if (type === 'regulatory') return qualifierValue(feature, 'regulatory_class') ?? feature.label
  if (type === 'repeat_region') return qualifierValue(feature, 'rpt_type') ?? feature.label
  if (type === 'mobile_element') return qualifierValue(feature, 'mobile_element_type') ?? feature.label
  return feature.label || feature.type || 'Unknown feature'
}
