import Dexie, { type EntityTable } from 'dexie'
import type { Card as FsrsCard } from 'ts-fsrs'
import type { GardenState } from './garden/state'

export type WordType = 'noun' | 'verb' | 'adj' | 'phrase' | 'number'
export type Direction = 'en-ar' | 'ar-en'

/** One vocabulary item, loaded from src/data/seed.json. */
export interface Word {
  id: string
  type: WordType
  english: string
  arabic: string[] // primary form first; alternates after
  translit: string[]
  notes?: string
  /** verbs only: pronoun label -> conjugated Arabic form */
  conjugations?: Record<string, string>
  /** reserved for the future "discover new words" mode */
  frequencyRank?: number
  topic?: string
  /** pack words: the spelling with vowel marks, the CEFR level and where the word came from */
  vocalized?: string
  level?: string
  source?: string
  /** pack words: the sources that confirmed this word (always the frequency list, Wiktionary and at least one more) */
  verified?: string[]
}

/**
 * One schedulable card. A word produces one card per direction.
 * `fsrs` holds the ts-fsrs Card state (due, stability, difficulty, state, reps, lapses...).
 * `due` is duplicated at top level so it can be indexed and queried.
 */
export interface StudyCard {
  id: string // `${wordId}:${direction}`
  wordId: string
  direction: Direction
  fsrs: FsrsCard
  due: Date
  createdAt: Date
  /** true once introduced to the learner (counts toward the daily new-card cap) */
  introduced: boolean
}

/** Append-only log of every review (kept so FSRS parameters can be optimized later). */
export interface ReviewLog {
  id?: number
  cardId: string
  wordId: string
  direction: Direction
  reviewedAt: Date
  grade: 1 | 2 | 3 | 4 // Again | Hard | Good | Easy
  responseMs: number
  stabilityBefore: number
  difficultyBefore: number
  stabilityAfter: number
  difficultyAfter: number
  stateBefore: number
  elapsedDays: number
}

export interface Settings {
  id: 'main'
  dailyNewLimit: number
  desiredRetention: number
  reminderTime: string // "HH:MM" local
  timezone: string
  remindersEnabled: boolean
  directions: Direction[]
  /** number of extra word packs added so far (see packs.ts) */
  unlockedPacks?: number
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  dailyNewLimit: 10,
  desiredRetention: 0.9,
  reminderTime: '19:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  remindersEnabled: false,
  directions: ['en-ar', 'ar-en'],
}

/** The single persisted garden (gamified home scene). */
export interface GardenRecord {
  id: 'main'
  state: GardenState
}

class VocabDB extends Dexie {
  words!: EntityTable<Word, 'id'>
  cards!: EntityTable<StudyCard, 'id'>
  reviews!: EntityTable<ReviewLog, 'id'>
  settings!: EntityTable<Settings, 'id'>
  garden!: EntityTable<GardenRecord, 'id'>

  constructor() {
    super('arabic-srs')
    this.version(1).stores({
      words: 'id, type, frequencyRank, topic',
      cards: 'id, wordId, direction, due, introduced',
      reviews: '++id, cardId, wordId, reviewedAt',
      settings: 'id',
    })
    // v2 adds the garden table. The other stores are unchanged, so existing data on the phone is kept.
    this.version(2).stores({
      words: 'id, type, frequencyRank, topic',
      cards: 'id, wordId, direction, due, introduced',
      reviews: '++id, cardId, wordId, reviewedAt',
      settings: 'id',
      garden: 'id',
    })
  }
}

export const db = new VocabDB()
