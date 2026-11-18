// Colours of the scene by time of day and weather. Everything painted goes through `shade`.
import type { Weather } from '../types'
import { desaturate, mix, multiply } from './ink'

type Key = { h: number; top: string; mid: string; bottom: string; tint: string; amt: number; glow: string }

// Sky gradient and landscape light, keyed by local hour.
const KEYS: Key[] = [
  { h: 0, top: '#0a1430', mid: '#13214a', bottom: '#1f2d58', tint: '#2a3768', amt: 0.66, glow: '#40508a' },
  { h: 4.6, top: '#0c1734', mid: '#17254f', bottom: '#28365e', tint: '#2d3a6a', amt: 0.64, glow: '#48558a' },
  { h: 5.7, top: '#2a3a70', mid: '#7a6a96', bottom: '#eba584', tint: '#b07c8a', amt: 0.42, glow: '#ffb88a' },
  { h: 6.8, top: '#86b7d2', mid: '#d5d9d0', bottom: '#f8ddb0', tint: '#ffd9b0', amt: 0.18, glow: '#ffe2a8' },
  { h: 8.5, top: '#a8d4e3', mid: '#d6e8e2', bottom: '#f3eccc', tint: '#fff6e0', amt: 0.05, glow: '#fff3c4' },
  { h: 12, top: '#a4d2e4', mid: '#d3e9e6', bottom: '#f2f0d4', tint: '#ffffff', amt: 0, glow: '#fff8d8' },
  { h: 15.8, top: '#a9d1e0', mid: '#dbe7dc', bottom: '#f5ebc8', tint: '#fff2d8', amt: 0.06, glow: '#ffeec0' },
  { h: 17.6, top: '#93bcd4', mid: '#e8d6b4', bottom: '#f8c582', tint: '#f6b066', amt: 0.26, glow: '#ffc070' },
  { h: 18.8, top: '#56639a', mid: '#c4859a', bottom: '#f09a6c', tint: '#c07a7a', amt: 0.4, glow: '#ff9a6a' },
  { h: 19.8, top: '#26315f', mid: '#4f4a7c', bottom: '#8a6488', tint: '#4a4a7a', amt: 0.55, glow: '#9a6a8a' },
  { h: 20.8, top: '#0f1a3c', mid: '#1a2850', bottom: '#2a3660', tint: '#2d3a6a', amt: 0.64, glow: '#465488' },
  { h: 24, top: '#0a1430', mid: '#13214a', bottom: '#1f2d58', tint: '#2a3768', amt: 0.66, glow: '#40508a' },
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

/** Moon progress across the sky (evening to morning) or null in the day. */
export function moonArc(h: number): number | null {
  const hh = h < 12 ? h + 24 : h
  if (hh < 18.6 || hh > 30.6) return null
  return (hh - 18.6) / 12
}

// Daylight landscape colours (sunny), and their dry versions for drought.
const BASE = {
  farHill: '#93c2bb',
  farHill2: '#b5d5cf',
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

export interface Palette {
  sky: { top: string; mid: string; bottom: string; glow: string }
  c: Colors
  /** Apply the scene's light (time of day) and weather to any colour. */
  shade: (c: string) => string
  night: number
  weather: Weather
  hour: number
}

export function palette(hour: number, weather: Weather): Palette {
  const k = at(hour)
  const night = nightness(hour)
  const desat = { sunny: 0, 'partly-cloudy': 0.12, overcast: 0.5, drought: 0.15 }[weather]
  const darken = { sunny: 0, 'partly-cloudy': 0.03, overcast: 0.2, drought: 0 }[weather]
  const shade = (c: string) => {
    let x = desaturate(c, desat)
    if (darken) x = multiply(x, '#8d97a0', darken * 2.2)
    if (weather === 'drought') x = multiply(x, '#fff0d0', 0.4)
    return multiply(x, k.tint, k.amt)
  }

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

  const c = { ...BASE, ...(weather === 'drought' ? DRY : {}) }
  const lit = Object.fromEntries(Object.entries(c).map(([n, v]) => [n, n === 'ink' ? mix(v, '#0e1424', night * 0.5) : shade(v)])) as Colors
  return { sky: { top, mid, bottom, glow }, c: lit, shade, night, weather, hour }
}
