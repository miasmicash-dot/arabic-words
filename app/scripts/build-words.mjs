// Builds word packs (src/data/packs/pack-NN.json) from three published, openly licensed sources, with no AI:
//   1. Kelly Project Arabic list (Univ. of Leeds, CC BY-NC-SA) - which words are common, in frequency order.
//      https://ssharoff.github.io/kelly/ar_m3.xls
//   2. English Wiktionary, Arabic entries, via kaikki.org (CC BY-SA) - spelling with vowels, meaning, romanisation, conjugations.
//      https://kaikki.org/dictionary/Arabic/kaikki.org-dictionary-Arabic.jsonl
// A word is kept only when both sources agree on its spelling and part of speech, it has a clear modern meaning,
// a romanisation and (verbs) a full present-tense table, and Wiktionary does not also list it as a function word.
//
// Usage: node scripts/build-words.mjs <folder with the downloaded files> [packs=10] [size=50]
// Same inputs always give the same output. A report of kept/dropped words is written next to the packs.
import { createReadStream, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(process.argv[2] ?? '.')
const PACKS = +(process.argv[3] ?? 10)
const SIZE = +(process.argv[4] ?? 50)
const OUT = resolve(here, '../src/data/packs')

// ---------- Arabic text helpers ----------
const HARAKAT = /[ً-ْٰـ]/g // vowel marks, shadda, sukun, dagger alef, tatweel
const bare = (s) => s.replace(HARAKAT, '').trim()
/** Spelling key used to match the same word across sources (ignores vowels and hamza seats on alef). */
const key = (s) => bare(s).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')

// Wiktionary romanisation -> the app's plain style (maa'a, kitaab, shajarah...)
const ROMAN = [
  [/ā/g, 'aa'], [/ī/g, 'ii'], [/ū/g, 'uu'], [/ē/g, 'ee'], [/ō/g, 'oo'],
  [/ṯ/g, 'th'], [/ḏ/g, 'dh'], [/ḵ|ḫ|x/g, 'kh'], [/š/g, 'sh'], [/ḡ|ğ|ġ/g, 'gh'],
  [/ḥ/g, 'h'], [/ṣ/g, 's'], [/ḍ/g, 'd'], [/ṭ/g, 't'], [/ẓ|ḏ̣/g, 'z'], [/ž|j/g, 'j'],
  [/ʕ|ʿ/g, '`'], [/ʔ|ʾ/g, "'"], [/̣|̱|̄/g, ''],
]
function translit(r) {
  let s = r.normalize('NFC').toLowerCase()
  for (const [a, b] of ROMAN) s = s.replace(a, b)
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '') // any leftover accents
  s = s.replace(/^'/, '').replace(/ '/g, ' ') // a glottal stop at the very start is not written
  s = s.replace(/`/g, "'") // ayn is always written
  return /^[a-z' -]+$/.test(s) ? s : ''
}

// ---------- English meaning ----------
const BAD_SENSE = new Set(['obsolete', 'archaic', 'rare', 'dialectal', 'colloquial', 'slang', 'vulgar', 'proscribed', 'Classical', 'nonstandard', 'Islamic', 'historical', 'uncommon', 'poetic', 'dated'])
function meaning(entry, pos) {
  for (const s of entry.senses ?? []) {
    if (!s.glosses?.length) continue
    if ((s.tags ?? []).some((t) => BAD_SENSE.has(t) || t === 'form-of' || t === 'alt-of' || t === 'no-gloss')) continue
    if (s.form_of || s.alt_of) continue
    let g = s.glosses[0]
    if (/^(plural|feminine|masculine|singulative|collective|dual|verbal noun|active participle|passive participle|alternative|elative|nisba|diminutive|form|misspelling|abbreviation)\b/i.test(g)) continue
    g = g.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ')
    const parts = g.split(/[;,]/).map((p) => p.trim().replace(/^to /, '').replace(/^(a|an|the) /, '')).filter((p) => p && p.length <= 22 && !/[:"]/.test(p))
    if (!parts.length) continue
    const uniq = [...new Set(parts)].slice(0, pos === 'verb' ? 2 : 3)
    return uniq.join(', ')
  }
  return ''
}

// ---------- verbs: I / he / she / we / they in the present tense ----------
const PRON = { I: ['first-person', 'singular'], he: ['third-person', 'singular', 'masculine'], she: ['third-person', 'singular', 'feminine'], we: ['first-person', 'plural'], they: ['third-person', 'plural', 'masculine'] }
const PRON_AR = { I: 'أنا', he: 'هو', she: 'هي', we: 'نحن', they: 'هم' }
function conjugations(entry) {
  const forms = (entry.forms ?? []).filter((f) => { const t = f.tags ?? []; return t.includes('active') && t.includes('indicative') && t.includes('non-past') })
  const out = {}
  for (const [p, need] of Object.entries(PRON)) {
    const f = forms.find((x) => need.every((t) => x.tags.includes(t)))
    if (!f) return null
    out[p] = `${PRON_AR[p]} ${bare(f.form)}`
  }
  return out
}

// ---------- 1. Kelly list ----------
const POS = { 'اسم': 'noun', 'فعل': 'verb', 'صفة': 'adj' }
const wb = XLSX.read(readFileSync(resolve(SRC, 'ar_m3.xls')), { type: 'buffer' })
const kelly = XLSX.utils.sheet_to_json(wb.Sheets.Arabic, { header: 1 })
  .slice(1)
  .map((r) => ({ word: String(r[3] || r[4] || '').trim(), pos: POS[String(r[2] ?? '').trim()], cefr: r[5], freq: +r[6] || 0, id: r[7] }))
  .filter((r) => r.word && r.pos)
  .sort((a, b) => b.freq - a.freq || String(a.word).localeCompare(String(b.word)))

// ---------- 2. Wiktionary (only the entries we need) ----------
const wanted = new Set(kelly.map((k) => key(k.word)))
const FUNCTION = new Set(['prep', 'particle', 'conj', 'pron', 'det', 'adv', 'intj', 'postp', 'num', 'name'])
const little = new Set() // words Wiktionary also lists as a function word (prepositions, particles...)
const wik = new Map() // key|pos -> first entry (Wiktionary lists the main etymology first)
const rl = createInterface({ input: createReadStream(resolve(SRC, 'kaikki.jsonl')), crlfDelay: Infinity })
for await (const line of rl) {
  if (![...line.matchAll(/"word": "([^"]+)"/g)].some((m) => wanted.has(key(m[1])))) continue
  const e = JSON.parse(line)
  if (e.lang_code !== 'ar' || !wanted.has(key(e.word))) continue
  if (FUNCTION.has(e.pos)) { little.add(key(e.word)); continue }
  if (!['noun', 'verb', 'adj'].includes(e.pos)) continue
  const k = `${key(e.word)}|${e.pos}`
  if (!wik.has(k)) wik.set(k, [])
  wik.get(k).push(e)
}

// ---------- build ----------
const seed = JSON.parse(readFileSync(resolve(here, '../src/data/seed.json'), 'utf8'))
const have = new Set(seed.flatMap((w) => w.arabic.map(key)))
const haveEn = new Set(seed.map((w) => w.english.toLowerCase()))
const drop = {}
const why = (r, w) => ((drop[r] ??= []).push(w), null)
const out = []
const seen = new Set()
for (const k of kelly) {
  if (out.length >= PACKS * SIZE) break
  const kk = key(k.word)
  if (seen.has(kk)) continue
  seen.add(kk)
  if (have.has(kk)) { why('already in the app', k.word); continue }
  if (little.has(kk)) { why('also a function word or name', k.word); continue }
  const entries = wik.get(`${kk}|${k.pos}`)
  if (!entries) { why('not in Wiktionary as this part of speech', k.word); continue }
  let made = null
  const usable = (e) => (e.senses ?? []).filter((x) => x.glosses?.length && !(x.tags ?? []).some((t) => BAD_SENSE.has(t))).length
  for (const e of [...entries].sort((a, b) => usable(b) - usable(a))) {
    const canon = e.forms?.find((f) => f.tags?.includes('canonical'))?.form ?? e.word
    const roman = e.forms?.find((f) => f.tags?.includes('romanization'))?.form ?? ''
    const t = translit(roman)
    const en = meaning(e, k.pos)
    if (!t || !en) continue
    const w = { id: `k-${k.pos}-${k.id}`, type: k.pos, english: en, arabic: [bare(canon)], translit: [t], vocalized: canon, frequencyRank: out.length + 1, level: k.cefr, source: 'Kelly + Wiktionary' }
    if (k.pos === 'verb') {
      const c = conjugations(e)
      if (!c) continue
      w.conjugations = c
    }
    made = w
    break
  }
  if (!made) { why('no clear meaning, romanisation or conjugation', k.word); continue }
  if (haveEn.has(made.english.toLowerCase())) { why('same meaning already in the app', k.word); continue }
  out.push(made)
}

mkdirSync(OUT, { recursive: true })
for (let i = 0; i * SIZE < out.length; i++) {
  writeFileSync(resolve(OUT, `pack-${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(out.slice(i * SIZE, (i + 1) * SIZE), null, 1) + '\n')
}
const report = [`kept ${out.length}`, ...Object.entries(drop).map(([r, ws]) => `dropped ${ws.length}: ${r}\n  ${ws.slice(0, 40).join(' ')}`)].join('\n')
writeFileSync(resolve(OUT, 'REPORT.txt'), report + '\n')
console.log(report)
