import { GARDEN } from './config'
import { activityScore, type Activity } from './activity'
import type { GrowthStage, Weather } from './types'

/** Persisted garden state (one row in Dexie table `garden`, id 'main'). */
export interface GardenState {
  goalWords: number
  /** total learned words at the moment the current seed was planted */
  baselineLearned: number
  /** highest stage reached by the current seed (never decreases) */
  maxStage: GrowthStage
  health: number // 0..1
  dead: boolean
  zeroHealthDays: number
  /** 1 if studied, 0 if not, for each of the last 7 evaluated days (oldest first) */
  recentStudy: number[]
  /** local day key of the last day already evaluated (YYYY-MM-DD) */
  lastEvaluatedDay: string
  /** local day key of the last study day, or '' */
  lastStudyDay: string
  /** days at the goal, stored so finished trees persist in the forest */
  finishedTrees: { id: string; plantedDay: string; goalWords: number }[]
  seedsPlanted: number
  weather: Weather
  score: number
  soundMuted: boolean
  /** highest stage already celebrated with the stage-up overlay (optional for older saved states) */
  celebratedStage?: GrowthStage
}

export function newGarden(goalWords: number, today: string, learnedNow: number): GardenState {
  return {
    goalWords,
    baselineLearned: learnedNow,
    maxStage: 1,
    health: 1,
    dead: false,
    zeroHealthDays: 0,
    recentStudy: [],
    lastEvaluatedDay: today,
    lastStudyDay: '',
    finishedTrees: [],
    seedsPlanted: 1,
    weather: 'sunny',
    score: 1,
    soundMuted: false,
  }
}

/** Stage of the plant given words learned since planting and the goal. Reaching the goal gives stage 10; extra words give the forest (11). */
export function stageFor(learnedSincePlanting: number, goal: number): GrowthStage {
  const f = Math.max(0, learnedSincePlanting) / Math.max(1, goal)
  if (f >= 1.0) return learnedSincePlanting >= goal * 1.1 ? 11 : 10
  let stage = 1
  GARDEN.stageStarts.forEach((start, idx) => {
    if (f >= start) stage = idx + 2
  })
  return stage as GrowthStage
}

export function dayDiff(fromKey: string, toKey: string): number {
  const a = Date.parse(fromKey + 'T00:00:00Z')
  const b = Date.parse(toKey + 'T00:00:00Z')
  return Math.round((b - a) / 86_400_000)
}

export interface DayEval {
  reviewsToday: number
  /** forgotten ratio at the end of that day */
  forgottenRatio: number
  /** total learned words (stability >= threshold) at the end of that day */
  learnedTotal: number
  dayKey: string
}

/** Advance the garden by one calendar day. Pure: returns a new state and the day's activity. */
export function evaluateDay(s: GardenState, d: DayEval): { state: GardenState; activity: Activity } {
  const studied = d.reviewsToday > 0
  const lastStudy = studied ? d.dayKey : s.lastStudyDay
  const daysSince = lastStudy ? dayDiff(lastStudy, d.dayKey) : dayDiff(s.lastEvaluatedDay, d.dayKey)
  const recentStudy = [...s.recentStudy, studied ? 1 : 0].slice(-7)
  const studiedDaysLast7 = recentStudy.reduce((a, b) => a + b, 0)
  const activity = activityScore({ studiedDaysLast7, daysSinceLastSession: daysSince, forgottenRatio: d.forgottenRatio })

  let { health, zeroHealthDays, dead } = s
  if (!dead) {
    if (studied) health = Math.min(1, health + GARDEN.health.studyGain)
    else health = Math.max(0, health - GARDEN.health.decay[activity.weather])
    zeroHealthDays = health <= 0 ? zeroHealthDays + 1 : 0
    if (zeroHealthDays >= GARDEN.health.deadAfterZeroDays) dead = true
  }

  const stage = stageFor(d.learnedTotal - s.baselineLearned, s.goalWords)
  const maxStage = (dead ? s.maxStage : Math.max(s.maxStage, stage)) as GrowthStage

  return {
    state: {
      ...s,
      health,
      dead,
      zeroHealthDays,
      recentStudy,
      lastEvaluatedDay: d.dayKey,
      lastStudyDay: lastStudy,
      maxStage,
      weather: activity.weather,
      score: activity.score,
    },
    activity,
  }
}

/** After death: plant a fresh seed. Finished trees and total learned words are kept. */
export function replant(s: GardenState, today: string, learnedNow: number): GardenState {
  return {
    ...s,
    baselineLearned: learnedNow,
    maxStage: 1,
    health: 1,
    dead: false,
    zeroHealthDays: 0,
    lastEvaluatedDay: today,
    seedsPlanted: s.seedsPlanted + 1,
    celebratedStage: 1,
  }
}
