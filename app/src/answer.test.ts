import { describe, expect, it } from 'vitest'
import {
  allowedTypos,
  checkAnswer,
  checkArabic,
  checkEnglish,
  editDistance,
  englishAnswers,
  grade,
  hintNext,
  hintTarget,
  letterDiff,
  normArabic,
  normEnglish,
  reason,
} from './answer'
import type { Word } from './db'

const w = (p: Partial<Word>): Word => ({ id: 'x', type: 'noun', english: '', arabic: [], translit: [], ...p })

describe('editDistance', () => {
  it('counts inserts, deletes, changes and swaps', () => {
    expect(editDistance('house', 'house')).toBe(0)
    expect(editDistance('hose', 'house')).toBe(1)
    expect(editDistance('housse', 'house')).toBe(1)
    expect(editDistance('hoose', 'house')).toBe(1)
    expect(editDistance('huose', 'house')).toBe(1) // swapped neighbours count once
    expect(editDistance('', 'abc')).toBe(3)
  })
  it('allows more slips for longer words', () => {
    expect(allowedTypos(3)).toBe(0)
    expect(allowedTypos(4)).toBe(1)
    expect(allowedTypos(7)).toBe(1)
    expect(allowedTypos(8)).toBe(2)
  })
})

describe('English answers', () => {
  it('splits alternatives and opens brackets', () => {
    expect(englishAnswers('walk, gait')).toEqual(['walk', 'gait', 'walk, gait'])
    expect(englishAnswers('hot/ spicy')).toContain('spicy')
    expect(englishAnswers('apple(s)')).toEqual(['apple', 'apples'])
    expect(englishAnswers('(finger)nail')).toEqual(['nail', 'fingernail'])
    expect(englishAnswers('chest (body)')).toContain('chest')
    expect(englishAnswers('cup; mug')).toEqual(['cup', 'mug', 'cup; mug'])
    expect(englishAnswers('1')).toContain('one')
  })
  it('normalises case, punctuation, spaces and leading little words', () => {
    expect(normEnglish('  To  Eat! ')).toBe('eat')
    expect(normEnglish('The Book')).toBe('book')
    expect(normEnglish("What's your name?")).toBe('whats your name')
    expect(normEnglish('café')).toBe('cafe')
    expect(normEnglish('to')).toBe('to')
  })
  it('marks exact, typo and wrong', () => {
    expect(checkEnglish('eat', 'eat').kind).toBe('exact')
    expect(checkEnglish('to eat', 'eat').kind).toBe('exact')
    expect(checkEnglish('Gait', 'walk, gait').kind).toBe('exact')
    expect(checkEnglish('walk, gait', 'walk, gait').kind).toBe('exact')
    expect(checkEnglish('fingernail', '(finger)nail').kind).toBe('exact')
    expect(checkEnglish('whats your name', 'whats your name?').kind).toBe('exact')
    expect(checkEnglish("what's your name", 'whats your name?').kind).toBe('exact')
    expect(checkEnglish('one', '1').kind).toBe('exact')
    expect(checkEnglish('conclusoin', 'end, conclusion').kind).toBe('typo')
    expect(checkEnglish('conclusoin', 'end, conclusion').expected).toBe('conclusion')
    expect(checkEnglish('hosue', 'house').kind).toBe('typo')
    expect(checkEnglish('ate', 'eat').kind).toBe('wrong') // 3 letters: no slips
    expect(checkEnglish('dog', 'cat').kind).toBe('wrong')
    expect(checkEnglish('', 'cat').kind).toBe('wrong')
    expect(checkEnglish('commandr', 'commander').kind).toBe('typo')
    expect(checkEnglish('comandr', 'commander').kind).toBe('typo') // 9 letters: two slips
    expect(checkEnglish('cmandr', 'commander').kind).toBe('wrong')
  })
})

describe('Arabic answers', () => {
  const water = w({ arabic: ['ماء'], translit: ["maa'a"] })
  const school = w({ arabic: ['مدرسة'], translit: ['madrasa'], vocalized: 'م\u064Eد\u0652ر\u064Eس\u064Eة' })
  it('normalises vowel marks, stretching and alef shapes', () => {
    expect(normArabic('م\u064Eد\u0652ر\u064Eس\u064Eة')).toBe('مدرسة')
    expect(normArabic('م\u0640درسة')).toBe('مدرسة')
    expect(normArabic('أكل')).toBe('اكل')
    expect(normArabic('إنسان')).toBe(normArabic('انسان'))
    expect(normArabic('آخر')).toBe('اخر')
    expect(normArabic('ما اسمك؟')).toBe('ما اسمك')
  })
  it('counts the same letters without vowel marks as exact', () => {
    expect(checkArabic('مدرسة', school).kind).toBe('exact')
    expect(checkArabic('م\u064Eد\u0652ر\u064Eس\u064Eة', school).kind).toBe('exact')
    expect(checkArabic('ماء', water).kind).toBe('exact')
    expect(checkArabic('انسان', w({ arabic: ['إنسان'] })).kind).toBe('exact')
    expect(checkArabic('ما اسمك', w({ arabic: ['ما اسمك؟'] })).kind).toBe('exact')
  })
  it('treats ة/ه, ى/ي and hamza seats as small slips', () => {
    expect(checkArabic('مدرسه', school).kind).toBe('typo')
    expect(checkArabic('علي', w({ arabic: ['على'] })).kind).toBe('typo')
    expect(checkArabic('سؤال', w({ arabic: ['سءال'] })).kind).toBe('typo')
    expect(checkArabic('مسئول', w({ arabic: ['مسؤول'] })).kind).toBe('typo')
  })
  it('forgives a missing letter in a longer word but not a different word', () => {
    expect(checkArabic('مدرس', school).kind).toBe('typo')
    expect(checkArabic('بيت', w({ arabic: ['بنت'] })).kind).toBe('wrong')
    expect(checkArabic('كتاب', school).kind).toBe('wrong')
    expect(checkArabic('', school).kind).toBe('wrong')
  })
  it('checks every Arabic form', () => {
    const r = checkArabic('تفاح', w({ arabic: ['تفاحة', 'تفاح'] }))
    expect(r.kind).toBe('exact')
    expect(r.expected).toBe('تفاح')
  })
  it('only accepts Arabic letters', () => {
    expect(checkArabic('madrasa', school).kind).toBe('wrong')
    expect(checkArabic('maa', water).kind).toBe('wrong')
  })
})

describe('letterDiff', () => {
  it('marks wrong, missing and extra letters', () => {
    const d = letterDiff('hose', 'house')
    expect(d.typed.every((p) => p.op === 'same')).toBe(true)
    expect(d.expected.filter((p) => p.op === 'missing').map((p) => p.ch)).toEqual(['u'])
    const e = letterDiff('housse', 'house')
    expect(e.typed.filter((p) => p.op === 'extra')).toHaveLength(1)
    const s = letterDiff('hoise', 'house')
    expect(s.typed.find((p) => p.op === 'wrong')?.ch).toBe('i')
    expect(s.expected.find((p) => p.op === 'wrong')?.ch).toBe('u')
    expect(letterDiff('huose', 'house').typed.filter((p) => p.op === 'wrong')).toHaveLength(2)
  })
  it('rebuilds both strings', () => {
    const d = letterDiff('cmandr', 'commander')
    expect(d.typed.map((p) => p.ch).join('')).toBe('cmandr')
    expect(d.expected.map((p) => p.ch).join('')).toBe('commander')
  })
  it('is used for Arabic with alef shapes counted as the same letter', () => {
    const r = checkArabic('اكل', w({ arabic: ['أكل'] }))
    expect(r.typedDiff.every((p) => p.op === 'same')).toBe(true)
    const t = checkArabic('مدرسه', w({ arabic: ['مدرسة'] }))
    expect(t.expectedDiff.at(-1)).toEqual({ ch: 'ة', op: 'wrong' })
  })
})

describe('checkAnswer', () => {
  const word = w({ english: 'school', arabic: ['مدرسة'], translit: ['madrasa'] })
  it('uses the direction', () => {
    expect(checkAnswer(word, 'ar-en', 'school').kind).toBe('exact')
    expect(checkAnswer(word, 'en-ar', 'مدرسة').kind).toBe('exact')
    expect(checkAnswer(word, 'en-ar', 'school').kind).toBe('wrong')
  })
})

describe('grade', () => {
  it('turns a result into a score', () => {
    expect(grade({ kind: 'wrong', hinted: false, ms: 1000, direction: 'ar-en' })).toBe(1)
    expect(grade({ kind: 'typo', hinted: false, ms: 1000, direction: 'ar-en' })).toBe(2)
    expect(grade({ kind: 'exact', hinted: true, ms: 1000, direction: 'ar-en' })).toBe(2)
    expect(grade({ kind: 'exact', hinted: false, ms: 8000, direction: 'ar-en' })).toBe(3)
    expect(grade({ kind: 'exact', hinted: false, ms: 5000, direction: 'ar-en' })).toBe(4)
    expect(grade({ kind: 'exact', hinted: false, ms: 8000, direction: 'en-ar' })).toBe(4)
    expect(grade({ kind: 'exact', hinted: false, ms: 10000, direction: 'en-ar' })).toBe(3)
    expect(grade({ kind: 'exact', hinted: false, ms: 1000, direction: 'en-ar', justMet: true })).toBe(3)
  })
  it('explains the score', () => {
    expect(reason(2, { kind: 'typo', hinted: false })).toMatch(/spelling fix/)
    expect(reason(2, { kind: 'exact', hinted: true })).toMatch(/hint/)
    expect(reason(1, { kind: 'wrong', hinted: false })).toMatch(/soon/)
    expect(reason(4, { kind: 'exact', hinted: false })).toMatch(/quick/)
  })
})

describe('hints', () => {
  it('gives the next correct letter', () => {
    expect(hintNext('', 'house')).toBe('h')
    expect(hintNext('ho', 'house')).toBe('hou')
    expect(hintNext('hx', 'house')).toBe('ho')
    expect(hintNext('house', 'house')).toBe('house')
    expect(hintNext('what', 'what is')).toBe('what i')
    expect(hintNext('ا', 'أكل')).toBe('أك')
  })
  it('picks the right answer to hint at', () => {
    const word = w({ english: 'apple(s)', arabic: ['ت\u064Fف\u0651احة'], translit: ['tufaha'] })
    expect(hintTarget(word, 'ar-en', '')).toBe('apple')
    expect(hintTarget(word, 'en-ar', '')).toBe('تفاحة')
    expect(hintTarget(word, 'en-ar', 'tu')).toBe('تفاحة')
  })
})

describe('doubled letters', () => {
  it('counts a doubled or missing double letter as a spelling slip, even in short words', () => {
    expect(checkEnglish('a lott', 'a lot').kind).toBe('typo')
    expect(checkEnglish('sumer', 'summer').kind).toBe('typo')
    expect(checkEnglish('cat', 'dog').kind).toBe('wrong')
  })
})
