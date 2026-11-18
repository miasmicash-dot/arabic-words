// Builds verified word packs (src/data/packs/pack-NN.json) from published, openly licensed sources. No AI is used:
// every step below is a fixed rule, and the same inputs always give the same packs.
//
// Sources (download them into one folder):
//   kelly       Kelly Project Arabic list, Univ. of Leeds (CC BY-NC-SA)      https://ssharoff.github.io/kelly/ar_m3.xls
//               -> which words are common, in frequency order.
//   wikt-ar     English Wiktionary, Arabic entries, via kaikki.org (CC BY-SA)
//               https://kaikki.org/dictionary/Arabic/kaikki.org-dictionary-Arabic.jsonl          -> kaikki.jsonl
//               -> spelling with vowels, meanings, romanisation, present-tense table.
//   wikt-en     English Wiktionary translation tables, Arabic lines (CC BY-SA)
//               https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl, filtered -> en-ar.jsonl
//               -> the meaning confirmed from the English side.
//   awn         Arabic WordNet v2 via Open Multilingual Wordnet (CC BY-SA 3.0)                     -> wn-arb.tab
//               with Princeton WordNet 3.0 (WordNet licence)                                       -> wn30/dict/data.*
//   buckwalter  Buckwalter Arabic Morphological Analyzer 1.0 lexicon, (c) 2002 QAMUS LLC / UPenn (GPL) -> dictStems
//
// A word is kept only when:
//   1. its meaning (from wikt-ar) is confirmed by at least one independent source (wikt-en, awn or buckwalter),
//      matched by the same English word or a WordNet synonym; only confirmed meanings are shown;
//   2. its spelling is found in buckwalter or awn;
//   3. the consonants of the transliteration match the consonants of the Arabic spelling;
//   4. verbs: all five present-tense forms exist and the "he" form matches a buckwalter present-tense stem.
//
// Usage: node scripts/build-words.mjs <source folder> [minWords=2000] [packSize=50] [maxTotalWithBuiltIn=3000]
import { createReadStream, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(process.argv[2] ?? '.')
const MIN = +(process.argv[3] ?? 2000)
/** total words wanted in the app, built-in words included (the most common words are kept) */
const MAX_TOTAL = +(process.argv[5] ?? 3000)
/** independent sources each meaning needs (besides Wiktionary's Arabic entry) */
const NEED = +(process.argv[6] ?? 2)
const SIZE = +(process.argv[4] ?? 50)
const OUT = resolve(here, '../src/data/packs')

// ---------- Arabic text ----------
const HARAKAT = /[ً-ْٰـ]/g
const bare = (s) => s.replace(HARAKAT, '').trim()
const key = (s) => bare(s).replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
const BW = { "'": 'ء', '|': 'آ', '>': 'أ', '&': 'ؤ', '<': 'إ', '}': 'ئ', A: 'ا', b: 'ب', p: 'ة', t: 'ت', v: 'ث', j: 'ج', H: 'ح', x: 'خ', d: 'د', '*': 'ذ', r: 'ر', z: 'ز', s: 'س', $: 'ش', S: 'ص', D: 'ض', T: 'ط', Z: 'ظ', E: 'ع', g: 'غ', f: 'ف', q: 'ق', k: 'ك', l: 'ل', m: 'م', n: 'ن', h: 'ه', w: 'و', Y: 'ى', y: 'ي', F: 'ً', N: 'ٌ', K: 'ٍ', a: 'َ', u: 'ُ', i: 'ِ', '~': 'ّ', o: 'ْ', '`': 'ٰ', '{': 'ٱ', _: '' }
const fromBW = (s) => [...s].map((c) => BW[c] ?? '').join('')

// consonant skeleton, to check a transliteration against the Arabic (w, y, glottal stops and long vowels ignored)
const AR_CONS = { ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h' }
const squash = (s) => s.replace(/(.)\1+/g, '$1')
const skelAr = (ar) => squash([...bare(ar)].map((c) => AR_CONS[c] ?? '').join(''))
const skelLat = (t) => squash(t.replace(/[aeiouwy' -]/g, ''))

/** Consonants agree; a final -h/-t for ة and a final -n for tanween are allowed. */
function skelMatch(t, ar) {
  const a = skelAr(ar)
  let l = skelLat(t)
  if (l === a) return true
  const b = bare(ar)
  if (/[ىيا]$|[ًٌٍ]$/.test(ar) || /[ىي]$/.test(b)) if (l.endsWith('n') && l.slice(0, -1) === a) return true
  if (b.endsWith('ة')) { l = l.replace(/[ht]$/, ''); if (l === a || (l.endsWith('n') && l.slice(0, -1) === a)) return true }
  return false
}

// Wiktionary romanisation -> the app's plain style (maa'a, kitaab...)
const ROMAN = [
  [/ā/g, 'aa'], [/ī/g, 'ii'], [/ū/g, 'uu'], [/ē/g, 'ee'], [/ō/g, 'oo'],
  [/ṯ/g, 'th'], [/ḏ/g, 'dh'], [/ḵ|ḫ|x/g, 'kh'], [/š/g, 'sh'], [/ḡ|ğ|ġ/g, 'gh'],
  [/ḥ/g, 'h'], [/ṣ/g, 's'], [/ḍ/g, 'd'], [/ṭ/g, 't'], [/ẓ|ḏ̣/g, 'z'], [/ž|j/g, 'j'],
  [/ʕ|ʿ/g, '`'], [/ʔ|ʾ/g, "'"], [/̣|̱|̄/g, ''],
]
function translit(r) {
  let s = r.normalize('NFC').toLowerCase()
  for (const [a, b] of ROMAN) s = s.replace(a, b)
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  s = s.replace(/^'/, '').replace(/ '/g, ' ').replace(/`/g, "'")
  return /^[a-z' -]+$/.test(s) ? s : ''
}

// ---------- English ----------
const STOP = new Set(['a', 'an', 'the', 'to', 'be', 'of', 'one', "one's", 'something', 'someone', 'somebody', 'oneself', 'etc'])
/** "to write (a letter)" -> "write"; lower case, no brackets or articles. */
function norm(t) {
  const ws = t.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/[^a-z' -]/g, ' ').split(/\s+/).filter(Boolean)
  while (ws.length && STOP.has(ws[0])) ws.shift()
  while (ws.length && STOP.has(ws[ws.length - 1])) ws.pop()
  return ws.join(' ')
}
const terms = (gloss) => gloss.split(/[;,/]| or /).map(norm).filter((t) => t && t.split(' ').length <= 4)

// ---------- Princeton WordNet 3.0 + Arabic WordNet ----------
const WNPOS = { noun: ['n'], verb: ['v'], adj: ['a'] }
const synWords = new Map() // "n:13983515" -> ["dark", "darkness"]
const wordSyn = new Map() // "n:dark" -> ["n:13983515", ...]
for (const [file, p] of [['data.noun', 'n'], ['data.verb', 'v'], ['data.adj', 'a']]) {
  for (const line of readFileSync(resolve(SRC, 'wn30/dict', file), 'utf8').split('\n')) {
    if (!line || line.startsWith(' ')) continue
    const f = line.split(' ')
    const n = parseInt(f[3], 16)
    const ws = []
    for (let i = 0; i < n; i++) ws.push(f[4 + i * 2].replace(/\(.*\)$/, '').replace(/_/g, ' ').toLowerCase())
    const id = `${p}:${f[0]}`
    synWords.set(id, ws)
    for (const w of ws) (wordSyn.get(`${p}:${w}`) ?? wordSyn.set(`${p}:${w}`, []).get(`${p}:${w}`)).push(id)
  }
}
const awn = new Map() // arabic key -> Set of english words
for (const line of readFileSync(resolve(SRC, 'wn-arb.tab'), 'utf8').split('\n')) {
  const [sid, rel, lemma] = line.split('\t')
  if (rel !== 'arb:lemma' || !lemma) continue
  const [off, p] = sid.split('-')
  const ws = synWords.get(`${p === 's' ? 'a' : p}:${off}`)
  if (!ws) continue
  const k = key(lemma)
  const set = awn.get(k) ?? awn.set(k, new Set()).get(k)
  ws.forEach((w) => set.add(w))
}
/** WordNet synonyms of an English term for this part of speech (including itself). */
function synonyms(t, pos) {
  const out = new Set([t])
  for (const p of WNPOS[pos]) for (const id of wordSyn.get(`${p}:${t}`) ?? []) synWords.get(id).forEach((w) => out.add(w))
  return out
}

// ---------- Buckwalter lexicon ----------
const bwGloss = new Map() // arabic key of a stem -> Set of english terms
const bwIV = new Map() // arabic key of a past-tense stem -> Set of present-tense stem keys (same lemma)
{
  let lemma = []
  const flush = () => {
    const pv = lemma.filter((e) => e.cat.startsWith('PV')).map((e) => e.k)
    const iv = lemma.filter((e) => e.cat.startsWith('IV')).map((e) => e.k)
    for (const p of pv) iv.forEach((i) => (bwIV.get(p) ?? bwIV.set(p, new Set()).get(p)).add(i))
    lemma = []
  }
  for (const line of readFileSync(resolve(SRC, 'dictStems'), 'latin1').split('\n')) {
    if (line.startsWith(';; ')) { flush(); continue }
    if (line.startsWith(';')) continue
    const [unvoc, , cat, glossRaw] = line.split('\t')
    if (!unvoc || !cat || cat === 'Nprop') continue
    const k = key(fromBW(unvoc))
    const gloss = (glossRaw ?? '').replace(/<pos>.*<\/pos>/, '').trim()
    const set = bwGloss.get(k) ?? bwGloss.set(k, new Set()).get(k)
    terms(gloss).forEach((t) => set.add(t))
    lemma.push({ k, cat })
  }
  flush()
}
const bwLookup = (k) => bwGloss.get(k) ?? (k.endsWith('ة') ? bwGloss.get(k.slice(0, -1)) : undefined)

// ---------- English -> Arabic translation tables ----------
const enAr = new Map() // arabic key -> Set of english words
if (existsSync(resolve(SRC, 'en-ar.jsonl'))) {
  for await (const line of createInterface({ input: createReadStream(resolve(SRC, 'en-ar.jsonl')), crlfDelay: Infinity })) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    const en = norm(e.en)
    if (!en) continue
    for (const t of e.tr) {
      const k = key(t.w)
      ;(enAr.get(k) ?? enAr.set(k, new Set()).get(k)).add(en)
    }
  }
} else console.warn('en-ar.jsonl missing: the English-side check is skipped')

/** Which independent sources confirm English term t for Arabic key k. */
function confirm(t, k, pos) {
  const syn = synonyms(t, pos)
  const hit = (set) => !!set && [...syn].some((s) => set.has(s))
  const out = []
  if (hit(enAr.get(k))) out.push('wiktionary-en')
  if (hit(awn.get(k))) out.push('arabic-wordnet')
  if (hit(bwLookup(k))) out.push('buckwalter')
  return out
}

// ---------- Kelly ----------
const POS = { 'اسم': 'noun', 'فعل': 'verb', 'صفة': 'adj' }
const wb = XLSX.read(readFileSync(resolve(SRC, 'ar_m3.xls')), { type: 'buffer' })
const kelly = XLSX.utils.sheet_to_json(wb.Sheets.Arabic, { header: 1 })
  .slice(1)
  .map((r) => ({ word: String(r[3] || r[4] || '').trim(), pos: POS[String(r[2] ?? '').trim()], cefr: r[5], freq: +r[6] || 0, id: r[7] }))
  .filter((r) => r.word && r.pos && !/\s/.test(r.word))
  .sort((a, b) => b.freq - a.freq || String(a.word).localeCompare(String(b.word)))

// ---------- Wiktionary Arabic entries ----------
const BAD_SENSE = new Set(['obsolete', 'archaic', 'rare', 'dialectal', 'colloquial', 'slang', 'vulgar', 'proscribed', 'nonstandard', 'historical', 'uncommon', 'poetic', 'dated', 'form-of', 'alt-of', 'no-gloss'])
const FUNCTION = new Set(['prep', 'particle', 'conj', 'pron', 'det', 'adv', 'intj', 'postp', 'num', 'name'])
const wanted = new Set(kelly.map((k) => key(k.word)))
const seed = JSON.parse(readFileSync(resolve(here, '../src/data/seed.json'), 'utf8'))
const little = new Set()
const wik = new Map()
for await (const line of createInterface({ input: createReadStream(resolve(SRC, 'kaikki.jsonl')), crlfDelay: Infinity })) {
  if (![...line.matchAll(/"word": "([^"]+)"/g)].some((m) => wanted.has(key(m[1])))) continue
  const e = JSON.parse(line)
  if (e.lang_code !== 'ar' || !wanted.has(key(e.word))) continue
  if (FUNCTION.has(e.pos)) { little.add(key(e.word)); continue }
  if (!['noun', 'verb', 'adj'].includes(e.pos)) continue
  const k = `${key(e.word)}|${e.pos}`
  ;(wik.get(k) ?? wik.set(k, []).get(k)).push(e)
}

const PRON = { I: ['first-person', 'singular'], he: ['third-person', 'singular', 'masculine'], she: ['third-person', 'singular', 'feminine'], we: ['first-person', 'plural'], they: ['third-person', 'plural', 'masculine'] }
const PRON_AR = { I: 'أنا', he: 'هو', she: 'هي', we: 'نحن', they: 'هم' }
function conjugations(e) {
  const forms = (e.forms ?? []).filter((f) => { const t = f.tags ?? []; return t.includes('active') && t.includes('indicative') && t.includes('non-past') })
  const out = {}
  for (const [p, need] of Object.entries(PRON)) {
    const f = forms.find((x) => need.every((t) => x.tags.includes(t)))
    if (!f) return null
    out[p] = bare(f.form)
  }
  return out
}

/** Make a verified word from one Wiktionary entry: [word] or [null, reason]. */
function build(e, k, pos) {
  const canon = e.forms?.find((f) => f.tags?.includes('canonical'))?.form ?? e.word
  if (!bwLookup(k) && !awn.has(k)) return [null, 'spelling not found in Buckwalter or Arabic WordNet']
  const roman = e.forms?.find((f) => f.tags?.includes('romanization'))?.form ?? ''
  const t0 = translit(roman)
  if (!t0) return [null, 'no romanisation']
  if (!skelMatch(t0, canon)) return [null, 'transliteration does not match the spelling']
  // words ending in a long vowel are written the app's way: mustawaa, not mustawan; thaanii, not thaanin
  const b = bare(canon)
  const t = /[ى]$|ا$/.test(b) ? t0.replace(/an$/, 'aa') : /ي$/.test(b) ? t0.replace(/in$/, 'ii') : t0
  const scored = []
  const seen = new Set()
  e.senses?.forEach((s, si) => {
    if (!s.glosses?.length || (s.tags ?? []).some((x) => BAD_SENSE.has(x)) || s.form_of || s.alt_of) return
    const g = s.glosses[s.glosses.length - 1]
    if (/^(plural|feminine|masculine|singulative|collective|dual|verbal noun|active participle|passive participle|alternative|elative|nisba|diminutive|form|misspelling|abbreviation|used|initialism)\b/i.test(g)) return
    for (const term of terms(g)) {
      if (seen.has(term)) continue
      seen.add(term)
      const by = confirm(term, k, pos)
      if (by.length >= NEED) scored.push({ term, by, si })
    }
  })
  if (!scored.length) return [null, `meaning not confirmed by ${NEED} independent sources`]
  // the best-supported meaning first, then up to two more confirmed meanings from the same or the next sense
  scored.sort((a, b) => b.by.length - a.by.length || a.si - b.si)
  const top = scored[0]
  const shown = [top, ...scored.filter((x) => x !== top && x.si === top.si)].slice(0, pos === 'verb' ? 2 : 3)
  const w = { type: pos, english: shown.map((x) => x.term).join(', '), arabic: [bare(canon)], translit: [t], vocalized: canon, verified: ['kelly', 'wiktionary-ar', ...new Set(shown.flatMap((x) => x.by))] }
  if (pos === 'verb') {
    const c = conjugations(e)
    if (!c) return [null, 'no full present-tense table']
    const he = key(c.he)
    if (![...(bwIV.get(k) ?? [])].some((iv) => he.startsWith('ي' + iv))) return [null, 'present tense does not match Buckwalter']
    w.conjugations = Object.fromEntries(Object.entries(c).map(([p, f]) => [p, `${PRON_AR[p]} ${f}`]))
  }
  return [w]
}

// ---------- build ----------
const have = new Set(seed.flatMap((w) => w.arabic.map(key)))
const haveEn = new Set(seed.map((w) => w.english.toLowerCase()))
const drop = {}
const why = (r, w) => (drop[r] ??= []).push(w)
const out = []
const seen = new Set()
const limit = Math.floor((MAX_TOTAL - seed.length) / SIZE) * SIZE
for (const k of kelly) {
  if (out.length >= limit) break
  const kk = key(k.word)
  if (seen.has(kk + k.pos)) continue
  seen.add(kk + k.pos)
  if (have.has(kk)) { why('already in the app', k.word); continue }
  if (little.has(kk)) { why('also a function word or name', k.word); continue }
  const entries = wik.get(`${kk}|${k.pos}`)
  if (!entries) { why('not in Wiktionary as this part of speech', k.word); continue }
  let made = null
  let reason = ''
  for (const e of entries) {
    const [w, r] = build(e, kk, k.pos)
    if (w) { made = w; break }
    reason ||= r
  }
  if (!made) { why(reason, k.word); continue }
  if (haveEn.has(made.english) || out.some((o) => o.arabic[0] === made.arabic[0])) { why('duplicate', k.word); continue }
  out.push({ id: `k-${k.pos}-${k.id}`, ...made, frequencyRank: out.length + 1, level: k.cefr })
}

// ---------- check the built-in words the same way (report only; her list is never changed silently) ----------
const seedNotes = []
for (const w of seed) {
  if (!['noun', 'verb', 'adj'].includes(w.type)) continue
  const ok = w.arabic.some((a) => terms(w.english).some((t) => confirm(t, key(a), w.type).length))
  if (!ok) {
    const k = key(w.arabic[0])
    const alt = new Set([...(enAr.get(k) ?? []), ...(awn.get(k) ?? []), ...(bwLookup(k) ?? [])])
    seedNotes.push(`${w.english} = ${w.arabic.join(' / ')}  ->  sources say: ${[...alt].slice(0, 6).join(', ') || '(not found)'}`)
  }
}

// ---------- write ----------
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) if (/^pack-\d+\.json$/.test(f)) unlinkSync(resolve(OUT, f))
const packs = Math.floor(out.length / SIZE)
for (let i = 0; i < packs; i++) writeFileSync(resolve(OUT, `pack-${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(out.slice(i * SIZE, (i + 1) * SIZE), null, 1) + '\n')
const count = (s) => out.filter((w) => w.verified.includes(s)).length
const report = [
  `kept ${out.length} verified words in ${packs} packs of ${SIZE} (target ${MIN})${out.length < MIN ? '  << BELOW TARGET' : ''}`,
  `meaning confirmed by: English Wiktionary translations ${count('wiktionary-en')}, Arabic WordNet ${count('arabic-wordnet')}, Buckwalter ${count('buckwalter')}`,
  ...Object.entries(drop).map(([r, ws]) => `dropped ${ws.length}: ${r}\n  e.g. ${ws.slice(0, 25).join(' ')}`),
  '',
  `built-in words whose meaning no source confirms (${seedNotes.length}), please check:`,
  ...seedNotes.map((n) => '  ' + n),
  '',
  'every kept word (frequency order): english = arabic (translit) [confirmed by]',
  ...out.map((w) => `  ${w.english} = ${w.arabic[0]} (${w.translit[0]}) [${w.verified.slice(2).join(', ')}]`),
].join('\n')
writeFileSync(resolve(OUT, 'REPORT.txt'), report + '\n')
console.log(report.split('\n').slice(0, 24).join('\n'))
