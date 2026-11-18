import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, db, type Settings, type Word } from './db'
import { answerCard, ensureCards, getSession, MIN_GAP_MS } from './scheduler'
import { PACKS, packsToOpen, UNLOCK_AT } from './packs'
import { buildDayEvals, keyOf } from './garden/service'
import { State } from 'ts-fsrs'

const settings: Settings = { ...DEFAULT_SETTINGS, dailyNewLimit: 4, directions: ['en-ar'] }
const words = (n: number, pre = 'w'): Word[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${pre}${i}`, type: 'noun' as const, english: `e${i}`, arabic: ['ك'], translit: ['k'] }))

beforeEach(async () => {
  await Promise.all([db.words.clear(), db.cards.clear(), db.reviews.clear(), db.settings.clear()])
  await db.settings.put(settings)
})

describe('word packs', () => {
  it('ships packs of real dictionary words with meaning, transliteration and verb forms', () => {
    expect(PACKS.length).toBeGreaterThanOrEqual(10)
    for (const p of PACKS) {
      expect(p.length).toBe(50)
      for (const w of p) {
        expect(w.english).toBeTruthy()
        expect(w.arabic[0]).toMatch(/[؀-ۿ]/)
        expect(w.translit[0]).toMatch(/^[a-z' -]+$/)
        if (w.type === 'verb') expect(Object.keys(w.conjugations ?? {})).toEqual(['I', 'he', 'she', 'we', 'they'])
      }
    }
    const ids = PACKS.flat().map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('opens the next pack only once most words have been introduced', () => {
    expect(packsToOpen(0, 0, 100)).toBe(0)
    expect(packsToOpen(0, UNLOCK_AT * 100 - 1, 100)).toBe(0)
    expect(packsToOpen(0, UNLOCK_AT * 100, 100)).toBe(1)
    expect(packsToOpen(3, 100, 100, 3)).toBe(3) // nothing left to open
  })
})

describe('daily new words', () => {
  it('never introduces more new words than the daily limit, however many words exist', async () => {
    await db.words.bulkPut([...words(10), ...words(60, 'p')])
    await ensureCards([...words(10), ...words(60, 'p')], settings)
    const now = new Date(2026, 0, 5, 9)
    let s = await getSession(now, settings)
    expect(s.newCards).toHaveLength(4)
    for (const c of s.newCards) await answerCard(c.id, 3, 1000, now)
    s = await getSession(new Date(2026, 0, 5, 20), settings)
    expect(s.newCards).toHaveLength(0)
  })

  it('introduces the built-in words before pack words', async () => {
    const packed = words(5, 'p').map((w, i) => ({ ...w, frequencyRank: i + 1 }))
    await db.words.bulkPut([...words(5), ...packed])
    await ensureCards([...words(5), ...packed], settings)
    const s = await getSession(new Date(2026, 0, 5, 9), settings)
    expect(s.newCards.map((c) => c.wordId)).toEqual(['w0', 'w1', 'w2', 'w3'])
  })
})

describe('shortest gap', () => {
  it('never brings a word back sooner than an hour, even after "Forgot"', async () => {
    await ensureCards(words(1), settings)
    const t = new Date(2026, 0, 5, 9)
    for (const g of [1, 2, 3, 4] as const) {
      await db.cards.clear()
      await ensureCards(words(1), settings)
      const c = await answerCard('w0:en-ar', g, 1000, t)
      expect(c.due.getTime() - t.getTime()).toBeGreaterThanOrEqual(MIN_GAP_MS)
    }
    // a word you forgot is not due again within the same sitting
    const s = await getSession(new Date(t.getTime() + 30 * 60_000), settings)
    expect(s.reviews).toHaveLength(0)
  })
})

describe('missed days', () => {
  it('counts a day as studied whenever any review happened in it, early or late', () => {
    const late = new Date(2026, 0, 6, 23, 40) // due in the morning, done just before midnight
    const logs = [
      { cardId: 'a', wordId: 'a', direction: 'en-ar' as const, reviewedAt: new Date(2026, 0, 5, 8), grade: 3 as const, responseMs: 1, stabilityBefore: 0, difficultyBefore: 5, stabilityAfter: 2, difficultyAfter: 5, stateBefore: State.New, elapsedDays: 0 },
      { cardId: 'a', wordId: 'a', direction: 'en-ar' as const, reviewedAt: late, grade: 3 as const, responseMs: 1, stabilityBefore: 2, difficultyBefore: 5, stabilityAfter: 4, difficultyAfter: 5, stateBefore: State.Review, elapsedDays: 1.6 },
    ]
    const days = buildDayEvals(logs, keyOf(new Date(2026, 0, 5)), keyOf(new Date(2026, 0, 7)))
    expect(days.map((d) => d.reviewsToday > 0)).toEqual([true, true, false])
  })
})
