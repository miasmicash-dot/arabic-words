// Loads, catches up and saves the garden. Bridges the database (reviews, cards) and the pure garden logic.
import { createEmptyCard, State, type Card } from 'ts-fsrs'
import { db, type ReviewLog } from '../db'
import { GARDEN } from './config'
import { forgottenStats } from './activity'
import { evaluateDay, newGarden, replant, stageFor, type DayEval, type GardenState } from './state'
import type { ForestTree, GrowthStage } from './types'

// ---------- local day keys ----------

export function keyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Local midnight at the start of the day `key`, shifted by `addDays`. */
export function dateOfKey(key: string, addDays = 0): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d + addDays)
}

export function shiftKey(key: string, days: number): string {
  return keyOf(dateOfKey(key, days))
}

// ---------- replaying the review log ----------

/**
 * Builds one DayEval per local day from `fromKey` to `toKey` (both inclusive) by replaying the review log.
 * Card memory at the end of each day is reconstructed from the last review of each card up to that moment,
 * so missed days are judged on what she would have remembered then, not now.
 */
export function buildDayEvals(logs: ReviewLog[], fromKey: string, toKey: string): DayEval[] {
  const sorted = [...logs].sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime())
  const mem = new Map<string, { s: number; d: number; last: Date; wordId: string }>()
  const out: DayEval[] = []
  let i = 0
  for (let key = fromKey; key <= toKey; key = shiftKey(key, 1)) {
    const start = dateOfKey(key)
    const end = dateOfKey(key, 1)
    // apply everything before this day (only matters for the first day)
    while (i < sorted.length && sorted[i].reviewedAt < start) apply(sorted[i++])
    let reviewsToday = 0
    while (i < sorted.length && sorted[i].reviewedAt < end) {
      apply(sorted[i++])
      reviewsToday++
    }
    out.push({ dayKey: key, reviewsToday, ...memoryAt(end) })
  }
  return out

  function apply(l: ReviewLog) {
    mem.set(l.cardId, { s: l.stabilityAfter, d: l.difficultyAfter, last: l.reviewedAt, wordId: l.wordId })
  }

  function memoryAt(at: Date): { forgottenRatio: number; learnedTotal: number } {
    const cards: Card[] = []
    const best = new Map<string, number>()
    for (const m of mem.values()) {
      const c = createEmptyCard(m.last)
      cards.push({ ...c, state: State.Review, stability: m.s, difficulty: m.d, last_review: m.last, reps: 1 })
      best.set(m.wordId, Math.max(best.get(m.wordId) ?? 0, m.s))
    }
    let learnedTotal = 0
    for (const s of best.values()) if (s >= GARDEN.learnedStabilityDays) learnedTotal++
    return { forgottenRatio: forgottenStats(cards, at).ratio, learnedTotal }
  }
}

/** Run evaluateDay over a list of days. Pure. */
export function catchUp(state: GardenState, days: DayEval[]): GardenState {
  let s = state
  for (const d of days) if (d.dayKey > s.lastEvaluatedDay) s = evaluateDay(s, d).state
  return s
}

/** Study flags for the 6 days before `todayKey`. Days before her first review ever count as studied (a fair start). */
export function initialRecentStudy(logs: ReviewLog[], todayKey: string): { recentStudy: number[]; lastStudyDay: string } {
  const days = new Set(logs.map((l) => keyOf(l.reviewedAt)))
  const first = logs.length ? [...days].sort()[0] : todayKey
  const recentStudy: number[] = []
  for (let k = 6; k >= 1; k--) {
    const key = shiftKey(todayKey, -k)
    recentStudy.push(key < first || days.has(key) ? 1 : 0)
  }
  const before = [...days].filter((k) => k < todayKey).sort()
  return { recentStudy, lastStudyDay: before.length ? before[before.length - 1] : '' }
}

// ---------- the view the Home page needs ----------

export interface GardenView {
  /** Today's live state (today evaluated on a copy, not saved). */
  state: GardenState
  stage: GrowthStage
  trees: ForestTree[]
  learnedTotal: number
  learnedSinceSeed: number
  goalReached: boolean
  /** A stage reached that has not been celebrated yet, or null. */
  celebrate: GrowthStage | null
  timeOfDay: number
}

/** Small deterministic random number in 0..1 from a string. */
function hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

/** Neighbour trees: finished trees from past goals plus forest seedlings from words beyond the goal. */
export function forestTrees(s: GardenState, learnedSinceSeed: number): ForestTree[] {
  const trees: ForestTree[] = []
  // finished trees stand in the background, alternating left and right of the main plant
  s.finishedTrees.slice(-8).forEach((t, i) => {
    const left = i % 2 === 0
    const x = left ? 0.06 + hash01(t.id) * 0.22 : 0.78 + hash01(t.id) * 0.18
    trees.push({ id: t.id, x, growth: 1, depth: 0.15 + hash01(t.id, 7) * 0.35 })
  })
  const extra = learnedSinceSeed - s.goalWords * 1.1
  if (!s.dead && extra >= 0) {
    const step = Math.max(2, Math.round(s.goalWords * 0.06))
    // a couple of little plants come up straight away, then one more every few words; each grows through every stage
    const count = Math.min(10, Math.floor(extra / step) + 2)
    for (let i = 0; i < count; i++) {
      const id = `seedling-${s.seedsPlanted}-${i}`
      const left = i % 2 === 1
      const x = left ? 0.04 + hash01(id) * 0.3 : 0.7 + hash01(id) * 0.27
      const growth = Math.max(0.02, Math.min(1, (extra - i * step + step) / (step * 8)))
      trees.push({ id, x, growth, depth: 0.08 + hash01(id, 3) * 0.42 })
    }
  }
  return trees
}

function toView(saved: GardenState, today: DayEval, now: Date): GardenView {
  const live = evaluateDay(saved, today).state
  const learnedSinceSeed = Math.max(0, today.learnedTotal - live.baselineLearned)
  const stage = live.maxStage
  const celebrated = saved.celebratedStage ?? 1
  return {
    state: live,
    stage,
    trees: forestTrees(live, learnedSinceSeed),
    learnedTotal: today.learnedTotal,
    learnedSinceSeed,
    goalReached: !live.dead && stage >= 10,
    celebrate: !live.dead && stage > celebrated ? stage : null,
    timeOfDay: now.getHours() + now.getMinutes() / 60,
  }
}

// ---------- database operations ----------

export async function loadGarden(): Promise<GardenState | null> {
  return (await db.garden.get('main'))?.state ?? null
}

async function save(state: GardenState) {
  await db.garden.put({ id: 'main', state })
}

/**
 * Catches the garden up day by day to yesterday (saved), then evaluates today on a copy for display.
 * Returns null when there is no garden yet (she still has to pick a goal).
 */
export async function syncGarden(now = new Date()): Promise<GardenView | null> {
  const saved = await loadGarden()
  if (!saved) return null
  const todayKey = keyOf(now)
  const yesterday = shiftKey(todayKey, -1)
  const logs = await db.reviews.toArray()
  const from = shiftKey(saved.lastEvaluatedDay, 1)
  const days = buildDayEvals(logs, from <= todayKey ? from : todayKey, todayKey)
  const today = days[days.length - 1]
  const caught = catchUp(saved, days.filter((d) => d.dayKey <= yesterday))
  if (caught !== saved) await save(caught)
  return toView(caught, today, now)
}

/** First open: plant the first seed with the chosen goal. */
export async function startGarden(goalWords: number, now = new Date()): Promise<GardenView | null> {
  const todayKey = keyOf(now)
  const logs = await db.reviews.toArray()
  const [today] = buildDayEvals(logs, todayKey, todayKey)
  const state = newGarden(goalWords, shiftKey(todayKey, -1), today.learnedTotal)
  await save({ ...state, ...initialRecentStudy(logs, todayKey), celebratedStage: 1 })
  return syncGarden(now)
}

async function update(patch: (s: GardenState) => GardenState) {
  const s = await loadGarden()
  if (s) await save(patch(s))
}

/** Change the goal of the current seed. Stages never go backwards (maxStage is kept). */
export const setGoal = (goalWords: number) => update((s) => ({ ...s, goalWords }))
export const setMuted = (soundMuted: boolean) => update((s) => ({ ...s, soundMuted }))
export const markCelebrated = (stage: GrowthStage) =>
  update((s) => ({ ...s, celebratedStage: Math.max(stage, s.celebratedStage ?? 1) as GrowthStage }))

/**
 * Plant a new seed: after the plant died, or after the goal was reached (the grown tree is kept in the forest).
 * Progress restarts from the words learned so far.
 */
export async function plantNewSeed(goalWords: number, now = new Date()): Promise<GardenView | null> {
  const view = await syncGarden(now)
  const s = await loadGarden()
  if (!s || !view) return startGarden(goalWords, now)
  const todayKey = keyOf(now)
  const finishedTrees =
    !view.state.dead && view.stage >= 10
      ? [...s.finishedTrees, { id: `tree-${s.seedsPlanted}-${todayKey}`, plantedDay: todayKey, goalWords: s.goalWords }]
      : s.finishedTrees
  const next = replant({ ...s, finishedTrees, goalWords }, shiftKey(todayKey, -1), view.learnedTotal)
  await save({ ...next, celebratedStage: 1 })
  return syncGarden(now)
}

/** Remember that a review session just finished, so Home plays the watering animation once. */
export function markWatered() {
  try {
    sessionStorage.setItem('garden-watered', '1')
  } catch {
    /* storage unavailable: skip the animation */
  }
}

export function takeWatered(): boolean {
  try {
    const v = sessionStorage.getItem('garden-watered') === '1'
    sessionStorage.removeItem('garden-watered')
    return v
  } catch {
    return false
  }
}

export { stageFor }
