import { gunzipSync } from 'fflate'

const GENBANK_FILENAME = /\.(gb|gbk|genbank|gbff)(\.gz)?$/i

export class GenomeFileError extends Error {
  constructor(
    public readonly code: 'unsupported_extension' | 'unreadable_file' | 'invalid_gzip',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'GenomeFileError'
  }
}

async function decompressGzip(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([bytes.slice().buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
      return new Uint8Array(await new Response(stream).arrayBuffer())
    }
    return gunzipSync(bytes)
  } catch (cause) {
    throw new GenomeFileError(
      'invalid_gzip',
      'The gzip-compressed GenBank file is invalid or truncated.',
      { cause },
    )
  }
}

/** Reads an accepted GenBank file and decompresses gzip bytes entirely locally. */
export async function readGenbankFile(file: File): Promise<string> {
  if (!GENBANK_FILENAME.test(file.name)) {
    throw new GenomeFileError(
      'unsupported_extension',
      'Choose a GenBank file ending in .gb, .gbk, .genbank, or .gbff, optionally followed by .gz.',
    )
  }

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await file.arrayBuffer())
  } catch (cause) {
    throw new GenomeFileError('unreadable_file', `Could not read ${file.name}.`, { cause })
  }

  const content = file.name.toLowerCase().endsWith('.gz') ? await decompressGzip(bytes) : bytes
  return new TextDecoder('utf-8', { fatal: false }).decode(content)
}
