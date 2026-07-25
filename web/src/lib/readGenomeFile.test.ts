import { gzipSync } from 'fflate'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GenomeFileError, readGenbankFile } from './readGenomeFile'

const genbank = 'LOCUS       SYNTH 3 bp DNA linear\nORIGIN\n        1 atg\n//\n'
const plain = (name: string) => new File([genbank], name)
const gzip = (name: string) => new File([gzipSync(new TextEncoder().encode(genbank))], name)

describe('readGenbankFile', () => {
  afterEach(() => vi.unstubAllGlobals())
  it.each(['sample.gbk', 'sample.gb'])('reads uncompressed %s', async (name) => {
    await expect(readGenbankFile(plain(name))).resolves.toBe(genbank)
  })

  it.each(['sample.gbk.gz', 'sample.gbff.gz', 'SAMPLE.GeNbAnK.GZ'])(
    'decompresses %s',
    async (name) => {
      await expect(readGenbankFile(gzip(name))).resolves.toBe(genbank)
    },
  )

  it('reports invalid gzip bytes', async () => {
    await expect(readGenbankFile(new File(['not gzip'], 'broken.gbk.gz'))).rejects.toMatchObject({
      code: 'invalid_gzip',
    } satisfies Partial<GenomeFileError>)
  })

  it('falls back to fflate without DecompressionStream', async () => {
    vi.stubGlobal('DecompressionStream', undefined)
    await expect(readGenbankFile(gzip('fallback.gb.gz'))).resolves.toBe(genbank)
  })

  it('rejects unsupported extensions', async () => {
    await expect(readGenbankFile(plain('sample.txt'))).rejects.toMatchObject({
      code: 'unsupported_extension',
    } satisfies Partial<GenomeFileError>)
  })
})
