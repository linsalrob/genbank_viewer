import { describe, expect, it } from 'vitest'
import type { SequenceSearchMatchDto } from './genomeTypes'
import { adjacentResultIndex, normalizeQueryForDisplay, searchResultLabel, sortSearchResults, viewportForSearchMatch } from './search'

const nucleotide = (start: number, end: number): SequenceSearchMatchDto => ({
  start, end, strand: 'Forward', frame: null, matchType: 'nucleotide', matchedSequence: 'ACG', geneticCode: null,
})

describe('sequence search presentation', () => {
  it('normalizes FASTA wrapping without hiding invalid symbols', () => {
    expect(normalizeQueryForDisplay('>query\nac gu\tN\n', 'nucleotide')).toBe('ACGTN')
    expect(normalizeQueryForDisplay('m x*\n', 'amino_acid')).toBe('MX*')
    expect(normalizeQueryForDisplay('AC-1', 'nucleotide')).toBe('AC-1')
  })

  it('formats internal intervals as one-based inclusive labels', () => {
    expect(searchResultLabel(nucleotide(1203, 1236))).toBe('1,204..1,236 — forward')
    expect(searchResultLabel({ ...nucleotide(8449, 8515), strand: 'Reverse', frame: -1, matchType: 'amino_acid' }))
      .toBe('8,450..8,515 — frame -1')
  })

  it('sorts results deterministically and wraps navigation', () => {
    expect(sortSearchResults([nucleotide(20, 23), nucleotide(5, 8)]).map((match) => match.start)).toEqual([5, 20])
    expect(adjacentResultIndex(0, 3, -1)).toBe(2)
    expect(adjacentResultIndex(2, 3, 1)).toBe(0)
    expect(adjacentResultIndex(-1, 0, 1)).toBe(-1)
  })

  it('creates contextual viewports and clamps them to record boundaries', () => {
    expect(viewportForSearchMatch(nucleotide(0, 3), 1000, 800)).toEqual({ start: 0, end: 60, width: 800 })
    expect(viewportForSearchMatch(nucleotide(980, 1000), 1000, 800)).toEqual({ start: 940, end: 1000, width: 800 })
    expect(viewportForSearchMatch(nucleotide(200, 400), 1000, 800)).toEqual({ start: 100, end: 500, width: 800 })
    const peptide: SequenceSearchMatchDto = { ...nucleotide(30, 36), matchType: 'amino_acid', frame: 1, geneticCode: 11 }
    expect(viewportForSearchMatch(peptide, 1000, 800)).toEqual({ start: 0, end: 90, width: 800 })
  })
})
