import type { SequenceSearchMatchDto, SequenceSearchType } from './genomeTypes'
import type { GenomeViewport } from './viewport'

export function normalizeQueryForDisplay(query: string, type: SequenceSearchType): string {
  const normalized = query
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('>'))
    .join('')
    .replace(/\s+/g, '')
    .toUpperCase()
  return type === 'nucleotide' ? normalized.replaceAll('U', 'T') : normalized
}

export function searchResultLabel(match: SequenceSearchMatchDto): string {
  const coordinates = `${(match.start + 1).toLocaleString()}..${match.end.toLocaleString()}`
  if (match.matchType === 'amino_acid') return `${coordinates} — frame ${match.frame! > 0 ? '+' : ''}${match.frame}`
  const strand = match.strand === 'Unknown' ? 'both strands' : match.strand.toLowerCase()
  return `${coordinates} — ${strand}`
}

export function sortSearchResults(matches: SequenceSearchMatchDto[]): SequenceSearchMatchDto[] {
  return [...matches].sort((left, right) =>
    left.start - right.start || left.end - right.end || (left.frame ?? 0) - (right.frame ?? 0)
      || left.strand.localeCompare(right.strand),
  )
}

export function adjacentResultIndex(current: number, count: number, direction: -1 | 1): number {
  if (count === 0) return -1
  return (current + direction + count) % count
}

export function viewportForSearchMatch(
  match: SequenceSearchMatchDto,
  genomeLength: number,
  width: number,
): GenomeViewport {
  const matchLength = match.end - match.start
  const minimumSpan = match.matchType === 'amino_acid' ? 90 : 60
  const span = Math.min(genomeLength, Math.max(minimumSpan, matchLength * 2))
  const centre = (match.start + match.end) / 2
  const start = Math.max(0, Math.min(genomeLength - span, centre - span / 2))
  return { start, end: start + span, width }
}
