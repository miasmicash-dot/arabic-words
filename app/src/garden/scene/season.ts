// Seasons from the real date, as smooth weights (late November is mostly autumn with a little winter coming in),
// and the colour changes they bring to leaves, grass and light.
import { desaturate, hex, mix, rgb } from './ink'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

/** How much of each season is showing right now. The four weights always add up to 1. */
export type SeasonMix = Record<Season, number>

/** Playground-only overrides for the living environment (season, wind, weather traces). */
export interface EnvDevOptions {
  /** force a season (otherwise it comes from the date) */
  season?: Season
  /** pretend it is this date (YYYY-MM-DD) for the season; falls back to dev.today, then the real date */
  date?: string
  /** wind speed in km/h (0..80); otherwise the real wind, or a default for the sky */
  wind?: number
  /** 0..1 how wet the ground is (otherwise it follows the rain and dries afterwards) */
  wetness?: number
  /** 0..1 how much snow lies on the ground (otherwise it settles while it snows and melts afterwards) */
  snow?: number
  /** seasons are flipped south of the equator (default: from the real location, else north) */
  hemisphere?: 'north' | 'south'
}

// middle of each season, as day of the year (northern hemisphere)
const CENTRES: [Season, number][] = [
  ['winter', 20],
  ['spring', 110],
  ['summer', 201],
  ['autumn', 293],
  ['winter', 385],
]

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1)
  return (d.getTime() - start.getTime()) / 86_400_000
}

/** Season weights for a day of the year. Each season holds its own look for most of its span and blends into
 *  the next over a few weeks. */
export function seasonAt(day: number, south = false): SeasonMix {
  let d = (((day + (south ? 182.6 : 0)) % 365.25) + 365.25) % 365.25
  if (d < CENTRES[0][1]) d += 365.25
  const out: SeasonMix = { spring: 0, summer: 0, autumn: 0, winter: 0 }
  for (let i = 0; i < CENTRES.length - 1; i++) {
    const [a, da] = CENTRES[i]
    const [b, db] = CENTRES[i + 1]
    if (d >= da && d <= db) {
      const s = smoothstep(0.25, 0.75, (d - da) / (db - da))
      out[a] += 1 - s
      out[b] += s
      return out
    }
  }
  out.winter = 1
  return out
}

export function pureSeason(s: Season): SeasonMix {
  return { spring: 0, summer: 0, autumn: 0, winter: 0, [s]: 1 }
}

/** The season with the biggest weight. */
export function mainSeason(m: SeasonMix): Season {
  return SEASONS.reduce((a, b) => (m[b] > m[a] ? b : a))
}

/** Round the weights so memoised drawings are not rebuilt for tiny changes. */
export function roundMix(m: SeasonMix, step = 0.05): SeasonMix {
  const r = (v: number) => Math.round(v / step) * step
  return { spring: r(m.spring), summer: r(m.summer), autumn: r(m.autumn), winter: r(m.winter) }
}

const lum = (c: string) => {
  const [r, g, b] = hex(c)
  return (0.3 * r + 0.59 * g + 0.11 * b) / 255
}

function weighted(parts: [string, number][]): string {
  let r = 0
  let g = 0
  let b = 0
  let w = 0
  for (const [c, k] of parts) {
    if (k <= 0) continue
    const [x, y, z] = hex(c)
    r += x * k
    g += y * k
    b += z * k
    w += k
  }
  return w ? rgb([r / w, g / w, b / w]) : parts[0][0]
}

/** Leaves and grass through the year: fresh lime in spring, deep green in summer, amber and russet in autumn,
 *  dull olive in winter. `strength` 0..1 lets grass change less than tree leaves. */
export function seasonGreen(c: string, m: SeasonMix, strength = 1): string {
  const l = lum(c)
  const spring = mix(c, mix('#9fd35a', '#c9e77e', l), 0.26 * strength)
  const summer = mix(c, mix('#3f7f33', '#7fb24c', l), 0.14 * strength)
  const autumn = mix(c, mix('#a83a26', '#f0b945', Math.max(0, Math.min(1, (l - 0.25) * 2.2))), 0.62 * strength)
  const winter = mix(desaturate(c, 0.5 * strength), mix('#6f7461', '#b3b19a', l), 0.4 * strength)
  return weighted([
    [spring, m.spring],
    [summer, m.summer],
    [autumn, m.autumn],
    [winter, m.winter],
  ])
}

/** Light of the season, multiplied over everything: cool and pale in winter, warm and golden in summer/autumn. */
export function seasonLight(m: SeasonMix): { tint: string; amt: number } {
  const tint = weighted([
    ['#fff8e6', m.spring],
    ['#ffeccc', m.summer],
    ['#ffe0b0', m.autumn],
    ['#dfe8f4', m.winter],
  ])
  return { tint, amt: 0.03 * m.spring + 0.07 * m.summer + 0.08 * m.autumn + 0.1 * m.winter }
}

/** The field in the middle distance: young green shoots, golden wheat, ploughed earth, a fallow winter field. */
export function fieldColours(m: SeasonMix): [string, string] {
  return [
    weighted([['#b9cf72', m.spring], ['#e9c27f', m.summer], ['#c88d56', m.autumn], ['#b9a68a', m.winter]]),
    weighted([['#a4c062', m.spring], ['#dfa964', m.summer], ['#a8693f', m.autumn], ['#a08f76', m.winter]]),
  ]
}

/** Wind speed (km/h) to a 0..1 strength for the art: 0 still, 0.3 a breeze, 1 a gale. */
export function windStrength(kmh: number): number {
  return Math.max(0, Math.min(1, kmh / 55))
}
