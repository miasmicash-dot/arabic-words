import { fsrs, generatorParameters, State, type Card } from 'ts-fsrs'
import { GARDEN } from './config'
import type { Weather } from './types'

const scheduler = fsrs(generatorParameters({ enable_fuzz: false }))

export interface ForgottenStats {
  /** introduced cards (state != New) */
  cards: number
  /** sum over cards of (1 - retrievability now): the expected number of forgotten cards */
  expectedForgotten: number
  /** expectedForgotten / cards, 0 when no cards */
  ratio: number
}

/** Predicts how many studied cards she has probably forgotten right now, using FSRS retrievability. */
export function forgottenStats(cards: Card[], now: Date): ForgottenStats {
  let n = 0
  let lost = 0
  for (const c of cards) {
    if (c.state === State.New) continue
    n++
    lost += 1 - scheduler.retrievability(c, now)
  }
  return { cards: n, expectedForgotten: lost, ratio: n ? lost / n : 0 }
}

export interface ActivityInput {
  /** number of days with at least one review among the last 7 days (including today) */
  studiedDaysLast7: number
  /** whole days since the last study session (0 = studied today) */
  daysSinceLastSession: number
  /** forgotten ratio from forgottenStats */
  forgottenRatio: number
}

export interface Activity {
  score: number // 0..1
  weather: Weather
  engagement: number
  memory: number
  recency: number
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

export function activityScore(i: ActivityInput): Activity {
  const engagement = clamp01(i.studiedDaysLast7 / GARDEN.fullEngagementDays)
  const memory = clamp01(1 - i.forgottenRatio / GARDEN.forgottenRatioAtZero)
  const recency = Math.exp(-i.daysSinceLastSession / GARDEN.recencyTauDays)
  const w = GARDEN.weights
  const score = clamp01(w.engagement * engagement + w.memory * memory + w.recency * recency)
  let weather: Weather
  if (i.daysSinceLastSession >= GARDEN.droughtAfterDays) weather = 'drought'
  else if (score >= GARDEN.weather.sunny) weather = 'sunny'
  else if (score >= GARDEN.weather.partlyCloudy) weather = 'partly-cloudy'
  else if (score >= GARDEN.weather.overcast) weather = 'overcast'
  else weather = 'drought'
  return { score, weather, engagement, memory, recency }
}
