import { DEFAULT_SETTINGS, db, type Word } from './db'
import { ensureCards } from './scheduler'
import { packWords, packsToOpen } from './packs'
import seed from './data/seed.json'

/** Loads the vocabulary (built-in words plus unlocked packs), default settings and any missing cards. Safe to run on every start. */
export async function boot(): Promise<void> {
  if (!(await db.settings.get('main'))) await db.settings.put(DEFAULT_SETTINGS)
  const settings = (await db.settings.get('main'))!
  const words = [...(seed as Word[]), ...packWords(settings.unlockedPacks ?? 0)]
  await db.words.bulkPut(words)
  await ensureCards(words, settings)
  await unlockPacks()
}

/** Adds the next pack when most words have been introduced. Returns true if a pack was unlocked. */
export async function unlockPacks(): Promise<boolean> {
  const settings = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
  const was = settings.unlockedPacks ?? 0
  const cards = await db.cards.toArray()
  const next = packsToOpen(was, cards.filter((c) => c.introduced).length, cards.length)
  if (next === was) return false
  await db.settings.put({ ...settings, unlockedPacks: next })
  const words = packWords(next).slice(packWords(was).length)
  await db.words.bulkPut(words)
  await ensureCards(words, settings)
  return true
}
