import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, db, type Settings, type Word } from './db'
import { answerCard, ensureCards, getSession, getStats, previewIntervals } from './scheduler'

const settings: Settings = { ...DEFAULT_SETTINGS, dailyNewLimit: 3, directions: ['en-ar'] }

function mkWords(n: number): Word[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${String(i).padStart(3, '0')}`,
    type: 'noun' as const,
    english: `word${i}`,
    arabic: ['ك'],
    translit: ['k'],
  }))
}

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h, 0, 0)

beforeEach(async () => {
  await Promise.all([db.words.clear(), db.cards.clear(), db.reviews.clear(), db.settings.clear()])
})

describe('ensureCards', () => {
  it('creates one card per word per direction, idempotently', async () => {
    const words = mkWords(4)
    await ensureCards(words, { ...settings, directions: ['en-ar', 'ar-en'] })
    expect(await db.cards.count()).toBe(8)
    expect(await ensureCards(words, { ...settings, directions: ['en-ar', 'ar-en'] })).toBe(0)
    expect((await db.cards.get('w000:ar-en'))?.introduced).toBe(false)
  })
})

describe('intervals', () => {
  it('Again < Good < Easy for a reviewed card', async () => {
    await ensureCards(mkWords(1), settings)
    const t0 = at(2026, 1, 1)
    await answerCard('w000:en-ar', 3, 1000, t0)
    let card = (await db.cards.get('w000:en-ar'))!
    // review it a few times so it is in Review state
    for (let i = 1; i <= 3; i++) {
      card = await answerCard('w000:en-ar', 3, 1000, card.due)
    }
    const now = card.due
    const p = previewIntervals(card, 0.9, now)
    expect(p[1]).not.toBe(p[3])
    const ms = async (g: 1 | 3 | 4) => {
      const c = await answerCard('w000:en-ar', g, 1000, now)
      const d = c.due.getTime() - now.getTime()
      await db.cards.put(card) // restore
      return d
    }
    const again = await ms(1)
    const good = await ms(3)
    const easy = await ms(4)
    expect(again).toBeLessThan(good)
    expect(easy).toBeGreaterThan(good)
  })

  it('formats labels', async () => {
    await ensureCards(mkWords(1), settings)
    const card = (await db.cards.get('w000:en-ar'))!
    const p = previewIntervals(card, 0.9, new Date())
    expect(p[1]).toMatch(/^\d+m$/)
    for (const g of [1, 2, 3, 4] as const) expect(p[g]).toMatch(/^\d+(m|h|d|mo|y)$/)
  })
})

describe('session', () => {
  it('respects the daily new cap and puts due reviews first', async () => {
    await ensureCards(mkWords(10), settings)
    const t0 = at(2026, 1, 1, 9)
    let s = await getSession(t0, settings)
    expect(s.newCards).toHaveLength(3)
    expect(s.reviews).toHaveLength(0)

    await answerCard(s.newCards[0].id, 4, 500, t0) // easy -> review, due in days
    await answerCard(s.newCards[1].id, 1, 500, t0) // again -> learning, due in minutes
    s = await getSession(new Date(t0.getTime() + 60_000), settings)
    expect(s.newCards).toHaveLength(1) // 3 - 2 introduced today
    expect(s.newIntroducedToday).toBe(2)

    // 20 minutes later the learning card is due, and it comes before new cards
    s = await getSession(new Date(t0.getTime() + 20 * 60_000), settings)
    expect(s.queue[0].id).toBe(s.reviews[0].id)
    expect(s.reviews.map((c) => c.id)).toContain('w001:en-ar')
    expect(s.queue.slice(s.reviews.length)).toEqual(s.newCards)

    // next local day: cap resets
    s = await getSession(at(2026, 1, 2, 9), settings)
    expect(s.newCards).toHaveLength(3)
    expect(s.newCards.some((c) => c.id === 'w000:en-ar')).toBe(false)
  })
})

describe('answerCard', () => {
  it('updates the card and writes a review log', async () => {
    await ensureCards(mkWords(1), settings)
    const t0 = at(2026, 1, 1)
    const card = await answerCard('w000:en-ar', 3, 1234, t0)
    expect(card.introduced).toBe(true)
    expect(card.due.getTime()).toBe(card.fsrs.due.getTime())
    expect(card.due.getTime()).toBeGreaterThan(t0.getTime())
    const logs = await db.reviews.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ cardId: 'w000:en-ar', grade: 3, responseMs: 1234, stateBefore: 0, stabilityBefore: 0 })
    expect(logs[0].stabilityAfter).toBeGreaterThan(0)
    expect(logs[0].difficultyAfter).toBeGreaterThan(0)
  })
})

describe('stats', () => {
  it('counts streak across consecutive days', async () => {
    await ensureCards(mkWords(3), settings)
    // reviews on Jan 1, 2, 3 and 5 (gap on 4); asked on Jan 5 -> streak 1, asked Jan 3 -> 3
    await answerCard('w000:en-ar', 3, 1, at(2026, 1, 1))
    await answerCard('w001:en-ar', 3, 1, at(2026, 1, 2))
    await answerCard('w002:en-ar', 3, 1, at(2026, 1, 3))
    expect((await getStats(at(2026, 1, 3, 20))).streak).toBe(3)
    expect((await getStats(at(2026, 1, 4, 8))).streak).toBe(3) // today not yet studied still counts
    expect((await getStats(at(2026, 1, 5, 8))).streak).toBe(0) // missed Jan 4
    await answerCard('w000:en-ar', 3, 1, at(2026, 1, 5))
    const st = await getStats(at(2026, 1, 5, 20))
    expect(st.streak).toBe(1)
    expect(st.totalReviews).toBe(4)
    expect(st.reviewsPerDay).toHaveLength(90)
    expect(st.reviewsPerDay.at(-1)?.count).toBe(1)
    expect(st.forecast).toHaveLength(30)
    expect(st.weeklyRetention).toHaveLength(12)
  })
})
