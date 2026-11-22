// Shared pieces for the species stories: what a story knows about the scene, a helper that turns a story and a tap
// reaction into a visiting animal, and a few places animals like to go (flowers on the plant, the fence).
import { useMemo, useState, type ReactNode } from 'react'
import { rng, type Rng } from './ink'
import { Actor, type Beat, type Look, type TapAt, type UnderProps, type P } from './actor'
import type { Entry } from './director'
import type { EggMemory } from './eggMemory'
import type { Palette } from './palette'
import { FENCE } from './Critters'

export type Layer = 'sky' | 'far' | 'pond' | 'front'

export interface Ctx {
  pal: Palette
  /** the main plant: base and drawn height in scene units, and whether it is a tree */
  plant: { x: number; y: number; h: number; tree: boolean }
  /** what the camera shows (young plants are zoomed in) */
  view: { x0: number; x1: number }
  burrow: boolean
  stage: number
  /** for the scene: a sound, an apple eaten */
  call: (name: string) => void
  /** reduced motion: a calm still picture */
  still: boolean
  /** the squirrel's once-a-day nut burying, when it has not happened yet today */
  daily: null | { today: string; memory: EggMemory; onBury: (x: number) => void }
}

export interface VisitProps {
  seed: number
  ctx: Ctx
  onDone: () => void
}

export interface Species extends Entry {
  /** the name in the species list */
  name: string
  icon: string
  layer: Layer
  /** one line: the story she will see */
  tale: string
  Comp: (p: VisitProps) => ReactNode
}

export const int = (r: Rng, a: number, b: number) => Math.floor(r.range(a, b + 1))
export const chance = (r: Rng, p: number) => r.next() < p

/** x just off the edge the animal enters from (dir 1 = walking right, so it starts off the left edge) */
export const offEdge = (c: Ctx, dir: number, margin = 70) => (dir > 0 ? c.view.x0 - margin : c.view.x1 + margin)

/** A flower or leaf on the main plant, or a meadow flower when the plant is still tiny. */
export function flower(c: Ctx, r: Rng): P {
  const { x, y, h, tree } = c.plant
  if (h < 45) return [r.range(c.view.x0 + 60, c.view.x1 - 60), r.range(626, 648)]
  if (tree) {
    const top = c.stage >= 10 ? 330 : 230
    return [x + r.range(-0.36, 0.36) * top, y - top * r.range(0.45, 0.95)]
  }
  return [x + r.range(-0.28, 0.28) * h, y - h * r.range(0.4, 0.92)]
}

/** A perch on the farmer's fence: one of the two posts or somewhere on the top rail. */
export function perch(r: Rng): P {
  const n = r.next()
  if (n < 0.25) return FENCE.postL
  if (n < 0.5) return FENCE.postR
  return FENCE.rail(r.pick([-26, -14, 12, 24]))
}

export interface Simple {
  k: number
  hit?: [number, number, number, number]
  head?: P
  shadow?: number
  cls?: string
  vars?: React.CSSProperties
  draw: (a: { s: (c: string) => string; ink: string; pal: Palette; pose: string; look: Look }) => ReactNode
  story: (r: Rng, c: Ctx) => Beat[]
  tap?: (at: TapAt, r: Rng, c: Ctx) => Beat[] | null
  under?: (u: UnderProps, c: Ctx) => ReactNode
}

/** A visit by one animal: its story is written once when it arrives (seeded, so every visit differs). */
export function simple(o: Simple) {
  return function Visit({ seed, ctx, onDone }: VisitProps) {
    const [beats] = useState(() => o.story(rng(seed), ctx))
    const tr = useMemo(() => rng(seed ^ 0x5bd1), [seed])
    return (
      <Actor
        beats={beats}
        k={o.k}
        hit={o.hit}
        head={o.head}
        shadow={o.shadow}
        cls={o.cls}
        vars={o.vars}
        still={ctx.still}
        onDone={onDone}
        onCall={ctx.call}
        tap={o.tap ? (at) => o.tap!(at, tr, ctx) : undefined}
        under={o.under ? (u) => o.under!(u, ctx) : undefined}
        art={(look) => o.draw({ s: ctx.pal.shade, ink: ctx.pal.c.ink, pal: ctx.pal, pose: look.pose, look })}
      />
    )
  }
}

/** A circle of points (for loops, spirals and soaring), starting at angle a0. */
export function ring(cx: number, cy: number, rx: number, ry: number, n: number, a0 = 0, turns = 1): P[] {
  return Array.from({ length: n }, (_, i) => {
    const a = a0 + ((i + 1) / n) * Math.PI * 2 * turns
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P
  })
}

/** Pad a list of beats with a wait so it lasts `total` ms (for groups that leave together). */
export function padTo(beats: Beat[], total: number, pose?: string): Beat[] {
  const t = beats.reduce((a, b) => a + b.ms, 0)
  return t < total ? [...beats, { ms: total - t, pose }] : beats
}

export const dur = (beats: Beat[]) => beats.reduce((a, b) => a + b.ms, 0)
