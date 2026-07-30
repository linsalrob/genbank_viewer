import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('..')
const docs = path.join(root, 'docs')
const markdown = [path.join(root, 'README.md'), path.join(root, 'CHANGELOG.md')]
  .filter(fs.existsSync)
  .concat(fs.readdirSync(docs).filter((name) => name.endsWith('.md')).map((name) => path.join(docs, name)))
const errors = []
const referencedImages = new Set()

for (const file of markdown) {
  const text = fs.readFileSync(file, 'utf8')
  if (/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/(?!main\/)/.test(text)) errors.push(`${file}: branch-specific raw GitHub URL`)
  if (/webtemis/i.test(text)) errors.push(`${file}: stale Webtemis name`)
  for (const match of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].split('#')[0]
    if (/^https?:/.test(target)) continue
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target))
    if (!fs.existsSync(resolved)) errors.push(`${file}: missing image ${target}`)
    if (resolved.startsWith(path.join(docs, 'assets'))) referencedImages.add(path.basename(resolved))
  }
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)\s]+\.md)(?:#[^)]+)?\)/g)) {
    if (/^https?:/.test(match[1])) continue
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(match[1]))
    if (!fs.existsSync(resolved)) errors.push(`${file}: missing Markdown target ${match[1]}`)
  }
}

const expectedScreenshots = [
  'viewer-loaded.png', 'grouped-tracks-default.png', 'grouped-tracks-all.png',
  'feature-inspector.png', 'low-zoom-stop-tracks.png', 'high-zoom-six-frames.png',
  'search-nucleotide-forward.png', 'search-nucleotide-reverse.png',
  'search-peptide-low-zoom.png', 'search-peptide-high-zoom.png',
  'search-peptide-reverse-frame.png', 'viewer-layout-gzip.png',
]
for (const name of expectedScreenshots) {
  if (!fs.existsSync(path.join(docs, 'assets', name))) errors.push(`missing generated screenshot docs/assets/${name}`)
}
for (const name of fs.readdirSync(path.join(docs, 'assets'))) {
  if (/placeholder/i.test(name)) errors.push(`stale placeholder asset docs/assets/${name}`)
  if (!referencedImages.has(name)) errors.push(`unreferenced asset docs/assets/${name}`)
}

const codes = [...fs.readFileSync(path.join(root, 'crates/genome-core/src/translation.rs'), 'utf8')
  .matchAll(/code!\(\s*(\d+),\s*"([^"]+)"/g)].map((match) => `${match[1]}|${match[2]}`)
const codeDoc = fs.readFileSync(path.join(docs, 'genetic-codes.md'), 'utf8')
for (const entry of codes) {
  const [id, name] = entry.split('|')
  if (!codeDoc.includes(`| ${id} | ${name} |`)) errors.push(`genetic-codes.md missing table ${id} (${name})`)
}

const featureSource = fs.readFileSync(path.join(root, 'web/src/lib/featureGroups.ts'), 'utf8')
const featureDoc = fs.readFileSync(path.join(docs, 'feature-groups.md'), 'utf8')
for (const match of featureSource.matchAll(/^\s+(\w+): \[([^\]]+)\]/gm)) {
  for (const key of [...match[2].matchAll(/"([^"]+)"|'([^']+)'/g)].map((item) => item[1] ?? item[2])) {
    if (!featureDoc.includes(`\`${key}\``)) errors.push(`feature-groups.md missing feature key ${key}`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Documentation audit passed: ${markdown.length} Markdown files and ${referencedImages.size} referenced assets.`)
