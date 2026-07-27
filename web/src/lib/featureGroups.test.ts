import { describe, expect, it } from 'vitest'
import type { FeatureDto } from './genomeTypes'
import { FEATURE_GROUPS, classifyFeatureType, defaultVisibleFeatureGroups, featuresInGroup } from './featureGroups'

const mappings = {
  genes: ['gene', 'CDS'],
  rna: ['mRNA', 'ncRNA', 'misc_RNA', 'precursor_RNA', 'prim_transcript', 'rRNA', 'tRNA', 'tmRNA', 'exon', 'intron', "5'UTR", "3'UTR"],
  protein_processing: ['mat_peptide', 'sig_peptide', 'transit_peptide', 'propeptide'],
  regional: ['operon', 'regulatory', 'protein_bind', 'primer_bind', 'misc_binding', 'polyA_site', 'rep_origin', 'oriT', 'D-loop', 'repeat_region', 'mobile_element', 'misc_recomb', 'stem_loop', 'misc_structure', 'misc_feature', 'iDNA', 'centromere', 'telomere', 'STS'],
  assembly_variation: ['source', 'gap', 'assembly_gap', 'unsure', 'variation', 'misc_difference', 'modified_base', 'old_sequence'],
} as const

describe('feature group registry', () => {
  for (const [group, keys] of Object.entries(mappings)) {
    it(`classifies every ${group} key case-insensitively`, () => {
      for (const key of keys) {
        expect(classifyFeatureType(key)).toBe(group)
        expect(classifyFeatureType(key.toLowerCase())).toBe(group)
        expect(classifyFeatureType(key.toUpperCase())).toBe(group)
        expect(classifyFeatureType(`${key.slice(0, 1).toUpperCase()}${key.slice(1).toLowerCase()}`)).toBe(group)
      }
    })
  }
  it('keeps unknown and empty keys in Other', () => {
    expect(classifyFeatureType('custom_key')).toBe('other')
    expect(classifyFeatureType('')).toBe('other')
  })
  it('enables only genes and RNA by default', () => {
    expect([...defaultVisibleFeatureGroups()]).toEqual(['genes', 'rna'])
    expect(FEATURE_GROUPS.filter((group) => group.defaultVisible).map((group) => group.id)).toEqual(['genes', 'rna'])
  })
  it('filters without changing feature keys', () => {
    const features = [{ type: 'tRNA' }, { type: 'customThing' }] as FeatureDto[]
    expect(featuresInGroup(features, 'rna')[0].type).toBe('tRNA')
    expect(featuresInGroup(features, 'other')[0].type).toBe('customThing')
  })
})
