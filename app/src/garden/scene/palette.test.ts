import { describe, expect, it } from 'vitest'
import { moonArc, palette, sunArc } from './palette'
import { mainSeason, pureSeason, seasonAt } from './season'
import { stepTraces } from './traces'

describe('sky', () => {
  it('never shows the sun and the moon at the same time', () => {
    for (let h = 0; h < 24; h += 0.05) expect(sunArc(h) !== null && moonArc(h) !== null).toBe(false)
  })
})

describe('seasons', () => {
  it('weights always add up to one and follow the calendar', () => {
    for (let d = 0; d < 366; d += 3) {
      const m = seasonAt(d)
      expect(m.spring + m.summer + m.autumn + m.winter).toBeCloseTo(1, 5)
    }
    expect(mainSeason(seasonAt(20))).toBe('winter')
    expect(mainSeason(seasonAt(110))).toBe('spring')
    expect(mainSeason(seasonAt(201))).toBe('summer')
    expect(mainSeason(seasonAt(293))).toBe('autumn')
    expect(mainSeason(seasonAt(201, true))).toBe('winter')
  })
  it('snow whitens the ground', () => {
    const bare = palette(12, 'sunny', 0, { season: pureSeason('winter'), snow: 0, wet: 0 })
    const white = palette(12, 'sunny', 0, { season: pureSeason('winter'), snow: 1, wet: 0 })
    const lum = (c: string) => parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16)
    expect(lum(white.c.near)).toBeGreaterThan(lum(bare.c.near) + 150)
  })
})

describe('weather traces', () => {
  it('rain wets the ground at once and it dries afterwards', () => {
    let t = stepTraces({ wet: 0, snow: 0 }, 'rain', 0.01)
    expect(t.wet).toBeGreaterThanOrEqual(0.7)
    t = stepTraces(t, 'clear', 240)
    expect(t.wet).toBeLessThan(0.05)
  })
  it('snow settles while it snows and melts faster when warm', () => {
    const s = stepTraces({ wet: 0, snow: 0 }, 'snow', 30)
    expect(s.snow).toBeGreaterThan(0.85)
    const cold = stepTraces(s, 'clear', 60, -3)
    const warm = stepTraces(s, 'clear', 60, 8)
    expect(warm.snow).toBeLessThan(cold.snow)
    expect(warm.wet).toBeGreaterThan(0.3)
  })
})
