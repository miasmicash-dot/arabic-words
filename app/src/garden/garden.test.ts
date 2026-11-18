import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyCard, State } from 'ts-fsrs'
import { db, type ReviewLog } from '../db'
import { activityScore, forgottenStats } from './activity'
import { evaluateDay, newGarden, replant, stageFor, type DayEval } from './state'
import {
  buildDayEvals,
  forestTrees,
  initialRecentStudy,
  keyOf,
  markCelebrated,
  plantNewSeed,
  shiftKey,
  startGarden,
  syncGarden,
} from './service'

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h)
const day = (dayKey: string, reviewsToday: number, learnedTotal = 0, forgottenRatio = 0): DayEval => ({
  dayKey,
  reviewsToday,
  learnedTotal,
  forgottenRatio,
})

function log(cardId: string, when: Date, stabilityAfter: number): ReviewLog {
  return {
    cardId,
    wordId: cardId.split(':')[0],
    direction: 'en-ar',
    reviewedAt: when,
    grade: 3,
    responseMs: 1000,
    stabilityBefore: 0,
    difficultyBefore: 5,
    stabilityAfter,
    difficultyAfter: 5,
    stateBefore: State.Review,
    elapsedDays: 1,
  }
}

describe('activity', () => {
  it('ignores new cards and grows forgetting with time', () => {
    const c = { ...createEmptyCard(at(2026, 1, 1)), state: State.Review, stability: 5, last_review: at(2026, 1, 1) }
    expect(forgottenStats([createEmptyCard()], at(2026, 1, 2)).cards).toBe(0)
    const soon = forgottenStats([c], at(2026, 1, 2)).ratio
    const late = forgottenStats([c], at(2026, 2, 1)).ratio
    expect(soon).toBeLessThan(late)
  })

  it('maps engagement to weather', () => {
    expect(activityScore({ studiedDaysLast7: 7, daysSinceLastSession: 0, forgottenRatio: 0.05 }).weather).toBe('sunny')
    expect(activityScore({ studiedDaysLast7: 2, daysSinceLastSession: 3, forgottenRatio: 0.2 }).weather).not.toBe('sunny')
    expect(activityScore({ studiedDaysLast7: 0, daysSinceLastSession: 12, forgottenRatio: 0.1 }).weather).toBe('drought')
  })
})

describe('state', () => {
  it('stages follow progress toward the goal', () => {
    expect(stageFor(0, 100)).toBe(1)
    expect(stageFor(50, 100)).toBe(8)
    expect(stageFor(80, 100)).toBe(10)
    expect(stageFor(120, 100)).toBe(11)
  })

  it('never loses a stage, and dies only after a long absence', () => {
    let s = newGarden(10, '2026-01-01', 0)
    s = evaluateDay(s, day('2026-01-02', 5, 6)).state
    const reached = s.maxStage
    expect(reached).toBeGreaterThan(1)
    let k = '2026-01-02'
    for (let i = 0; i < 20; i++) {
      k = shiftKey(k, 1)
      s = evaluateDay(s, day(k, 0, 2, 0.4)).state
    }
    expect(s.maxStage).toBe(reached)
    expect(s.dead).toBe(false)
    for (let i = 0; i < 60; i++) {
      k = shiftKey(k, 1)
      s = evaluateDay(s, day(k, 0, 2, 0.6)).state
    }
    expect(s.dead).toBe(true)
    const r = replant(s, k, 2)
    expect(r).toMatchObject({ dead: false, maxStage: 1, health: 1, baselineLearned: 2, seedsPlanted: 2 })
  })
})

describe('service helpers', () => {
  it('replays the review log day by day', () => {
    const logs = [log('a:en-ar', at(2026, 3, 1), 10), log('b:en-ar', at(2026, 3, 1), 2), log('b:en-ar', at(2026, 3, 3), 8)]
    const days = buildDayEvals(logs, '2026-03-01', '2026-03-04')
    expect(days.map((d) => d.reviewsToday)).toEqual([2, 0, 1, 0])
    expect(days.map((d) => d.learnedTotal)).toEqual([1, 1, 2, 2])
    expect(days[1].forgottenRatio).toBeGreaterThan(days[0].forgottenRatio)
  })

  it('gives a fair start to a brand new learner', () => {
    expect(initialRecentStudy([], '2026-03-10').recentStudy).toEqual([1, 1, 1, 1, 1, 1])
    const r = initialRecentStudy([log('a:en-ar', at(2026, 3, 7), 1)], '2026-03-10')
    // Mar 4-6 are before her first review (fair start), Mar 7 studied, Mar 8-9 missed
    expect(r.recentStudy).toEqual([1, 1, 1, 1, 0, 0])
    expect(r.lastStudyDay).toBe('2026-03-07')
  })

  it('adds forest seedlings beyond the goal and keeps finished trees', () => {
    const s = { ...newGarden(50, '2026-01-01', 0), finishedTrees: [{ id: 't1', plantedDay: '2026-01-01', goalWords: 50 }] }
    expect(forestTrees(s, 40)).toHaveLength(1)
    const more = forestTrees(s, 80)
    expect(more.length).toBeGreaterThan(3)
    for (const t of more) {
      expect(t.x).toBeGreaterThanOrEqual(0)
      expect(t.x).toBeLessThanOrEqual(1)
    }
  })
})

describe('service with the database', () => {
  beforeEach(async () => {
    await Promise.all([db.reviews.clear(), db.garden.clear()])
  })

  it('has no garden until a goal is picked', async () => {
    expect(await syncGarden(at(2026, 4, 1))).toBeNull()
    const v = await startGarden(50, at(2026, 4, 1))
    expect(v?.stage).toBe(1)
    expect(v?.state.weather).toBe('sunny')
  })

  it('catches up missed days, celebrates once, and replants keeping the tree', async () => {
    await startGarden(4, at(2026, 4, 1))
    const words = ['a', 'b', 'c', 'd', 'e']
    await db.reviews.bulkAdd(words.map((w) => log(`${w}:en-ar`, at(2026, 4, 1, 12), 9)))
    let v = await syncGarden(at(2026, 4, 1, 20))
    expect(v?.stage).toBe(11)
    expect(v?.celebrate).toBe(11)
    await markCelebrated(11)
    v = await syncGarden(at(2026, 4, 3))
    expect(v?.celebrate).toBeNull()
    expect((await db.garden.get('main'))?.state.lastEvaluatedDay).toBe(keyOf(at(2026, 4, 2)))
    v = await plantNewSeed(10, at(2026, 4, 3))
    expect(v?.stage).toBe(1)
    expect(v?.state.finishedTrees).toHaveLength(1)
    expect(v?.trees).toHaveLength(1)
  })
})
