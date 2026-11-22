// Checks a typed answer against a word, says whether it was right, shows the spelling fix, and turns it into a score.
// Everything here is pure (no DOM, no database) so it can be tested on its own.
import type { Direction, Word } from './db'

export type MatchKind = 'exact' | 'typo' | 'wrong'
export type Grade = 1 | 2 | 3 | 4

/** One letter of a diff. On the typed side: same | wrong | extra. On the correct side: same | wrong | missing. */
export interface DiffPart {
  ch: string
  op: 'same' | 'wrong' | 'missing' | 'extra'
}

export interface CheckResult {
  kind: MatchKind
  /** what she typed, trimmed */
  typed: string
  /** the closest correct form, as it should be written */
  expected: string
  /** which kind of answer was compared: English, Arabic script or Arabic written in Latin letters */
  script: 'en' | 'ar' | 'latin'
  typedDiff: DiffPart[]
  expectedDiff: DiffPart[]
}

// ---------- shared helpers ----------

/** How many slips are forgiven for an answer of this many letters. */
export function allowedTypos(letters: number): number {
  if (letters <= 3) return 0
  if (letters <= 7) return 1
  return 2
}

const letterCount = (s: string) => s.replace(/\s/g, '').length
const squeeze = (s: string) => s.replace(/(.)\1+/g, '$1')

/** Damerau-Levenshtein distance (optimal string alignment): insert, delete, swap a letter, or swap two neighbours. */
export function editDistance(a: string, b: string, eq: (x: string, y: string) => boolean = (x, y) => x === y): number {
  const A = [...a]
  const B = [...b]
  const d = table(A, B, eq)
  return d[A.length][B.length]
}

function table(A: string[], B: string[], eq: (x: string, y: string) => boolean): number[][] {
  const d: number[][] = Array.from({ length: A.length + 1 }, (_, i) => {
    const row = new Array<number>(B.length + 1).fill(0)
    row[0] = i
    return row
  })
  for (let j = 0; j <= B.length; j++) d[0][j] = j
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      const cost = eq(A[i - 1], B[j - 1]) ? 0 : 1
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && eq(A[i - 1], B[j - 2]) && eq(A[i - 2], B[j - 1]) && cost) v = Math.min(v, d[i - 2][j - 2] + 1)
      d[i][j] = v
    }
  }
  return d
}

/** Letter-by-letter comparison of what was typed against the correct form, for highlighting. */
export function letterDiff(
  typed: string,
  expected: string,
  eq: (x: string, y: string) => boolean = (x, y) => x.toLowerCase() === y.toLowerCase(),
): { typed: DiffPart[]; expected: DiffPart[] } {
  const A = [...typed]
  const B = [...expected]
  const d = table(A, B, eq)
  const ta: DiffPart[] = []
  const tb: DiffPart[] = []
  let i = A.length
  let j = B.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && eq(A[i - 1], B[j - 1]) && d[i][j] === d[i - 1][j - 1]) {
      ta.push({ ch: A[i - 1], op: 'same' })
      tb.push({ ch: B[j - 1], op: 'same' })
      i--
      j--
    } else if (i > 1 && j > 1 && eq(A[i - 1], B[j - 2]) && eq(A[i - 2], B[j - 1]) && d[i][j] === d[i - 2][j - 2] + 1) {
      // two neighbours swapped
      ta.push({ ch: A[i - 1], op: 'wrong' }, { ch: A[i - 2], op: 'wrong' })
      tb.push({ ch: B[j - 1], op: 'wrong' }, { ch: B[j - 2], op: 'wrong' })
      i -= 2
      j -= 2
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      ta.push({ ch: A[i - 1], op: 'wrong' })
      tb.push({ ch: B[j - 1], op: 'wrong' })
      i--
      j--
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ta.push({ ch: A[i - 1], op: 'extra' })
      i--
    } else {
      tb.push({ ch: B[j - 1], op: 'missing' })
      j--
    }
  }
  return { typed: ta.reverse(), expected: tb.reverse() }
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036F]/g, '')

// ---------- English ----------

const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']

/** Lowercase, no accents or apostrophes, punctuation to spaces, single spaces, no leading "to", "a", "an", "the". */
export function normEnglish(s: string): string {
  let t = stripAccents(s.toLowerCase())
    .replace(/['’‘`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const m = t.match(/^(to|a|an|the) (.+)$/)
  if (m) t = m[2]
  return t
}

/** Splits on , ; / outside brackets. */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
    if (depth === 0 && (ch === ',' || ch === ';' || ch === '/')) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}

/** Each bracket is optional: "apple(s)" gives "apple" and "apples", "(finger)nail" gives "nail" and "fingernail". */
function expandBrackets(s: string): string[] {
  const m = s.match(/[([]([^)\]]*)[)\]]/)
  if (!m || m.index === undefined) return [s.replace(/\s+/g, ' ').trim()]
  const before = s.slice(0, m.index)
  const after = s.slice(m.index + m[0].length)
  return [...expandBrackets(before + after), ...expandBrackets(before + m[1] + after)]
}

/** Every accepted English answer, written for display (brackets removed), first one is the main answer. */
export function englishAnswers(english: string): string[] {
  const out: string[] = []
  const add = (x: string) => {
    const t = x.replace(/\s+/g, ' ').replace(/\s+([?!.,])/g, '$1').trim()
    if (t && !out.some((o) => normEnglish(o) === normEnglish(t))) out.push(t)
  }
  for (const part of splitTop(english)) for (const v of expandBrackets(part)) add(v)
  // the whole line also counts, e.g. "walk, gait"
  add(english.replace(/[([][^)\]]*[)\]]/g, ''))
  // numbers: "1" also accepts "one" and the other way round
  for (const o of [...out]) {
    const n = normEnglish(o)
    if (/^\d+$/.test(n) && NUMBERS[+n]) add(NUMBERS[+n])
    const k = NUMBERS.indexOf(n)
    if (k >= 0) add(String(k))
  }
  return out
}

function best(
  typedNorm: string,
  candidates: { norm: string; display: string }[],
): { kind: MatchKind; display: string } {
  let closest = candidates[0]
  let closestD = Infinity
  for (const c of candidates) {
    if (!c.norm) continue
    if (c.norm === typedNorm) return { kind: 'exact', display: c.display }
    // a doubled or undoubled letter (lott / lot, sumer / summer) is a slip even in short words
    if (typedNorm && squeeze(c.norm) === squeeze(typedNorm)) return { kind: 'typo', display: c.display }
    const d = editDistance(typedNorm, c.norm)
    // prefer the closest candidate relative to what it allows
    if (d - allowedTypos(letterCount(c.norm)) < closestD - allowedTypos(letterCount(closest.norm))) {
      closest = c
      closestD = d
    }
  }
  const ok = typedNorm.length > 0 && closestD <= allowedTypos(letterCount(closest.norm))
  return { kind: ok ? 'typo' : 'wrong', display: closest.display }
}

export function checkEnglish(typed: string, english: string): CheckResult {
  const t = typed.trim()
  const n = normEnglish(t)
  const cands = englishAnswers(english).map((display) => ({ norm: normEnglish(display), display }))
  const r = best(n, cands)
  // compare as written, dropping a leading "to"/"a"/"the" only when one side has it and the other doesn't
  const art = /^(to|a|an|the)\s+/
  let a = t.toLowerCase().replace(/\s+/g, ' ')
  let b = r.display.toLowerCase()
  if (art.test(a) !== art.test(b)) {
    a = a.replace(art, '')
    b = b.replace(art, '')
  }
  const diff = letterDiff(a, b)
  return { kind: r.kind, typed: t, expected: r.display, script: 'en', typedDiff: diff.typed, expectedDiff: diff.expected }
}

// ---------- Arabic ----------

const HARAKAT = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g
const ARABIC_LETTER = /[ء-يٱ-ۓ]/

export const hasArabic = (s: string) => ARABIC_LETTER.test(s)

/** Removes vowel marks and the stretching line, keeps letters as written. */
export function stripHarakat(s: string): string {
  return s.normalize('NFC').replace(HARAKAT, '')
}

/** One letter in its strict form: all alef shapes become plain alef, Persian keyboard letters become Arabic. */
function strictChar(c: string): string {
  switch (c) {
    case 'أ': case 'إ': case 'آ': case 'ٱ': case 'ٲ': case 'ٳ': return 'ا'
    case 'ی': case 'ې': return 'ي'
    case 'ک': return 'ك'
    case 'ہ': case 'ە': return 'ه'
    default: return c
  }
}
/** Small slips that still count as right: ى/ي, ة/ه, and the hamza seats ؤ ئ ء. */
function looseChar(c: string): string {
  const s = strictChar(c)
  if (s === 'ى') return 'ي'
  if (s === 'ة') return 'ه'
  if (s === 'ؤ' || s === 'ئ') return 'ء'
  return s
}

/** Arabic with no vowel marks, punctuation or extra spaces, and one alef shape. Equal strings here count as exact. */
export function normArabic(s: string): string {
  return [...stripHarakat(s).replace(/[؟،؛?!.,:;"'«»()-]/g, ' ').replace(/\s+/g, ' ').trim()].map(strictChar).join('')
}
export function looseArabic(s: string): string {
  return [...normArabic(s)].map(looseChar).join('')
}
const arEq = (a: string, b: string) => strictChar(a) === strictChar(b)

/** Latin spelling of Arabic, made forgiving: lowercase, no accents, apostrophes, spaces or hyphens, e→i, o→u, no doubled letters. */
export function normTranslit(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/([aeiou])h\b/g, '$1') // a final "h" after a vowel is usually silent: asharah = ashara
    .replace(/7/g, 'h')
    .replace(/5/g, 'kh')
    .replace(/[23]/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/e/g, 'i')
    .replace(/o/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/iy(?![aiu])/g, 'i') // arabiyy = arabi
    .replace(/uw(?![aiu])/g, 'u')
}

const ROMAN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ٱ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
  'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'dh', 'ع': '', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'ة': 'a', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ء': '', 'ؤ': '', 'ئ': '',
  '\u064E': 'a', '\u0650': 'i', '\u064F': 'u', '\u0652': '', '\u0651': '', '\u064B': '', '\u064C': '', '\u064D': 'in', '\u0670': 'a', ' ': ' ',
}
/** A rough Latin spelling made from the Arabic (best from the vowelled form), used when a word has no transliteration. */
export function romanize(arabic: string): string {
  const cs = [...arabic.normalize('NFC')]
  const VOWEL = /[\u064E\u0650\u064F\u0651]/
  let out = ''
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i]
    const prev = cs[i - 1] ?? ' '
    const next = cs[i + 1] ?? ' '
    if ((c === 'أ' || c === 'إ' || (c === 'ا' && prev === ' ')) && VOWEL.test(next)) continue // an alef that only carries a vowel
    if (c === 'و' && !VOWEL.test(next) && prev === '\u064F') { out += 'u'; continue }
    if (c === 'ي' && !VOWEL.test(next) && prev === '\u0650') { out += 'i'; continue }
    if (c === 'ة') { out += prev === 'ا' ? 'h' : 'a'; continue }
    if (c === 'ظ') { out += 'z'; continue }
    out += ROMAN[c] ?? ''
  }
  return out.trim()
}

export function checkArabic(typed: string, word: Pick<Word, 'arabic' | 'translit' | 'vocalized'>): CheckResult {
  const t = typed.trim()
  if (hasArabic(t) || !/[a-z0-9]/i.test(t)) {
    const n = normArabic(t)
    const forms = [...word.arabic, ...(word.vocalized ? [word.vocalized] : [])]
    let kind: MatchKind = 'wrong'
    let display = stripHarakat(word.arabic[0] ?? '')
    let score = Infinity
    for (const f of forms) {
      const target = normArabic(f)
      if (!target) continue
      if (n === target) {
        kind = 'exact'
        display = stripHarakat(f)
        break
      }
      const lt = looseArabic(f)
      const d = editDistance(looseArabic(t), lt)
      const slack = d - allowedTypos(letterCount(lt))
      if (slack < score) {
        score = slack
        display = stripHarakat(f)
        kind = n && slack <= 0 ? 'typo' : 'wrong'
      }
    }
    const diff = letterDiff(stripHarakat(t).replace(/\s+/g, ' '), display, arEq)
    return { kind, typed: t, expected: display, script: 'ar', typedDiff: diff.typed, expectedDiff: diff.expected }
  }
  // Latin letters: compare with the transliterations, or with a spelling made from the Arabic
  const cands = [...word.translit, ...(word.vocalized ? [romanize(word.vocalized)] : [])]
    .filter(Boolean)
    .map((display) => ({ norm: normTranslit(display), display }))
  if (!cands.length) {
    // no Latin spelling and no vowels to make one: compare the consonants only (vowels and w/y are guesses)
    const arabic = stripHarakat(word.arabic[0] ?? '')
    const bones = (s: string) => normTranslit(s).replace(/[aiuwy]/g, '').replace(/(.)\1+/g, '$1')
    const r = best(bones(t), word.arabic.map((a) => ({ norm: bones(romanize(a)), display: stripHarakat(a) })))
    const op = r.kind === 'wrong' ? ('extra' as const) : ('same' as const)
    return { kind: r.kind, typed: t, expected: r.kind === 'wrong' ? arabic : r.display, script: 'latin', typedDiff: [...t].map((ch) => ({ ch, op })), expectedDiff: [] }
  }
  const r = best(normTranslit(t), cands)
  const diff = letterDiff(t.toLowerCase(), r.display.toLowerCase())
  return { kind: r.kind, typed: t, expected: r.display, script: 'latin', typedDiff: diff.typed, expectedDiff: diff.expected }
}

// ---------- the whole check ----------

/** ar-en: she sees Arabic and types English. en-ar: she sees English and types Arabic (script or Latin letters). */
export function checkAnswer(word: Word, direction: Direction, typed: string): CheckResult {
  return direction === 'ar-en' ? checkEnglish(typed, word.english) : checkArabic(typed, word)
}

/** Under this many milliseconds an exact answer counts as quick. Arabic takes longer to type. */
export function quickMs(direction: Direction): number {
  return direction === 'ar-en' ? 6000 : 9000
}

export interface GradeInput {
  kind: MatchKind
  hinted: boolean
  ms: number
  direction: Direction
  /** she saw the answer moments ago on the "Meet the word" card, so speed says little */
  justMet?: boolean
}

/** wrong → 1, right with a fix or a hint → 2, exact → 3, exact and quick → 4. */
export function grade({ kind, hinted, ms, direction, justMet }: GradeInput): Grade {
  if (kind === 'wrong') return 1
  if (kind === 'typo' || hinted) return 2
  if (!justMet && ms < quickMs(direction)) return 4
  return 3
}

/** One line in plain English saying why this score was given. */
export function reason(g: Grade, r: Pick<GradeInput, 'kind' | 'hinted' | 'justMet'> & { skipped?: boolean; overridden?: boolean }): string {
  if (r.overridden) return 'Marked right by you. It will come back in a while.'
  if (g === 1) return r.skipped ? 'No worries. It will come back soon so you can try again.' : 'Not quite. It will come back soon so you can try again.'
  if (g === 2) {
    if (r.kind === 'typo' && r.hinted) return 'Right, with a hint and a small spelling fix. It will come back a bit sooner.'
    if (r.kind === 'typo') return 'Right, with a small spelling fix. It will come back a bit sooner.'
    return 'Right, with a hint. It will come back a bit sooner.'
  }
  if (g === 4) return 'Right, and quick. It will come back much later.'
  return r.justMet ? 'Right on your first try. A lovely start.' : 'Right. It will come back in a while.'
}

// ---------- hints ----------

/** The answer the hint spells out: English for ar-en, otherwise Arabic, or the transliteration if she is typing Latin letters. */
export function hintTarget(word: Word, direction: Direction, typed: string): string {
  if (direction === 'ar-en') return englishAnswers(word.english)[0] ?? word.english
  const latin = word.translit[0] ?? (word.vocalized ? romanize(word.vocalized) : '')
  if (latin && typed.trim() && !hasArabic(typed) && /[a-z]/i.test(typed)) return latin
  return stripHarakat(word.arabic[0] ?? '')
}

/** Keeps the right start of what she typed and adds the next correct letter. */
export function hintNext(typed: string, target: string): string {
  const T = [...target]
  const A = [...typed]
  const eq = hasArabic(target) ? arEq : (x: string, y: string) => x.toLowerCase() === y.toLowerCase()
  let k = 0
  while (k < A.length && k < T.length && eq(A[k], T[k])) k++
  let end = Math.min(T.length, k + 1)
  // don't stop on a space: give the next real letter too
  while (end < T.length && T[end - 1] === ' ') end++
  return T.slice(0, end).join('')
}
