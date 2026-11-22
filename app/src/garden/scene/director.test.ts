import { describe, expect, it } from 'vitest'
import { rng } from './ink'
import { caps, finish, force, initDirector, SLOTS, tick, totalCap, type DirState, type Entry, type Env } from './director'

const cat: Record<string, Entry> = {
  rabbit: { slot: 'walker', min: 0.35, when: 'day' },
  fox: { slot: 'walker', min: 0.6, when: 'day' },
  nova: { slot: 'walker', min: 0.45, when: 'day' },
  badger: { slot: 'walker', min: 0.3, when: 'night' },
  ladybird: { slot: 'near', min: 0.1, when: 'day' },
  ant: { slot: 'near', min: 0.1, when: 'day' },
  robin: { slot: 'near', min: 0.5, when: 'day' },
  mouse: { slot: 'near', min: 0.6, when: 'day' },
  moth: { slot: 'near', min: 0.3, when: 'night' },
  owl: { slot: 'near', min: 0.3, when: 'night', need: (e) => e.nightLife },
  duck: { slot: 'pond', min: 0.55, when: 'day' },
  fish: { slot: 'pond', min: 0.55, when: 'day' },
  swallow: { slot: 'sky', min: 0.5, when: 'day' },
  bat: { slot: 'sky', min: 0.3, when: 'night' },
  sheep: { slot: 'far', min: 0.6, when: 'day' },
  horse: { slot: 'far', min: 0.85, when: 'day' },
}
const env = (life: number, mode: Env['mode'] = 'day'): Env => ({ life, mode, wet: false, grey: false, pond: true, stage: 10, nightLife: true })

/** Run the director for a while: every visit lasts `stay` ms. Returns every state seen and all arrivals. */
function simulate(e: Env, minutes: number, stay = 25000, seed = 1) {
  const r = rng(seed)
  let s: DirState = initDirector(0, e.life, r.next)
  const seen: string[] = []
  let peak = 0
  for (let t = 0; t < minutes * 60000; t += 1000) {
    for (const v of s.visits) if (t - v.at >= stay) s = finish(s, v.id, e, t, r.next)
    const before = s.nextId
    s = tick(s, e, cat, t, r.next)
    if (s.nextId !== before) seen.push(s.visits[s.visits.length - 1].sp)
    peak = Math.max(peak, s.visits.length)
    const c = caps(e.life, e.mode)
    for (const slot of SLOTS) expect(s.visits.filter((v) => v.slot === slot).length).toBeLessThanOrEqual(c[slot])
    expect(s.visits.length).toBeLessThanOrEqual(totalCap(e.life))
  }
  return { seen, peak }
}

describe('wildlife director', () => {
  it('keeps the garden calm: one walker, a few critters, a handful at most', () => {
    const c = caps(1, 'day')
    expect(c.walker).toBe(1)
    expect(c.near).toBeLessThanOrEqual(3)
    expect(c.sky).toBe(1)
    expect(c.far).toBe(1)
    expect(totalCap(1)).toBeLessThanOrEqual(5)
    const { peak } = simulate(env(1), 10)
    expect(peak).toBeLessThanOrEqual(5)
  })

  it('lets fewer visitors in when the garden is struggling', () => {
    expect(totalCap(0.02)).toBe(0)
    expect(totalCap(0.3)).toBeLessThan(totalCap(1))
    const low = simulate(env(0.3), 10).seen.length
    const high = simulate(env(1), 10).seen.length
    expect(low).toBeLessThan(high)
    expect(simulate(env(0.02), 5).seen).toHaveLength(0)
  })

  it('rotates species so she sees variety over a few minutes', () => {
    const { seen } = simulate(env(1), 6)
    expect(new Set(seen).size).toBeGreaterThanOrEqual(10)
    // never the same walker twice in a row
    const walkers = seen.filter((s) => cat[s].slot === 'walker')
    for (let i = 1; i < walkers.length; i++) expect(walkers[i]).not.toBe(walkers[i - 1])
  })

  it('shows only night creatures at night', () => {
    const { seen } = simulate(env(1, 'night'), 10)
    expect(seen.length).toBeGreaterThan(0)
    for (const s of seen) expect(cat[s].when).not.toBe('day')
  })

  it('can send any species on stage at once, making room in its slot', () => {
    let s = initDirector(0, 1)
    s = force(s, 'rabbit', cat, 0)
    s = force(s, 'fox', cat, 10)
    expect(s.visits.map((v) => v.sp)).toEqual(['fox'])
    s = force(s, 'owl', cat, 20)
    expect(s.visits.some((v) => v.sp === 'owl')).toBe(true)
  })
})
