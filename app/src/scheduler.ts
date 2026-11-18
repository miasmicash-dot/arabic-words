import { createEmptyCard, fsrs, generatorParameters, State, type Grade } from 'ts-fsrs'
import { DEFAULT_SETTINGS, db, type Direction, type ReviewLog, type Settings, type StudyCard, type Word } from './db'

const DAY_MS = 86_400_000
const MATURE_STABILITY_DAYS = 21
/** A word never comes back sooner than this after being answered. */
export const MIN_GAP_MS = 3_600_000

type GradeNum = 1 | 2 | 3 | 4

function makeScheduler(retention: number) {
  return fsrs(generatorParameters({ request_retention: retention, enable_fuzz: false, learning_steps: ['1h'], relearning_steps: ['1h'] }))
}

// ---------- local-day helpers ----------

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addLocalDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

async function getSettings(): Promise<Settings> {
  return (await db.settings.get('main')) ?? DEFAULT_SETTINGS
}

// ---------- ensureCards ----------

/** Create any missing cards (one per word per enabled direction). Returns the number created. */
export async function ensureCards(words: Word[], settings: Settings): Promise<number> {
  const now = new Date()
  const existing = new Set((await db.cards.toCollection().primaryKeys()) as string[])
  const toAdd: StudyCard[] = []
  for (const w of words) {
    for (const direction of settings.directions) {
      const id = `${w.id}:${direction}`
      if (existing.has(id)) continue
      const fsrsCard = createEmptyCard(now)
      toAdd.push({ id, wordId: w.id, direction, fsrs: fsrsCard, due: fsrsCard.due, createdAt: now, introduced: false })
    }
  }
  if (toAdd.length) await db.cards.bulkAdd(toAdd)
  return toAdd.length
}

// ---------- session ----------

export interface Session {
  /** Due review/learning cards, most overdue first. */
  reviews: StudyCard[]
  /** New cards to introduce today. */
  newCards: StudyCard[]
  /** reviews followed by newCards. */
  queue: StudyCard[]
  newIntroducedToday: number
}

/** Number of distinct cards first-reviewed (introduced) today (local calendar day). */
async function introducedToday(now: Date): Promise<number> {
  const start = startOfLocalDay(now)
  const logs = await db.reviews.where('reviewedAt').aboveOrEqual(start).toArray()
  return new Set(logs.filter((l) => l.stateBefore === State.New).map((l) => l.cardId)).size
}

export async function getSession(now: Date, settings: Settings): Promise<Session> {
  const dirs = new Set<Direction>(settings.directions)

  const reviews = (await db.cards.where('due').belowOrEqual(now).toArray())
    .filter((c) => c.fsrs.state !== State.New && dirs.has(c.direction))
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  const done = await introducedToday(now)
  const room = Math.max(0, settings.dailyNewLimit - done)

  let newCards: StudyCard[] = []
  if (room > 0) {
    const candidates = (await db.cards.toArray()).filter(
      (c) => c.fsrs.state === State.New && !c.introduced && dirs.has(c.direction),
    )
    if (candidates.length) {
      const words = await db.words.toArray()
      const order = new Map(words.map((w, i) => [w.id, [w.frequencyRank ?? -1, i] as const]))
      const key = (c: StudyCard) => order.get(c.wordId) ?? [Infinity, Infinity]
      candidates.sort((a, b) => {
        const ka = key(a)
        const kb = key(b)
        if (ka[0] !== kb[0]) return ka[0] < kb[0] ? -1 : 1
        if (ka[1] !== kb[1]) return ka[1] < kb[1] ? -1 : 1
        return a.direction < b.direction ? -1 : 1
      })
      newCards = candidates.slice(0, room)
    }
  }

  return { reviews, newCards, queue: [...reviews, ...newCards], newIntroducedToday: done }
}

// ---------- previews ----------

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000))
  if (min < 60) return `${min}m`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(ms / DAY_MS)
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1).replace(/\.0$/, '')}y`
}

/** Next-due label for each grade (1 Again, 2 Hard, 3 Good, 4 Easy), e.g. {1:'10m',3:'3d'}. */
export function previewIntervals(
  card: StudyCard,
  retention: number = DEFAULT_SETTINGS.desiredRetention,
  now: Date = new Date(),
): Record<GradeNum, string> {
  const rec = makeScheduler(retention).repeat(card.fsrs, now)
  const out = {} as Record<GradeNum, string>
  for (const g of [1, 2, 3, 4] as const) {
    out[g] = formatInterval(rec[g as Grade].card.due.getTime() - now.getTime())
  }
  return out
}

// ---------- answering ----------

export async function answerCard(cardId: string, grade: GradeNum, responseMs: number, now: Date): Promise<StudyCard> {
  return db.transaction('rw', db.cards, db.reviews, db.settings, async () => {
    const card = await db.cards.get(cardId)
    if (!card) throw new Error(`Unknown card ${cardId}`)
    const settings = await getSettings()
    const before = card.fsrs
    const { card: next } = makeScheduler(settings.desiredRetention).next(before, now, grade as Grade)
    const soonest = new Date(now.getTime() + MIN_GAP_MS)
    const after = next.due < soonest ? { ...next, due: soonest } : next

    const elapsedDays = before.last_review ? Math.max(0, (now.getTime() - before.last_review.getTime()) / DAY_MS) : 0
    const updated: StudyCard = { ...card, fsrs: after, due: after.due, introduced: true }
    const log: ReviewLog = {
      cardId,
      wordId: card.wordId,
      direction: card.direction,
      reviewedAt: now,
      grade,
      responseMs,
      stabilityBefore: before.stability,
      difficultyBefore: before.difficulty,
      stabilityAfter: after.stability,
      difficultyAfter: after.difficulty,
      stateBefore: before.state,
      elapsedDays,
    }
    await db.cards.put(updated)
    await db.reviews.add(log)
    return updated
  })
}

// ---------- stats ----------

export interface Stats {
  dueNow: number
  newCount: number
  learning: number
  mature: number
  streak: number
  totalReviews: number
  /** Oldest first, 90 entries ending today. */
  reviewsPerDay: { date: string; count: number }[]
  /** 30 entries starting today; overdue cards are counted in today. */
  forecast: { date: string; count: number }[]
  /** 12 consecutive 7-day buckets ending today (oldest first); retention is null with no review-state reviews. */
  weeklyRetention: { weekStart: string; retention: number | null; reviews: number }[]
}

export async function getStats(now: Date): Promise<Stats> {
  const cards = await db.cards.toArray()
  const logs = await db.reviews.toArray()
  const today = startOfLocalDay(now)

  let dueNow = 0
  let newCount = 0
  let learning = 0
  let mature = 0
  const forecastMap = new Map<string, number>()
  for (const c of cards) {
    const s = c.fsrs.state
    if (s === State.New) {
      newCount++
      continue
    }
    if (c.due.getTime() <= now.getTime()) dueNow++
    if (s === State.Learning || s === State.Relearning) learning++
    else if (c.fsrs.stability >= MATURE_STABILITY_DAYS) mature++
    const k = dayKey(c.due < today ? today : c.due)
    forecastMap.set(k, (forecastMap.get(k) ?? 0) + 1)
  }

  const perDay = new Map<string, number>()
  for (const l of logs) {
    const k = dayKey(l.reviewedAt)
    perDay.set(k, (perDay.get(k) ?? 0) + 1)
  }

  // streak: consecutive days with reviews, ending today (or yesterday if nothing yet today)
  let streak = 0
  let cursor = perDay.has(dayKey(today)) ? today : addLocalDays(today, -1)
  while (perDay.has(dayKey(cursor))) {
    streak++
    cursor = addLocalDays(cursor, -1)
  }

  const reviewsPerDay = Array.from({ length: 90 }, (_, i) => {
    const date = dayKey(addLocalDays(today, i - 89))
    return { date, count: perDay.get(date) ?? 0 }
  })
  const forecast = Array.from({ length: 30 }, (_, i) => {
    const date = dayKey(addLocalDays(today, i))
    return { date, count: forecastMap.get(date) ?? 0 }
  })

  const weeklyRetention = Array.from({ length: 12 }, (_, w) => {
    const start = addLocalDays(today, -(11 - w) * 7 - 6)
    const end = addLocalDays(start, 7)
    const inWeek = logs.filter(
      (l) => l.stateBefore === State.Review && l.reviewedAt >= start && l.reviewedAt < end,
    )
    const passed = inWeek.filter((l) => l.grade >= 2).length
    return {
      weekStart: dayKey(start),
      retention: inWeek.length ? Math.round((passed / inWeek.length) * 100) : null,
      reviews: inWeek.length,
    }
  })
  // last bucket should include today (end = tomorrow); shift handled since start of last = today-6, end = today+1

  return { dueNow, newCount, learning, mature, streak, totalReviews: logs.length, reviewsPerDay, forecast, weeklyRetention }
}
