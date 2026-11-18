// Extra word packs built from published dictionaries (see scripts/build-words.mjs). A pack unlocks once most of the
// words already in the app have been introduced, so the queue never runs dry. Packs never raise the daily new-word limit.
import type { Word } from './db'

const files = import.meta.glob<Word[]>('./data/packs/pack-*.json', { eager: true, import: 'default' })
export const PACKS: Word[][] = Object.keys(files).sort().map((k) => files[k])

/** Share of cards that must have been introduced before the next pack is added. */
export const UNLOCK_AT = 0.8

/** How many packs should be open, given how many cards exist and how many of them were introduced. */
export function packsToOpen(unlocked: number, introduced: number, total: number, available = PACKS.length): number {
  if (unlocked >= available) return available
  return total > 0 && introduced / total >= UNLOCK_AT ? unlocked + 1 : unlocked
}

export function packWords(unlocked: number): Word[] {
  return PACKS.slice(0, unlocked).flat()
}
