// Usage: npx tsx scripts/import-vocab.ts [path-to-xlsx]
// Reads vocab.xlsx ("Sheet1") and writes src/data/seed.json plus a list of rows to double-check.
import XLSX from 'xlsx'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(process.argv[2] ?? resolve(here, '../../vocab.xlsx'))
const wb = XLSX.read(readFileSync(src), { type: 'buffer' })
const ws = wb.Sheets['Sheet1']
const cell = (c: string, r: number): string => {
  const v = ws[`${c}${r}`]?.v
  return v === undefined || v === null ? '' : String(v).trim()
}
const range = XLSX.utils.decode_range(ws['!ref']!)
const lastRow = range.e.r + 1

const hasArabic = (s: string) => /[؀-ۿ]/.test(s)
const hasLatin = (s: string) => /[A-Za-z]/.test(s)
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

interface Word {
  id: string
  type: 'noun' | 'verb' | 'adj' | 'phrase' | 'number'
  english: string
  arabic: string[]
  translit: string[]
  notes?: string
  conjugations?: Record<string, string>
}
const words: Word[] = []
const flags: string[] = []
const seen = new Set<string>()
const uid = (base: string) => {
  let id = base || 'item'
  let n = 2
  while (seen.has(id)) id = `${base}-${n++}`
  seen.add(id)
  return id
}
const nonEmpty = (a: string[]) => a.filter(Boolean)

for (let r = 4; r <= lastRow; r++) {
  // Nouns: A english, B/C arabic, D notes, E/F translit
  const nEn = cell('A', r)
  if (nEn) {
    const ar = nonEmpty([cell('B', r), cell('C', r), cell('D', r) && hasArabic(cell('D', r)) ? cell('D', r) : ''])
    const notes = hasArabic(cell('D', r)) ? '' : cell('D', r)
    const tr = nonEmpty([cell('E', r), cell('F', r)])
    if (!ar.length) flags.push(`Row ${r} noun "${nEn}": no Arabic`)
    if (!tr.length) flags.push(`Row ${r} noun "${nEn}": no transliteration`)
    words.push({ id: uid('n-' + slug(nEn)), type: 'noun', english: nEn, arabic: ar, translit: tr, ...(notes && { notes }) })
  }

  // Verbs: H english, I arabic, J..N conjugations
  const vEn = cell('H', r)
  if (vEn) {
    const ar = cell('I', r)
    const conj: Record<string, string> = {}
    const labels: [string, string][] = [['J', 'I'], ['K', 'he'], ['L', 'she'], ['M', 'we'], ['N', 'they']]
    for (const [col, lab] of labels) if (cell(col, r)) conj[lab] = cell(col, r)
    if (!hasArabic(ar)) flags.push(`Row ${r} verb "${vEn}": Arabic cell is "${ar}"`)
    if (Object.keys(conj).length < 5) flags.push(`Row ${r} verb "${vEn}": only ${Object.keys(conj).length}/5 conjugations`)
    words.push({ id: uid('v-' + slug(vEn)), type: 'verb', english: vEn, arabic: nonEmpty([ar]), translit: [], conjugations: conj })
  }

  // Adjectives: P english, Q arabic
  const aEn = cell('P', r)
  if (aEn) {
    if (!hasArabic(cell('Q', r))) flags.push(`Row ${r} adjective "${aEn}": no Arabic`)
    words.push({ id: uid('a-' + slug(aEn)), type: 'adj', english: aEn, arabic: nonEmpty([cell('Q', r)]), translit: [] })
  }

  // Phrases: S english, T notes, U arabic, V translit
  const pEn = cell('S', r)
  if (pEn && cell('U', r)) {
    const notes = cell('T', r)
    flags.push(`Row ${r} phrase "${pEn}": check Arabic "${cell('U', r)}"` + (pEn.endsWith('...') ? ' (incomplete phrase "..."; likely needs a fill-in)' : ''))
    words.push({ id: uid('p-' + slug(pEn)), type: 'phrase', english: pEn, arabic: [cell('U', r)], translit: nonEmpty([cell('V', r)]), ...(notes && { notes }) })
  }

  // Numbers: X number, Y arabic, Z translit
  const num = cell('X', r)
  if (num && hasArabic(cell('Y', r))) {
    words.push({ id: uid('num-' + num), type: 'number', english: num, arabic: [cell('Y', r)], translit: nonEmpty([cell('Z', r)]) })
  }
}
// Row 3 holds the number 0
if (cell('X', 3) === '0') {
  words.push({ id: 'num-0', type: 'number', english: '0', arabic: [cell('Y', 3)], translit: nonEmpty([cell('Z', 3)]) })
}

for (const w of words) {
  if (w.arabic.some((a) => hasLatin(a))) flags.push(`${w.id}: Arabic field contains Latin letters: ${w.arabic.join(' / ')}`)
}

const out = resolve(here, '../src/data/seed.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(words, null, 1), 'utf8')
const counts = words.reduce<Record<string, number>>((m, w) => ((m[w.type] = (m[w.type] ?? 0) + 1), m), {})
console.log('Wrote', words.length, 'words ->', out, counts)
console.log(flags.length ? 'REVIEW THESE:\n' + flags.join('\n') : 'No flags')
