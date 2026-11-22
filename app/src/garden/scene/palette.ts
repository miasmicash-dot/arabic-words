// Colours of the scene by time of day and weather. Everything painted goes through `shade`.
import type { Weather } from '../types'
import { desaturate, mix, multiply } from './ink'
import { fieldColours, pureSeason, seasonGreen, seasonLight, type SeasonMix } from './season'

type Key = { h: number; top: string; mid: string; bottom: string; tint: string; amt: number; glow: string }

// Sky gradient and landscape light, keyed by local hour.
const KEYS: Key[] = [
  { h: 0, top: '#050d2a', mid: '#0c2048', bottom: '#1a3c60', tint: '#465a94', amt: 0.62, glow: '#40508a' },
  { h: 4.6, top: '#071030', mid: '#102552', bottom: '#22466a', tint: '#4a5c96', amt: 0.6, glow: '#48558a' },
  { h: 5.7, top: '#2a3a70', mid: '#7a6a96', bottom: '#eba584', tint: '#b07c8a', amt: 0.42, glow: '#ffb88a' },
  { h: 6.8, top: '#86b7d2', mid: '#d5d9d0', bottom: '#f8ddb0', tint: '#ffd9b0', amt: 0.18, glow: '#ffe2a8' },
  { h: 8.5, top: '#a8d4e3', mid: '#d6e8e2', bottom: '#f3eccc', tint: '#fff6e0', amt: 0.05, glow: '#fff3c4' },
  { h: 12, top: '#a4d2e4', mid: '#d3e9e6', bottom: '#f2f0d4', tint: '#ffffff', amt: 0, glow: '#fff8d8' },
  { h: 15.8, top: '#a9d1e0', mid: '#dbe7dc', bottom: '#f5ebc8', tint: '#fff2d8', amt: 0.06, glow: '#ffeec0' },
  { h: 17.6, top: '#93bcd4', mid: '#e8d6b4', bottom: '#f8c582', tint: '#f6b066', amt: 0.26, glow: '#ffc070' },
  { h: 18.8, top: '#56639a', mid: '#c4859a', bottom: '#f09a6c', tint: '#c07a7a', amt: 0.4, glow: '#ff9a6a' },
  { h: 19.8, top: '#26315f', mid: '#4f4a7c', bottom: '#8a6488', tint: '#4a4a7a', amt: 0.55, glow: '#9a6a8a' },
  { h: 20.8, top: '#081436', mid: '#122a56', bottom: '#24486c', tint: '#4a5c96', amt: 0.6, glow: '#465488' },
  { h: 24, top: '#050d2a', mid: '#0c2048', bottom: '#1a3c60', tint: '#465a94', amt: 0.62, glow: '#40508a' },
]

function at(h: number) {
  const hh = ((h % 24) + 24) % 24
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= hh) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = (hh - a.h) / (b.h - a.h)
  const s = t * t * (3 - 2 * t)
  return {
    top: mix(a.top, b.top, s),
    mid: mix(a.mid, b.mid, s),
    bottom: mix(a.bottom, b.bottom, s),
    tint: mix(a.tint, b.tint, s),
    amt: a.amt + (b.amt - a.amt) * s,
    glow: mix(a.glow, b.glow, s),
  }
}

/** 0 at full day, 1 at deep night, smooth through dawn and dusk. */
export function nightness(h: number): number {
  const hh = ((h % 24) + 24) % 24
  const ramp = (x: number, a: number, b: number) => Math.max(0, Math.min(1, (x - a) / (b - a)))
  if (hh < 12) return 1 - ramp(hh, 5.2, 6.8)
  return ramp(hh, 18.9, 20.6)
}

/** Sun (0..1 progress across the sky) or null when below the horizon. */
export function sunArc(h: number): number | null {
  if (h < 5.6 || h > 19.6) return null
  return (h - 5.6) / 14
}

/** Moon progress across the sky (evening to morning) or null in the day. It rises after the sun has set and sets
 *  before the sun rises, so the two are never in the sky together. */
export function moonArc(h: number): number | null {
  const hh = h < 12 ? h + 24 : h
  if (hh < 19.9 || hh > 29.3) return null
  return (hh - 19.9) / 9.4
}

// Daylight landscape colours (sunny), and their dry versions for drought.
const BASE = {
  farHill: '#86b97a',
  farHill2: '#aed39e',
  midA: '#a4c873',
  midB: '#8dbb62',
  ochre: '#dfa964',
  ochre2: '#e9c27f',
  near: '#a8d06f',
  near2: '#93c25f',
  front: '#83b655',
  front2: '#6ea548',
  path: '#efe4b8',
  pathEdge: '#d8c792',
  soil: '#8a5c3b',
  pond: '#9fd2dc',
  bush: '#6ea852',
  bushDark: '#4f8a40',
  bushLight: '#97c868',
  grass: '#6fa54a',
  ink: '#2c3632',
  bark: '#8b6a4c',
  barkDark: '#5f4632',
  stem: '#86bc5a',
}
const DRY: Partial<typeof BASE> = {
  farHill: '#c9bb9a',
  farHill2: '#ddd2b6',
  midA: '#d5bb80',
  midB: '#c8a76a',
  ochre: '#d8995a',
  ochre2: '#e6b778',
  near: '#d8bf86',
  near2: '#cbae72',
  front: '#c3a066',
  front2: '#ad8a55',
  path: '#f1e3bd',
  pond: '#a98b66',
  bush: '#a69458',
  bushDark: '#857345',
  bushLight: '#c2ae70',
  grass: '#b09356',
  stem: '#b3a35e',
}

export type Colors = typeof BASE

/** The living environment: season weights and the traces weather has left on the ground. */
export interface PaletteEnv {
  season: SeasonMix
  /** 0..1 settled snow */
  snow: number
  /** 0..1 wet ground */
  wet: number
}
const DEFAULT_ENV: PaletteEnv = { season: pureSeason('summer'), snow: 0, wet: 0 }

// how strongly the season changes each colour (tree leaves change most, far hills least)
const SEASONAL: Partial<Record<keyof Colors, number>> = {
  farHill: 0.55, farHill2: 0.5, midA: 0.65, midB: 0.65, near: 0.7, near2: 0.7, front: 0.7, front2: 0.7,
  bush: 0.8, bushDark: 0.8, bushLight: 0.8, grass: 0.7, stem: 0.5,
}
// how white each colour gets under a full snow cover (bushes and grass blades keep some colour)
const SNOWY: Partial<Record<keyof Colors, number>> = {
  farHill: 0.82, farHill2: 0.85, midA: 0.86, midB: 0.86, ochre: 0.84, ochre2: 0.86, near: 0.9, near2: 0.88,
  front: 0.9, front2: 0.86, path: 0.78, pathEdge: 0.6, bush: 0.3, bushLight: 0.45, bushDark: 0.15, grass: 0.35,
}
const WETTABLE: Partial<Record<keyof Colors, number>> = {
  midA: 0.5, midB: 0.5, ochre: 0.7, ochre2: 0.7, near: 0.8, near2: 0.8, front: 0.9, front2: 0.9, path: 1, pathEdge: 1, soil: 1,
}
const SNOW = '#f3f6fa'

export interface Palette {
  sky: { top: string; mid: string; bottom: string; glow: string }
  c: Colors
  /** Apply the scene's light (time of day) and weather to any colour. */
  shade: (c: string) => string
  night: number
  weather: Weather
  hour: number
  /** 0 = thriving and colourful, 1 = the plant has died and everything is grey */
  gloom: number
  /** season weights (smooth through the year) */
  season: SeasonMix
  /** 0..1 settled snow */
  snow: number
  /** 0..1 wet ground */
  wet: number
  /** `shade` for leaves and grass: also follows the season (amber in autumn, olive in winter). */
  leaf: (c: string, strength?: number) => string
}

export function palette(hour: number, weather: Weather, gloom = 0, env: PaletteEnv = DEFAULT_ENV): Palette {
  const k = at(hour)
  const night = nightness(hour)
  const sea = env.season
  const sl = seasonLight(sea)
  const slAmt = sl.amt * (1 - night * 0.7)
  const g = Math.max(0, Math.min(1, gloom))
  // a neglected garden loses its colour little by little, until it is almost monotone
  const desat = 1 - (1 - { sunny: 0, 'partly-cloudy': 0.12, overcast: 0.5, drought: 0.15 }[weather]) * (1 - g * 0.88)
  const darken = { sunny: 0, 'partly-cloudy': 0.03, overcast: 0.2, drought: 0 }[weather] + g * 0.1
  const shade = (c: string) => {
    let x = desaturate(c, desat)
    if (darken) x = multiply(x, '#8d97a0', darken * 2.2)
    if (weather === 'drought') x = multiply(x, '#fff0d0', 0.4)
    if (slAmt > 0.001) x = multiply(x, sl.tint, slAmt)
    return multiply(x, k.tint, k.amt)
  }
  const leaf = (c: string, strength = 1) => shade(seasonGreen(c, sea, strength))

  let { top, mid, bottom, glow } = k
  if (weather === 'partly-cloudy') {
    top = mix(top, '#c7d4da', 0.18 * (1 - night))
    mid = mix(mid, '#dfe3e0', 0.12 * (1 - night))
  } else if (weather === 'overcast') {
    const grey = mix('#9aa3aa', '#2a3140', night)
    top = mix(top, grey, 0.75)
    mid = mix(mid, mix('#b4bbbf', '#323a4a', night), 0.75)
    bottom = mix(bottom, mix('#c5c8c4', '#3a4252', night), 0.7)
    glow = mix(glow, '#c8cccc', 0.6)
  } else if (weather === 'drought') {
    top = mix(top, mix('#d9d7c0', '#1a2240', night), 0.45)
    mid = mix(mid, mix('#efe2bc', '#2c3050', night), 0.45)
    bottom = mix(bottom, mix('#f6dfae', '#3a3a58', night), 0.5)
  }

  // seasons in the sky: pale and cool in winter, a deeper blue in summer, a golden haze low down in autumn
  const dayK = 1 - night
  top = mix(top, '#b7cad8', 0.28 * sea.winter * dayK)
  mid = mix(mid, '#dfe6ea', 0.2 * sea.winter * dayK)
  top = mix(top, '#7dbde4', 0.16 * sea.summer * dayK * (weather === 'overcast' ? 0.3 : 1))
  bottom = mix(bottom, '#f6d9a6', 0.14 * sea.autumn * dayK)

  if (g > 0) {
    const grey = (x: string, dn: string, amt: number) => mix(desaturate(x, g), mix(dn, '#1c2230', night), amt)
    top = grey(top, '#a7adb2', g * 0.55)
    mid = grey(mid, '#bfc3c4', g * 0.5)
    bottom = grey(bottom, '#cfd0cb', g * 0.45)
    glow = desaturate(glow, g * 0.8)
  }

  const [field, field2] = fieldColours(sea)
  const seasonal = { ...BASE, ochre: field2, ochre2: field }
  // grass stays mostly green through autumn (only the trees and bushes really turn)
  const groundSea = { ...sea, summer: sea.summer + sea.autumn * 0.6, autumn: sea.autumn * 0.4 }
  for (const [n, k] of Object.entries(SEASONAL) as [keyof Colors, number][]) seasonal[n] = seasonGreen(seasonal[n], n.startsWith('bush') ? sea : groundSea, k)
  // a frozen pond looks pale in deep winter snow
  if (env.snow > 0.3 && sea.winter > 0.5) seasonal.pond = mix(seasonal.pond, '#dcecf2', 0.5 * env.snow)
  const c = { ...seasonal, ...(weather === 'drought' ? DRY : {}) }
  for (const [n, k] of Object.entries(WETTABLE) as [keyof Colors, number][]) if (env.wet > 0) c[n] = multiply(c[n], '#6f7d80', env.wet * k * 0.32)
  for (const [n, k] of Object.entries(SNOWY) as [keyof Colors, number][]) if (env.snow > 0) c[n] = mix(c[n], SNOW, env.snow * k)
  const lit = Object.fromEntries(Object.entries(c).map(([n, v]) => [n, n === 'ink' ? mix(v, '#0e1424', night * 0.5) : shade(v)])) as Colors
  return { sky: { top, mid, bottom, glow }, c: lit, shade, night, weather, hour, gloom: g, season: sea, snow: env.snow, wet: env.wet, leaf }
}
