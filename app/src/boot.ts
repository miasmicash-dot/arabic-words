import { DEFAULT_SETTINGS, db, type Word } from './db'
import { ensureCards } from './scheduler'
import seed from './data/seed.json'

/** Loads the seed vocabulary, default settings and any missing cards. Safe to run on every start. */
export async function boot(): Promise<void> {
  if (!(await db.settings.get('main'))) await db.settings.put(DEFAULT_SETTINGS)
  const settings = (await db.settings.get('main'))!
  const words = seed as Word[]
  await db.words.bulkPut(words)
  await ensureCards(words, settings)
}
