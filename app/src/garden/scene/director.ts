// The wildlife director: decides who is in the garden right now so it never gets crowded. The scene has a few
// "slots" (one animal on the path, two or three small critters in front, one thing on the pond, one in the sky, one
// far away); each visit plays its story and leaves, then the slot stays quiet for a while before the next visitor.
// It rotates species so over a few minutes she sees variety, and health decides how lively it is.
import { useCallback, useEffect, useRef, useState } from 'react'

export type Slot = 'walker' | 'near' | 'pond' | 'sky' | 'far'
export const SLOTS: Slot[] = ['near', 'walker', 'pond', 'sky', 'far']
export type Mode = 'day' | 'dusk' | 'night'
export type When = 'day' | 'night' | 'any'

export interface Env {
  /** 0..1 how alive the garden is (health) */
  life: number
  mode: Mode
  /** rain or snow is falling */
  wet: boolean
  /** a grey, overcast day */
  grey: boolean
  /** the pond is there (not in a drought) */
  pond: boolean
  stage: number
  /** a clear night with a healthy garden (owl, fireflies) */
  nightLife: boolean
  /** extra weight for some species right now (e.g. the squirrel's daily visit) */
  boost?: Record<string, number>
}

export interface Entry {
  slot: Slot
  /** the least health it needs to come by */
  min: number
  when: When
  need?: (e: Env) => boolean
  weight?: number
}

export interface Visit {
  id: number
  sp: string
  slot: Slot
  seed: number
  at: number
  forced?: boolean
}

export interface DirState {
  visits: Visit[]
  /** a slot stays empty until this time */
  quiet: Record<Slot, number>
  /** when each species was last on stage */
  seen: Record<string, number>
  /** who came last to each slot (so the same animal never comes twice in a row) */
  lastBy: Partial<Record<Slot, string>>
  last: number
  nextId: number
}

/** How many visitors each slot can hold at this health. */
export function caps(life: number, mode: Mode): Record<Slot, number> {
  if (mode === 'night')
    return { walker: life >= 0.3 ? 1 : 0, near: life >= 0.7 ? 2 : life >= 0.3 ? 1 : 0, pond: 0, sky: life >= 0.3 ? 1 : 0, far: 0 }
  return {
    walker: life >= 0.35 ? 1 : 0,
    near: life >= 0.9 ? 3 : life >= 0.5 ? 2 : life >= 0.08 ? 1 : 0,
    pond: life >= 0.45 ? 1 : 0,
    sky: life >= 0.5 ? 1 : 0,
    far: life >= 0.6 ? 1 : 0,
  }
}

/** At most this many things happening at once (5 in a thriving garden, 1 in a sad one). */
export function totalCap(life: number): number {
  return life < 0.08 ? 0 : Math.min(5, 1 + Math.floor(life * 4.5))
}

const BASE_GAP: Record<Slot, number> = { walker: 15000, near: 6500, pond: 13000, sky: 20000, far: 24000 }
const FIRST: Record<Slot, number> = { walker: 3500, near: 1200, pond: 6500, sky: 9000, far: 12000 }
/** no two arrivals closer together than this */
export const SPACING = 2500

/** Quiet time after a visit: longer when the garden is struggling. */
export function gap(slot: Slot, life: number, rand: () => number): number {
  return BASE_GAP[slot] * (0.55 + (1 - Math.max(0, Math.min(1, life))) * 1.6) * (0.7 + rand() * 0.8)
}

export function initDirector(now: number, life: number, rand: () => number = Math.random): DirState {
  const f = 0.6 + (1 - life) * 0.8
  const quiet = {} as Record<Slot, number>
  for (const s of SLOTS) quiet[s] = now + FIRST[s] * f * (0.8 + rand() * 0.5)
  return { visits: [], quiet, seen: {}, lastBy: {}, last: 0, nextId: 1 }
}

export function allowed(e: Entry, env: Env): boolean {
  if (e.min > env.life) return false
  if (env.mode === 'day' && e.when === 'night') return false
  if (env.mode === 'night' && e.when === 'day') return false
  if (e.slot === 'pond' && !env.pond) return false
  return e.need ? e.need(env) : true
}

/** Choose who comes next for a slot: species not seen for a while are much more likely. */
export function pick(slot: Slot, env: Env, cat: Record<string, Entry>, s: DirState, now: number, rand: () => number): string | null {
  const onStage = new Set(s.visits.map((v) => v.sp))
  const lastHere = s.lastBy[slot]
  const all = Object.entries(cat).filter(([id, e]) => e.slot === slot && !onStage.has(id) && allowed(e, env))
  if (!all.length) return null
  const fresh = all.length > 1 ? all.filter(([id]) => id !== lastHere) : all
  const scored = fresh.map(([id, e]) => {
    const seen = s.seen[id]
    const age = seen === undefined ? 1.4 : Math.min(1.2, 0.05 + (now - seen) / 240000)
    return [id, (e.weight ?? 1) * (env.boost?.[id] ?? 1) * age] as const
  })
  const sum = scored.reduce((a, [, w]) => a + w, 0)
  let x = rand() * sum
  for (const [id, w] of scored) {
    x -= w
    if (x <= 0) return id
  }
  return scored[scored.length - 1][0]
}

function add(s: DirState, sp: string, slot: Slot, now: number, rand: () => number, forced = false): DirState {
  const v: Visit = { id: s.nextId, sp, slot, seed: Math.floor(rand() * 1e9), at: now, forced }
  return { ...s, visits: [...s.visits, v], seen: { ...s.seen, [sp]: now }, lastBy: { ...s.lastBy, [slot]: sp }, last: now, nextId: s.nextId + 1 }
}

/** One step of the director: maybe let one new visitor in. Returns the same object when nothing changes. */
export function tick(s: DirState, env: Env, cat: Record<string, Entry>, now: number, rand: () => number = Math.random): DirState {
  if (s.visits.length >= totalCap(env.life) || now - s.last < SPACING) return s
  const cap = caps(env.life, env.mode)
  for (const slot of SLOTS) {
    if (now < s.quiet[slot]) continue
    if (s.visits.filter((v) => v.slot === slot).length >= cap[slot]) continue
    const sp = pick(slot, env, cat, s, now, rand)
    if (!sp) {
      s = { ...s, quiet: { ...s.quiet, [slot]: now + 8000 } }
      continue
    }
    const next = add(s, sp, slot, now, rand)
    // a slot that can hold several still spaces its arrivals out
    if (cap[slot] > 1) next.quiet = { ...next.quiet, [slot]: now + gap(slot, env.life, rand) * 0.6 }
    return next
  }
  return s
}

/** A visitor has finished its story: the slot rests for a while. */
export function finish(s: DirState, id: number, env: Env, now: number, rand: () => number = Math.random): DirState {
  const v = s.visits.find((x) => x.id === id)
  if (!v) return s
  const rest = Math.max(s.quiet[v.slot], now + gap(v.slot, env.life, rand))
  return { ...s, visits: s.visits.filter((x) => x.id !== id), quiet: { ...s.quiet, [v.slot]: rest } }
}

/** Send a species on stage now (the playground). Makes room in its slot if needed. */
export function force(s: DirState, sp: string, cat: Record<string, Entry>, now: number, rand: () => number = Math.random): DirState {
  const e = cat[sp]
  if (!e) return s
  const room = e.slot === 'near' ? 2 : 1
  let visits = s.visits.filter((v) => v.sp !== sp)
  const here = visits.filter((v) => v.slot === e.slot)
  if (here.length >= room) {
    const drop = new Set(here.slice(0, here.length - room + 1).map((v) => v.id))
    visits = visits.filter((v) => !drop.has(v.id))
  }
  return add({ ...s, visits }, sp, e.slot, now, rand, true)
}

export function clearStage(s: DirState, now: number): DirState {
  if (!s.visits.length) return s
  const quiet = { ...s.quiet }
  for (const slot of SLOTS) quiet[slot] = Math.max(quiet[slot], now + FIRST[slot] * 0.5)
  return { ...s, visits: [], quiet }
}

/** React hook around the director. `on` is false while the page is hidden or motion is reduced. */
export function useDirector(env: Env, cat: Record<string, Entry>, opt: { on: boolean; auto: boolean; force?: { sp: string; id: number } }) {
  const [st, setSt] = useState(() => initDirector(Date.now(), env.life))
  const envRef = useRef(env)
  envRef.current = env
  const autoRef = useRef(opt.auto)
  autoRef.current = opt.auto
  useEffect(() => {
    if (!opt.on) {
      setSt((s) => clearStage(s, Date.now()))
      return
    }
    const t = setInterval(() => {
      if (autoRef.current) setSt((s) => tick(s, envRef.current, cat, Date.now()))
    }, 1000)
    return () => clearInterval(t)
  }, [opt.on, cat])
  useEffect(() => {
    if (opt.force && opt.on) setSt((s) => force(s, opt.force!.sp, cat, Date.now()))
  }, [opt.force?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const done = useCallback((id: number) => setSt((s) => finish(s, id, envRef.current, Date.now())), [])
  return { state: st, done }
}
