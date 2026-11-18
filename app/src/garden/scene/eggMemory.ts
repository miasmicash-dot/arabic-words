// Little stories that carry on from one day to the next (kept on this device only).
import { dayDiff } from '../state'

export interface EggMemory {
  /** nuts the squirrel buried (and then forgot): they sprout into little oaks */
  nuts: { x: number; day: string }[]
  /** last day the squirrel came */
  squirrelDay: string
  /** first day the tree was big enough for a nest */
  nestStart: string
  /** first sunny day the rabbits dug their burrow */
  burrowStart: string
}

const EMPTY: EggMemory = { nuts: [], squirrelDay: '', nestStart: '', burrowStart: '' }

export function loadEggs(key: string): EggMemory {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

export function saveEggs(key: string, m: EggMemory) {
  try {
    localStorage.setItem(key, JSON.stringify(m))
  } catch {
    /* private mode: the stories just start over next time */
  }
}

export function clearEggs(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const ageDays = (from: string, today: string) => (from ? dayDiff(from, today) : -1)

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

/** Where the squirrel buries today's nut: open grass away from the pond, plant, burrow and stump. */
export function nutSpot(today: string, salt = 0): number {
  const ranges: [number, number][] = [
    [372, 412],
    [470, 520],
    [722, 800],
    [800, 868],
  ]
  const h = hash(today + ':' + salt)
  const [a, b] = ranges[Math.floor(h * ranges.length)]
  return a + (b - a) * hash(today + 'x' + salt)
}

/** Is tonight an aurora night? Roughly one clear night in three. */
export function auroraNight(today: string) {
  return hash(today + 'aurora') < 0.34
}
