// The growing plant: seed -> sprout -> leafy plant -> tree. Drawn procedurally in a hand-inked style.
import { memo, useMemo, type ReactNode } from 'react'
import type { GrowthStage } from '../types'
import { brush, mix, resample, rng, scallop, smooth, type P, type Rng } from './ink'
import type { Palette } from './palette'

// ---------- model ----------

interface LeafM {
  x: number
  y: number
  /** degrees, 0 = pointing right, -90 = up */
  a: number
  len: number
  wid: number
  rank: number
  coty?: boolean
}
interface ClumpM {
  x: number
  y: number
  r: number
  rank: number
  tone: 0 | 1 | 2
  path: string
  hi: string
  /** small leaf dabs: lit side, shaded side, and leaves sticking out of the edge */
  light: string
  dark: string
  rim: string
  /** where the broken ink outline starts (0..100) */
  dash: number
}
interface BarkM {
  /** darker band down the side away from the sun */
  shadow: string
  /** thin light line on the sunny side */
  hi: string
  /** broken furrows that follow the limb */
  furrows: string
  w: number
}
interface BranchM {
  base: P
  path: string
  bark?: BarkM
  /** -1 left, 1 right: which way it droops */
  side: number
  depth: number
  rank: number
  /** true for the finest twigs (hidden first when wilting) */
  twig: boolean
  /** grows on from the parent's tip: drawn over the parent so the parent's end never shows */
  cont?: boolean
  kids: BranchM[]
  leaves: LeafM[]
  buds: P[]
  /** little blossoms on a full-grown plant (stage 8) */
  blooms: P[]
}
export type FruitKind = 'apple' | 'orange' | 'pear' | 'lemon' | 'pomegranate'
/** Blossoms (young tree) or fruit (grown tree), merged into a few paths per group so they draw fast. */
interface CropM {
  /** three groups: the first to drop when the tree gets thirsty is group 0 */
  groups: { a: string; b: string; c: string; d: string }[]
  fallen: string
}
interface PlantM {
  kind: 'seed' | 'herb' | 'tree'
  root: BranchM | null
  clumps: ClumpM[]
  roots: string
  height: number
  stage: GrowthStage
  fruit: FruitKind
  blossoms: CropM | null
  fruits: CropM | null
}

const deg = (a: number) => (a * Math.PI) / 180
const dirv = (a: number): P => [Math.cos(deg(a)), Math.sin(deg(a))]
const add = (p: P, v: P, k: number): P => [p[0] + v[0] * k, p[1] + v[1] * k]
const at = (pts: P[], t: number): P => {
  const s = resample(pts, 21)
  return s[Math.round(t * 20)]
}
const angleAt = (pts: P[], t: number) => {
  const s = resample(pts, 21)
  const i = Math.max(1, Math.round(t * 20))
  const a = s[i - 1]
  const b = s[i]
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
}

/** Unit normal of a sampled centre line at index i. For a line going up it points to the right (+x). */
function normalAt(c: P[], i: number): P {
  const a = c[Math.max(0, i - 1)]
  const b = c[Math.min(c.length - 1, i + 1)]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  return [-dy / l, dx / l]
}

/** Like brush(), but the width follows a function of t (0 at the base, 1 at the tip). */
function brushW(pts: P[], wAt: (t: number) => number, r: Rng, wob = 0.03, n = 30): string {
  const c = resample(pts, n)
  const left: P[] = []
  const right: P[] = []
  for (let i = 0; i < n; i++) {
    const [nx, ny] = normalAt(c, i)
    const h = (wAt(i / (n - 1)) * (1 + r.range(-wob, wob))) / 2
    left.push([c[i][0] - nx * h, c[i][1] - ny * h])
    right.push([c[i][0] + nx * h, c[i][1] + ny * h])
  }
  return smooth([...left, ...right.reverse()], true)
}

/** Points along the centre line, pushed sideways by u (−0.5 = left edge, 0.5 = right edge). */
function offsetLine(c: P[], wAt: (t: number) => number, u: (t: number) => number, t0: number, t1: number, jit: number, r: Rng): P[] {
  const n = c.length
  const out: P[] = []
  for (let i = Math.round(t0 * (n - 1)); i <= Math.round(t1 * (n - 1)); i++) {
    const t = i / (n - 1)
    const [nx, ny] = normalAt(c, i)
    const off = u(t) * wAt(t) + r.range(-jit, jit)
    out.push([c[i][0] + nx * off, c[i][1] + ny * off])
  }
  return out
}

/** Rounded bark: a shaded side, a sunlit edge and furrows that follow the curve of the limb. */
function barkOf(pts: P[], wAt: (t: number) => number, r: Rng, furrows: number): BarkM {
  const c = resample(pts, 34)
  const a = offsetLine(c, wAt, () => 0.08, 0, 0.96, 0, r)
  const b = offsetLine(c, wAt, () => 0.46, 0, 0.96, 0, r)
  const lines: string[] = []
  for (let k = 0; k < furrows; k++) {
    const u0 = -0.4 + (0.8 * (k + 0.5)) / furrows + r.range(-0.04, 0.04)
    const ph = r.range(0, 6)
    let t = r.range(0, 0.08)
    while (t < 0.9) {
      const t2 = Math.min(0.95, t + r.range(0.1, 0.32))
      if (t2 - t > 0.06 && r.next() < 0.85) {
        const seg = offsetLine(c, wAt, (tt) => u0 + 0.05 * Math.sin(tt * 11 + ph), t, t2, wAt(t) * 0.015, r)
        if (seg.length > 1) lines.push(smooth(seg))
      }
      t = t2 + r.range(0.02, 0.09)
    }
  }
  return {
    shadow: smooth([...a, ...b.reverse()], true),
    hi: smooth(offsetLine(c, wAt, () => -0.32, 0.02, 0.88, 0, r)),
    furrows: lines.join(' '),
    w: wAt(0),
  }
}

function mkBranch(r: Rng, pts: P[], w0: number, w1: number, depth: number, side: number, twig = false): BranchM {
  return {
    base: pts[0],
    path: brush(pts, w0, w1, r, { taperIn: 0, taperOut: twig ? 0.6 : 0.25, wobble: 0.1 }),
    side,
    depth,
    rank: r.next(),
    twig,
    kids: [],
    leaves: [],
    buds: [],
    blooms: [],
  }
}

/** Stages 2-8: a green plant with leaves. */
function herb(stage: GrowthStage, r: Rng): PlantM {
  const H = [0, 0, 46, 92, 122, 142, 166, 190, 214][stage]
  const lean = r.range(-6, 6)
  const stemPts: P[] =
    stage === 2
      ? [[0, 0], [2, -18], [10, -36], [20, -44], [27, -40]] // hooked sprout still unfolding
      : [[0, 0], [r.range(-5, 5), -H * 0.34], [lean + r.range(-6, 6), -H * 0.68], [lean, -H]]
  const w0 = [0, 0, 6, 8, 9, 10, 12, 14, 17][stage]
  const stem = mkBranch(r, stemPts, w0, w0 * 0.55, 0, r.sign())
  stem.path = brush(stemPts, w0, w0 * 0.5, r, { taperIn: 0, taperOut: 0.12, wobble: 0.08 })
  const top = stemPts[stemPts.length - 1]

  // seed leaves (cotyledons): round and pale, they stay low as the stem grows
  if (stage >= 2 && stage <= 6) {
    const t = stage === 2 ? 1 : stage === 3 ? 1 : stage === 4 ? 0.62 : 0.5
    const p = stage === 2 ? ([27, -40] as P) : at(stemPts, t)
    const s = stage === 2 ? 0.55 : 1
    stem.leaves.push({ x: p[0], y: p[1], a: stage === 2 ? 30 : -28, len: 30 * s, wid: 15 * s, rank: 0.97, coty: true })
    stem.leaves.push({ x: p[0], y: p[1], a: stage === 2 ? 75 : -152, len: 30 * s, wid: 15 * s, rank: 0.93, coty: true })
  }
  if (stage <= 3) {
    if (stage === 3) stem.buds.push(top)
    return { kind: 'herb', root: stem, clumps: [], roots: '', height: H, stage, fruit: 'apple', blossoms: null, fruits: null }
  }

  const n = { 4: 1, 5: 1, 6: 3, 7: 4, 8: 7 }[stage as 4 | 5 | 6 | 7 | 8]
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.74 : 0.3 + (0.58 * i) / (n - 1)
    const side = i % 2 === 0 ? 1 : -1
    const b = at(stemPts, t)
    const ang = -90 + side * r.range(40, 60) * (1 - 0.25 * t)
    const len = H * (0.46 - 0.18 * t) * r.range(0.9, 1.1) * (stage === 4 ? 0.8 : 1)
    const d = dirv(ang)
    const mid = add(add(b, d, len * 0.55), [0, -1], len * 0.08)
    const end = add(add(b, d, len), [0, -1], len * 0.22)
    const bw = Math.max(2.6, w0 * 0.45)
    const br = mkBranch(r, [b, mid, end], bw, bw * 0.5, 1, side)
    const tipA = angleAt([b, mid, end], 0.98)
    if (stage === 4) br.buds.push(end)
    else if (stage === 5) br.leaves.push({ x: end[0], y: end[1], a: tipA, len: 50, wid: 24, rank: 0.2 })
    else {
      const per = { 6: 1, 7: 2, 8: 3 }[stage as 6 | 7 | 8]
      if (stage === 8 && i % 2 === 0) br.blooms.push(add(end, dirv(tipA), 6))
      br.leaves.push({ x: end[0], y: end[1], a: tipA + r.range(-10, 10), len: r.range(46, 56), wid: r.range(21, 26), rank: r.next() })
      for (let k = 1; k < per; k++) {
        const tt = 0.35 + (0.5 * k) / per
        const p = at([b, mid, end], tt)
        const s = k % 2 === 0 ? 1 : -1
        br.leaves.push({ x: p[0], y: p[1], a: tipA - s * r.range(40, 60), len: r.range(36, 46), wid: r.range(17, 21), rank: r.next() })
      }
      if (stage === 8) {
        // a small side twig with two leaves
        const p = at([b, mid, end], 0.55)
        const ta = tipA - side * 35
        const tend = add(p, dirv(ta), len * 0.38)
        const tw = mkBranch(r, [p, add(p, dirv(ta), len * 0.2), tend], bw * 0.5, bw * 0.3, 2, side, true)
        tw.leaves.push({ x: tend[0], y: tend[1], a: ta, len: 38, wid: 18, rank: r.next() })
        tw.leaves.push({ x: tend[0], y: tend[1], a: ta - side * 50, len: 34, wid: 16, rank: r.next() })
        br.kids.push(tw)
      }
    }
    stem.kids.push(br)
  }
  // leaves at the top of the stem
  const topA = angleAt(stemPts, 0.98)
  if (stage === 4 || stage === 5) stem.buds.push(top)
  if (stage === 5) stem.leaves.push({ x: top[0], y: top[1], a: topA + 28, len: 24, wid: 11, rank: 0.35 })
  if (stage >= 6) {
    const tops = { 6: 2, 7: 3, 8: 4 }[stage as 6 | 7 | 8]
    for (let k = 0; k < tops; k++) {
      const a = topA + (k - (tops - 1) / 2) * 34 + r.range(-6, 6)
      stem.leaves.push({ x: top[0], y: top[1], a, len: r.range(42, 52), wid: r.range(19, 24), rank: r.next() })
    }
  }
  if (stage >= 7) {
    // small leaves sprouting straight from the stem
    for (const t of [0.2, 0.45, 0.62, 0.85]) {
      const p = at(stemPts, t)
      const s = r.sign()
      stem.leaves.push({ x: p[0], y: p[1], a: -90 + s * r.range(55, 80), len: r.range(30, 38), wid: r.range(14, 17), rank: r.next() })
    }
  }
  return { kind: 'herb', root: stem, clumps: [], roots: '', height: H, stage, fruit: 'apple', blossoms: null, fruits: null }
}

/** A small almond-shaped leaf mark centred at (x, y). */
function leafDab(x: number, y: number, len: number, a: number): string {
  const cx = Math.cos(a)
  const sy = Math.sin(a)
  const h = len / 2
  const w = len * 0.32
  const p0 = [x - cx * h, y - sy * h]
  const p1 = [x + cx * h, y + sy * h]
  const n = [-sy * w, cx * w]
  const f = (v: number) => v.toFixed(1)
  return `M${f(p0[0])},${f(p0[1])} Q${f(x + n[0])},${f(y + n[1])} ${f(p1[0])},${f(p1[1])} Q${f(x - n[0])},${f(y - n[1])} ${f(p0[0])},${f(p0[1])}Z`
}

/** Stages 9-11 (and forest neighbours): a woody tree with a clumped canopy like the reference picture. */
function tree(stage: GrowthStage, r: Rng, fruit: FruitKind): PlantM {
  const big = stage >= 10
  const trunkLen = big ? 165 : 128
  const baseW = big ? 46 : 19
  const maxD = big ? 3 : 2
  const clumpR = big ? 64 : 44
  const clumps: Omit<ClumpM, 'path' | 'hi' | 'light' | 'dark' | 'rim' | 'dash'>[] = []

  const clampUp = (a: number) => Math.max(-162, Math.min(-18, a))
  // the trunk flares at the foot and tapers gently; limbs taper from base to tip
  const trunkW = (t: number) => baseW * (0.56 + 0.44 * Math.pow(1 - t, 1.4)) + baseW * 0.42 * Math.exp(-t * 16)

  function limb(base: P, ang: number, len: number, w: number, depth: number, side: number): BranchM {
    const drift = depth === 0 ? 3 : 10
    const a1 = ang + r.range(-drift, drift)
    const mid = add(base, dirv(a1), len * 0.5)
    const a2 = clampUp(a1 + r.range(-drift * 1.3, drift * 1.3))
    const end = add(mid, dirv(a2), len * 0.5)
    const pts: P[] = depth === 0 ? [base, add(base, dirv(-90 + r.range(-2, 2)), len * 0.22), mid, end] : [base, mid, end]
    const node = mkBranch(r, pts, w, w * (depth === 0 ? 0.6 : 0.5), depth, side, depth >= maxD)
    const wAt = depth === 0 ? trunkW : (t: number) => w * (1 - 0.5 * t)
    if (depth === 0) node.path = brushW(pts, trunkW, r, 0.025, 34)
    if (depth <= (big ? 2 : 1)) node.bark = barkOf(pts, wAt, r, depth === 0 ? (big ? 7 : 3) : depth === 1 ? (big ? 3 : 2) : 1)
    if (depth >= maxD) {
      clumps.push({ x: end[0], y: end[1] - clumpR * 0.15, r: clumpR * r.range(0.85, 1.2), rank: r.next(), tone: 1 })
      // fine bare twigs: visible when the leaves drop
      for (let k = 0; k < 4; k++) {
        const ta = clampUp(a2 + (k - 1.5) * 26 + r.range(-8, 8))
        const tp = at(pts, 0.55 + k * 0.13)
        const te = add(tp, dirv(ta), len * r.range(0.35, 0.6))
        node.kids.push(mkBranch(r, [tp, add(tp, dirv(ta + r.range(-10, 10)), len * 0.22), te], Math.max(1.4, w * 0.4), 0.8, depth + 1, side, true))
      }
      return node
    }
    const k = depth === 0 ? 3 : r.pick([2, 3, 3])
    for (let j = 0; j < k; j++) {
      const t = depth === 0 ? [0.66, 0.8, 0.9][j] : 0.55 + (0.4 * j) / Math.max(1, k - 1)
      const p = at(pts, t)
      const spread = depth === 0 ? [-44, 40, r.range(-6, 6)][j] : (j - (k - 1) / 2) * r.range(34, 46)
      const ca = clampUp(a2 + spread + r.range(-6, 6))
      const cl = len * (depth === 0 ? (big ? 0.72 : 0.78) : 0.78) * r.range(0.88, 1.1)
      // a limb is never wider than its parent where it joins, so the join stays smooth
      const cw = Math.min(w * (depth === 0 ? (j === 2 ? 0.6 : 0.56) : 0.6), wAt(t) * 0.95)
      const kid = limb(p, ca, cl, cw, depth + 1, ca < -90 ? -1 : 1)
      kid.cont = t >= 0.85
      node.kids.push(kid)
    }
    return node
  }

  const root = limb([0, 0], -90 + r.range(-3, 3), trunkLen, baseW, 0, r.sign())

  // fill the top of the crown so the canopy reads as one rounded mass (the bottom stays open to show the limbs)
  const xs = clumps.map((c) => c.x)
  const ys = clumps.map((c) => c.y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2
  const fill = big ? 7 : 4
  for (let i = 0; i < fill; i++) {
    const u = (i + 0.5) / fill
    const x = cx + (u - 0.5) * 2 * rx * 0.85 + r.range(-12, 12)
    const y = top + (bottom - top) * r.range(0.05, 0.55) - Math.sin(u * Math.PI) * clumpR * 0.35
    clumps.push({ x, y, r: clumpR * r.range(0.9, 1.15), rank: r.next(), tone: 1 })
  }
  clumps.sort((a, b) => a.y - b.y)
  const y0 = Math.min(...clumps.map((c) => c.y))
  const y1 = Math.max(...clumps.map((c) => c.y))

  const full: ClumpM[] = clumps.map((c) => {
    const rel = (c.y - y0) / Math.max(1, y1 - y0)
    const tone: 0 | 1 | 2 = rel < 0.3 ? 2 : rel < 0.7 ? 1 : 0
    const bumps = Math.round(r.range(13, 18))
    const dabs = (n: number, a0: number, a1: number, r0: number, r1: number, len: [number, number]) => {
      const out: string[] = []
      for (let k = 0; k < n; k++) {
        const a = r.range(a0, a1)
        const rr = c.r * r.range(r0, r1)
        out.push(leafDab(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.84, r.range(len[0], len[1]) * (big ? 1 : 0.85), a + r.range(-1.2, 1.2)))
      }
      return out.join(' ')
    }
    return {
      ...c,
      tone,
      path: scallop(c.x, c.y, c.r, c.r * 0.82, bumps, r, 0.16),
      hi: scallop(c.x - c.r * 0.22, c.y - c.r * 0.3, c.r * 0.58, c.r * 0.4, 9, r, 0.18),
      light: dabs(big ? 18 : 12, -Math.PI * 0.95, -Math.PI * 0.1, 0.15, 0.85, [7, 11]),
      dark: dabs(big ? 14 : 9, Math.PI * 0.05, Math.PI * 0.9, 0.2, 0.85, [7, 10]),
      rim: dabs(big ? 12 : 8, -Math.PI, 0, 0.92, 1.08, [8, 12]),
      dash: r.range(0, 100),
    }
  })

  const roots = big
    ? [
        brush([[-baseW * 0.25, -18], [-baseW * 0.6, -5], [-baseW * 1.05, 3]], 18, 3, r, { taperIn: 0, taperOut: 0.6 }),
        brush([[baseW * 0.25, -18], [baseW * 0.65, -4], [baseW * 1.1, 3]], 18, 3, r, { taperIn: 0, taperOut: 0.6 }),
        brush([[baseW * 0.05, -12], [baseW * 0.3, -2], [baseW * 0.55, 5]], 11, 2.5, r, { taperIn: 0, taperOut: 0.6 }),
      ].join(' ')
    : brush([[-baseW * 0.3, -7], [-baseW * 0.95, 2]], 9, 2, r, { taperIn: 0, taperOut: 0.6 }) +
      ' ' +
      brush([[baseW * 0.3, -7], [baseW * 1, 2]], 9, 2, r, { taperIn: 0, taperOut: 0.6 })

  return {
    kind: 'tree',
    root,
    clumps: full,
    roots,
    height: trunkLen * 2.2,
    stage,
    fruit,
    blossoms: stage === 9 ? blossomsOn(full, r, big) : null,
    fruits: stage >= 10 ? fruitsOn(full, r, fruit, stage >= 11) : null,
  }
}

const f1 = (v: number) => v.toFixed(1)
const circ = (x: number, y: number, rr: number) => `M${f1(x + rr)},${f1(y)} a${f1(rr)},${f1(rr)} 0 1,0 ${f1(-2 * rr)},0 a${f1(rr)},${f1(rr)} 0 1,0 ${f1(2 * rr)},0Z`

/** Clusters of five-petal blossoms spread over the crown. a = petals, b = petal shade, c = hearts, d = buds. */
function blossomsOn(clumps: ClumpM[], r: Rng, big: boolean): CropM {
  const groups = [0, 1, 2].map(() => ({ a: [] as string[], b: [] as string[], c: [] as string[], d: [] as string[] }))
  for (const cl of clumps) {
    const n = big ? 14 : 17
    for (let k = 0; k < n; k++) {
      const a = r.range(-Math.PI, Math.PI)
      const rr = cl.r * Math.sqrt(r.range(0.04, 0.9))
      const x = cl.x + Math.cos(a) * rr
      const y = cl.y + Math.sin(a) * rr * 0.82
      const s = r.range(2.5, 3.6) * (big ? 1.15 : 1)
      const g = groups[Math.min(2, Math.floor(r.next() * 3))]
      if (r.next() < 0.22) {
        g.d.push(circ(x, y, s * 0.7))
        continue
      }
      const rot = r.range(0, Math.PI)
      for (let p = 0; p < 5; p++) {
        const pa = rot + (p / 5) * Math.PI * 2
        g.a.push(circ(x + Math.cos(pa) * s * 0.85, y + Math.sin(pa) * s * 0.85, s * 0.72))
        if (p === 1 || p === 2) g.b.push(circ(x + Math.cos(pa) * s * 0.95, y + Math.sin(pa) * s * 0.95, s * 0.4))
      }
      g.c.push(circ(x, y, s * 0.42))
    }
  }
  return { groups: groups.map((g) => ({ a: g.a.join(''), b: g.b.join(''), c: g.c.join(''), d: g.d.join('') })), fallen: '' }
}

/** One fruit at (x, y): body, shaded side, highlight and stem/leaf paths. */
function fruitShape(kind: FruitKind, x: number, y: number, s: number, tilt: number): { a: string; b: string; c: string; d: string } {
  const cx = x
  let body: string
  let shade: string
  let top = y - s
  if (kind === 'pear') {
    body = `M${f1(cx)},${f1(y - s * 1.5)} C${f1(cx + s * 0.55)},${f1(y - s * 1.45)} ${f1(cx + s * 0.4)},${f1(y - s * 0.55)} ${f1(cx + s * 0.95)},${f1(y + s * 0.15)} C${f1(cx + s * 1.25)},${f1(y + s * 0.9)} ${f1(cx - s * 1.25)},${f1(y + s * 0.9)} ${f1(cx - s * 0.95)},${f1(y + s * 0.15)} C${f1(cx - s * 0.4)},${f1(y - s * 0.55)} ${f1(cx - s * 0.55)},${f1(y - s * 1.45)} ${f1(cx)},${f1(y - s * 1.5)}Z`
    shade = circ(cx + s * 0.35, y + s * 0.35, s * 0.55)
    top = y - s * 1.5
  } else if (kind === 'lemon') {
    body = `M${f1(cx - s * 1.25)},${f1(y)} C${f1(cx - s)},${f1(y - s * 0.95)} ${f1(cx + s)},${f1(y - s * 0.95)} ${f1(cx + s * 1.25)},${f1(y)} C${f1(cx + s)},${f1(y + s * 0.95)} ${f1(cx - s)},${f1(y + s * 0.95)} ${f1(cx - s * 1.25)},${f1(y)}Z`
    shade = circ(cx + s * 0.35, y + s * 0.3, s * 0.45)
    top = y - s * 0.75
  } else if (kind === 'apple') {
    body = `M${f1(cx)},${f1(y - s * 0.72)} C${f1(cx + s * 1.15)},${f1(y - s * 1.25)} ${f1(cx + s * 1.25)},${f1(y + s * 0.9)} ${f1(cx)},${f1(y + s * 0.98)} C${f1(cx - s * 1.25)},${f1(y + s * 0.9)} ${f1(cx - s * 1.15)},${f1(y - s * 1.25)} ${f1(cx)},${f1(y - s * 0.72)}Z`
    shade = circ(cx + s * 0.38, y + s * 0.32, s * 0.55)
    top = y - s * 0.72
  } else {
    body = circ(cx, y, s)
    shade = circ(cx + s * 0.35, y + s * 0.35, s * 0.55)
  }
  const hi = circ(cx - s * 0.38, y - s * 0.32, s * 0.26)
  const crown = kind === 'pomegranate' ? ` M${f1(cx - s * 0.35)},${f1(top + 0.6)} l${f1(s * 0.12)},${f1(-s * 0.45)} l${f1(s * 0.23)},${f1(s * 0.3)} l${f1(s * 0.23)},${f1(-s * 0.3)} l${f1(s * 0.12)},${f1(s * 0.45)}` : ''
  const stem = `M${f1(cx)},${f1(top + 0.5)} q${f1(tilt)},${f1(-s * 0.45)} ${f1(tilt * 1.8)},${f1(-s * 0.75)}` + crown
  return { a: body, b: shade, c: hi, d: stem }
}

/** Ripe fruit hanging mostly from the lower half of each lobe of the crown, plus a few on the grass. */
function fruitsOn(clumps: ClumpM[], r: Rng, kind: FruitKind, fallen: boolean): CropM {
  const groups = [0, 1, 2].map(() => ({ a: [] as string[], b: [] as string[], c: [] as string[], d: [] as string[] }))
  const size = { apple: 6.2, orange: 6, pear: 5.3, lemon: 5.3, pomegranate: 6.4 }[kind]
  for (const cl of clumps) {
    for (let k = 0; k < 3; k++) {
      const low = k < 2
      const a = low ? r.range(Math.PI * 0.12, Math.PI * 0.88) : r.range(-Math.PI, 0)
      const rr = cl.r * (low ? r.range(0.5, 0.9) : r.range(0.2, 0.7))
      const f = fruitShape(kind, cl.x + Math.cos(a) * rr, cl.y + Math.sin(a) * rr * 0.82, size * r.range(0.88, 1.12), r.range(-1.5, 1.5))
      const g = groups[Math.min(2, Math.floor(r.next() * 3))]
      g.a.push(f.a)
      g.b.push(f.b)
      g.c.push(f.c)
      g.d.push(f.d)
    }
  }
  const down: string[] = []
  if (fallen) {
    for (let k = 0; k < 4; k++) {
      const x = r.sign() * r.range(70, 150)
      down.push(fruitShape(kind, x, r.range(-2, 4), size * 0.95, 0).a)
    }
  }
  return { groups: groups.map((g) => ({ a: g.a.join(''), b: g.b.join(''), c: g.c.join(''), d: g.d.join('') })), fallen: down.join('') }
}

const FRUITS: FruitKind[] = ['apple', 'orange', 'pear', 'pomegranate', 'lemon']

export function buildPlant(stage: GrowthStage, seed: number): PlantM {
  const r = rng(seed * 97 + stage * 13)
  if (stage === 1) return { kind: 'seed', root: null, clumps: [], roots: '', height: 0, stage, fruit: 'apple', blossoms: null, fruits: null }
  if (stage <= 8) return herb(stage, r)
  // the main garden tree (seed 7) is an apple tree; forest neighbours vary
  return tree(stage, r, seed === 7 ? 'apple' : FRUITS[seed % FRUITS.length])
}

// ---------- rendering ----------

export interface PlantLook {
  health: number
  dead: boolean
  pal: Palette
}

function looks(h: number, dead: boolean) {
  const wilt = dead ? 1 : Math.max(0, Math.min(1, (0.65 - h) / 0.65))
  let keep = 1
  if (dead) keep = 0
  else if (h < 0.6) keep = h >= 0.3 ? 0.3 + ((h - 0.3) / 0.3) * 0.7 : 0.02 + (h / 0.3) * 0.28
  const yellow = dead ? 1 : Math.max(0, Math.min(1, (0.7 - h) / 0.4))
  const brown = dead ? 1 : Math.max(0, Math.min(1, (0.35 - h) / 0.35))
  return { wilt, keep, yellow, brown, twigsKept: dead ? 0.55 : h < 0.3 ? 0.4 + h * 2 : 1 }
}

const leafPath = (len: number, w: number) =>
  `M0,0 C${len * 0.22},${-w * 0.72} ${len * 0.62},${-w * 0.66} ${len},0 C${len * 0.66},${w * 0.6} ${len * 0.25},${w * 0.66} 0,0Z`
const cotyPath = (len: number, w: number) =>
  `M0,0 C${len * 0.1},${-w * 0.8} ${len * 0.9},${-w * 0.9} ${len},${-w * 0.05} C${len * 0.95},${w * 0.7} ${len * 0.2},${w * 0.6} 0,0Z`

function Rot({ x, y, a, children, cls }: { x: number; y: number; a: number; children: ReactNode; cls?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g className={cls ?? 'gs-t'} style={{ transform: `rotate(${a.toFixed(2)}deg)` }}>
        <g transform={`translate(${-x},${-y})`}>{children}</g>
      </g>
    </g>
  )
}

interface Inks {
  ink: string
  stem: string
  stemDark: string
  leaf: string
  leafLight: string
  vein: string
  coty: string
  /** woody tree: trunk and main limbs get a rounded bark shading */
  tree: boolean
  bloom: string
  bloomHeart: string
  /** outline colour for branches (a little softer than the ink on a tree) */
  outline: string
  furrow: string
  barkHi: string
}

function LeafV({ l, look, c, uid }: { l: LeafM; look: ReturnType<typeof looks>; c: Inks; uid: string }) {
  const shown = l.rank < look.keep
  // droop: rotate the leaf toward pointing down
  let a = l.a
  const norm = ((a % 360) + 360) % 360
  const toDown = 90 - (norm > 270 ? norm - 360 : norm)
  a += toDown * look.wilt * 0.55
  return (
    <g transform={`translate(${l.x.toFixed(1)},${l.y.toFixed(1)})`}>
      <g className="gs-t gs-leaf" style={{ transform: `rotate(${a.toFixed(1)}deg) scale(${shown ? 1 : 0.4})`, opacity: shown ? 1 : 0 }}>
        <path d={l.coty ? cotyPath(l.len, l.wid) : leafPath(l.len, l.wid)} fill={l.coty ? c.coty : `url(#${uid}-leaf)`} stroke={c.ink} strokeWidth={1.5} strokeLinejoin="round" />
        {!l.coty && <path d={`M1,0 Q${l.len * 0.5},${-l.wid * 0.1} ${l.len * 0.9},0`} fill="none" stroke={c.vein} strokeWidth={1.2} strokeLinecap="round" />}
        {!l.coty && l.len > 30 && (
          <path
            d={`M${l.len * 0.35},${-l.wid * 0.04} l${l.len * 0.12},${-l.wid * 0.3} M${l.len * 0.55},${-l.wid * 0.05} l${l.len * 0.1},${-l.wid * 0.26} M${l.len * 0.4},0 l${l.len * 0.1},${l.wid * 0.26}`}
            stroke={c.vein}
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.7}
          />
        )}
      </g>
    </g>
  )
}

type Pass = 'outline' | 'fill' | 'top'

/**
 * One branch and its children. The plant is drawn in passes (all ink outlines, then all fills, then leaves),
 * so where a branch grows out of its parent the two merge into one shape, like a real limb, with no seams.
 */
function BranchV({ b, look, c, uid, droopMax, pass }: { b: BranchM; look: ReturnType<typeof looks>; c: Inks; uid: string; droopMax: number; pass: Pass }) {
  const hideTwig = b.twig && b.rank > look.twigsKept
  const droop = b.depth === 0 ? b.side * look.wilt * droopMax * 0.4 : b.side * look.wilt * droopMax * (b.depth === 1 ? 1 : 0.6)
  const line = b.twig ? 0.8 : c.tree ? 1.15 : 1.5
  return (
    <Rot x={b.base[0]} y={b.base[1]} a={droop}>
      <g className="gs-t" style={{ opacity: hideTwig ? 0 : 1 }}>
        {b.kids.map((k, i) =>
          pass === 'fill' && k.cont ? null : <BranchV key={i} b={k} look={look} c={c} uid={uid} droopMax={droopMax} pass={pass} />,
        )}
        {pass === 'outline' && <path d={b.path} fill={c.outline} stroke={c.outline} strokeWidth={line * 2} strokeLinejoin="round" />}
        {pass === 'fill' && (
          <>
            <path d={b.path} fill={c.tree ? c.stem : b.depth === 0 ? `url(#${uid}-stem)` : c.stem} />
            {b.bark && (
              <g>
                <path d={b.bark.shadow} fill={c.stemDark} opacity={0.42} />
                <path d={b.bark.furrows} fill="none" stroke={c.furrow} strokeWidth={b.bark.w > 30 ? 1.3 : 1} strokeLinecap="round" opacity={0.6} />
                <path d={b.bark.hi} fill="none" stroke={c.barkHi} strokeWidth={Math.max(1.2, b.bark.w * 0.07)} strokeLinecap="round" opacity={0.55} />
              </g>
            )}
            {b.kids.map((k, i) => (k.cont ? <BranchV key={`c${i}`} b={k} look={look} c={c} uid={uid} droopMax={droopMax} pass={pass} /> : null))}
          </>
        )}
        {pass === 'top' && (
          <>
            {b.buds.map(([x, y], i) => (
              <path key={i} d={`M${x - 4},${y + 2} C${x - 5},${y - 6} ${x - 1},${y - 11} ${x + 1},${y - 12} C${x + 4},${y - 8} ${x + 5},${y - 2} ${x + 3},${y + 2}Z`} fill={c.leafLight} stroke={c.ink} strokeWidth={1.3} />
            ))}
            {b.leaves.map((l, i) => (
              <LeafV key={i} l={l} look={look} c={c} uid={uid} />
            ))}
            {b.blooms.map(([x, y], i) => (
              <g key={`b${i}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}>
                <g className="gs-t" style={{ opacity: look.keep > 0.95 ? 1 : 0, transform: `scale(${look.keep > 0.95 ? 1 : 0.3})` }}>
                  {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx={0} cy={-5} rx={3.6} ry={5.6} transform={`rotate(${a})`} fill={c.bloom} stroke={c.ink} strokeWidth={0.9} />
                  ))}
                  <circle r={2.6} fill={c.bloomHeart} stroke={c.ink} strokeWidth={0.7} />
                </g>
              </g>
            ))}
          </>
        )}
      </g>
    </Rot>
  )
}

/** Small soil mound around the base of young plants. */
function Mound({ w, pal, seed }: { w: number; pal: Palette; seed: number }) {
  const r = rng(seed + 5)
  const pts: P[] = [[-w, 4], [-w * 0.6, -w * 0.16], [0, -w * 0.24], [w * 0.62, -w * 0.15], [w, 4], [0, 9]]
  const soil = pal.c.soil
  return (
    <g>
      <path d={smooth(pts, true)} fill={soil} />
      <path d={brush([[-w, 3], [-w * 0.55, -w * 0.15], [0, -w * 0.23], [w * 0.6, -w * 0.14], [w, 3]], 1.4, 2.4, r, { taperIn: 0.3, taperOut: 0.3 })} fill={pal.c.ink} />
      {[...Array(5)].map((_, i) => (
        <ellipse key={i} cx={r.range(-w * 0.6, w * 0.6)} cy={r.range(-w * 0.12, 2)} rx={r.range(1.5, 3)} ry={r.range(1, 2)} fill={mix(soil, '#000', 0.25)} />
      ))}
      <path d={`M${-w * 0.45},${-w * 0.06} q${w * 0.1},-4 ${w * 0.2},-1 M${w * 0.15},${-w * 0.12} q${w * 0.12},-3 ${w * 0.22},0`} stroke={mix(soil, '#fff', 0.25)} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </g>
  )
}

function Seed({ pal, cracked }: { pal: Palette; cracked: boolean }) {
  const s = pal.shade('#b07a45')
  const hi = pal.shade('#d9a86c')
  return (
    <g transform="translate(0,-12) rotate(-18)">
      {cracked ? (
        <>
          <path d="M-14,0 C-14,-9 -4,-12 2,-8 L-1,-1 L3,3 C-4,8 -14,6 -14,0Z" fill={s} stroke={pal.c.ink} strokeWidth={1.6} />
          <path d="M5,-8 C12,-6 16,2 8,8 L4,3 L7,-1Z" fill={s} stroke={pal.c.ink} strokeWidth={1.6} transform="rotate(14 6 0)" />
        </>
      ) : (
        <>
          <path d="M-16,0 C-16,-10 -4,-13 6,-9 C14,-6 17,2 10,7 C2,12 -16,9 -16,0Z" fill={s} stroke={pal.c.ink} strokeWidth={1.8} />
          <path d="M-10,-4 C-6,-8 0,-8 4,-7" stroke={hi} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d="M-12,2 C-4,5 4,4 10,1" stroke={pal.c.ink} strokeWidth={1} fill="none" opacity={0.6} />
        </>
      )}
    </g>
  )
}

function Canopy({ m, look, pal }: { m: PlantM; look: ReturnType<typeof looks>; pal: Palette }) {
  const wither = (g: string) => mix(mix(g, '#d4be55', look.yellow * 0.85), '#9a6c3c', look.brown * 0.8)
  const tones = ['#5c9c46', '#6eae4c', '#83c058'].map((g) => pal.shade(wither(g)))
  const shadow = pal.shade(wither('#3d7434'))
  const deep = pal.shade(wither('#2f5f2b'))
  const hi = pal.shade(wither('#a9d46c'))
  const sparkle = pal.shade(wither('#c8e68a'))
  const vis = (cl: ClumpM) => cl.rank < look.keep
  const tr = (cl: ClumpM) => ({
    className: 'gs-t',
    style: {
      opacity: vis(cl) ? 1 : 0,
      transform: `translate(${cl.x.toFixed(1)}px,${cl.y.toFixed(1)}px) scale(${vis(cl) ? 1 : 0.5}) translate(${(-cl.x).toFixed(1)}px,${(-cl.y).toFixed(1)}px)`,
    },
  })
  return (
    <g>
      {/* the dark mass behind every lobe */}
      {m.clumps.map((cl, i) => (
        <g key={`s${i}`} {...tr(cl)}>
          <path d={cl.path} transform={`translate(${cl.x.toFixed(1)},${(cl.y + 6).toFixed(1)}) scale(1.08) translate(${(-cl.x).toFixed(1)},${(-cl.y).toFixed(1)})`} fill={deep} />
        </g>
      ))}
      {m.clumps.map((cl, i) => (
        <g key={i} {...tr(cl)}>
          <path d={cl.path} transform="translate(3,7)" fill={shadow} opacity={0.7} />
          <path d={cl.path} fill={tones[cl.tone]} />
          <path d={cl.rim} fill={tones[cl.tone]} stroke={pal.c.ink} strokeWidth={0.5} strokeOpacity={0.35} />
          <path d={cl.dark} fill={shadow} opacity={0.75} />
          {cl.tone > 0 && <path d={cl.hi} fill={hi} opacity={cl.tone === 2 ? 0.6 : 0.4} />}
          <path d={cl.light} fill={cl.tone === 2 ? sparkle : hi} opacity={0.85} />
          <path d={cl.path} fill="none" stroke={pal.c.ink} strokeWidth={1.2} strokeLinecap="round" pathLength={100} strokeDasharray="34 26 18 22" strokeDashoffset={cl.dash} opacity={0.55} />
        </g>
      ))}
    </g>
  )
}

const FRUIT_COLORS: Record<FruitKind, [string, string]> = {
  apple: ['#d9412e', '#8f1f1a'],
  orange: ['#f39324', '#b8560f'],
  pear: ['#c8d150', '#7f8a26'],
  lemon: ['#f5d93c', '#b89a12'],
  pomegranate: ['#c02c3e', '#6e1424'],
}

/** Blossoms or fruit on the crown. The groups drop one by one as the tree gets thirsty. */
function Crops({ m, look, pal, dead }: { m: PlantM; look: ReturnType<typeof looks>; pal: Palette; dead: boolean }) {
  const crop = m.blossoms ?? m.fruits
  if (!crop || dead) return null
  const ink = pal.c.ink
  const blossom = !!m.blossoms
  const pink = m.fruit === 'apple' || m.fruit === 'pomegranate'
  const [body, shadeC] = FRUIT_COLORS[m.fruit]
  const keepAt = [0.97, 0.86, 0.7]
  return (
    <g className="gs-crop">
      {crop.groups.map((g, i) => {
        const on = look.keep >= keepAt[i]
        const st = { opacity: on ? 1 : 0 }
        return blossom ? (
          <g key={i} className="gs-t" style={st}>
            <path d={g.d} fill={pal.shade(pink ? '#e98aa6' : '#f3e4d8')} stroke={ink} strokeWidth={0.5} strokeOpacity={0.5} />
            <path d={g.a} fill={pal.shade(pink ? '#fbd9e3' : '#fffaf4')} stroke={ink} strokeWidth={0.45} strokeOpacity={0.45} />
            <path d={g.b} fill={pal.shade(pink ? '#f2a9bf' : '#eadfd6')} opacity={0.7} />
            <path d={g.c} fill={pal.shade('#f4c542')} />
          </g>
        ) : (
          <g key={i} className="gs-t" style={st}>
            <path d={g.d} fill="none" stroke={pal.shade('#5a3e22')} strokeWidth={1.2} strokeLinecap="round" />
            <path d={g.a} fill={pal.shade(body)} stroke={ink} strokeWidth={0.8} />
            <path d={g.b} fill={pal.shade(shadeC)} opacity={0.45} />
            <path d={g.c} fill="#fffaf0" opacity={0.75} />
          </g>
        )
      })}
    </g>
  )
}

export interface PlantProps {
  stage: GrowthStage
  health: number
  dead: boolean
  pal: Palette
  seed?: number
  /** unique id prefix for gradients */
  uid: string
  windy?: boolean
}

/** Draws the plant with its base at (0,0). */
export const Plant = memo(function Plant({ stage, health, dead, pal, seed = 1, uid, windy }: PlantProps) {
  const m = useMemo(() => buildPlant(stage, seed), [stage, seed])
  const look = looks(health, dead)
  const deadGrey = '#8d8780'
  const w = (c: string) => pal.shade(dead ? mix(c, deadGrey, 0.85) : mix(mix(c, '#c9b458', look.yellow * 0.6), '#9b7a4a', look.brown * 0.7))
  const c: Inks = {
    ink: pal.c.ink,
    stem: m.kind === 'tree' ? pal.shade(dead ? '#8e8a84' : '#8b6a4c') : w('#86bc5a'),
    stemDark: pal.shade(dead ? '#6d6964' : '#5f4632'),
    leaf: w('#6fb24c'),
    leafLight: w('#a6d872'),
    vein: w('#3f7a32'),
    coty: w('#b4dc7a'),
    tree: m.kind === 'tree',
    bloom: pal.shade('#fbf4f0'),
    bloomHeart: pal.shade('#f2c94c'),
    outline: m.kind === 'tree' ? mix(pal.c.ink, pal.shade('#3a2a1c'), 0.35) : pal.c.ink,
    furrow: pal.shade(dead ? '#5a5652' : '#3e2c1e'),
    barkHi: pal.shade(dead ? '#b5b0a8' : '#d9bf98'),
  }
  const droopMax = m.kind === 'tree' ? 4 : dead ? 48 : 30

  if (m.kind === 'seed') {
    return (
      <g>
        <Mound w={64} pal={pal} seed={seed} />
        <Seed pal={pal} cracked={false} />
        {!dead && (
          <g className="gs-sparkle">
            <path d="M22,-34 l2,-7 l2,7 l7,2 l-7,2 l-2,7 l-2,-7 l-7,-2Z" fill="#fff6c8" stroke={pal.c.ink} strokeWidth={0.8} />
          </g>
        )}
      </g>
    )
  }

  const woody = m.kind === 'tree' || stage === 8
  const stemTop = woody ? (m.kind === 'tree' ? c.stem : w('#86bc5a')) : c.stem
  const stemBottom = woody ? c.stem : c.stem
  const fallen = !dead && look.keep < 0.9
  const r = rng(seed + stage)

  return (
    <g>
      <defs>
        {m.kind === 'tree' ? (
          <linearGradient id={`${uid}-stem`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={mix(c.stem, '#f3e2c4', 0.35)} />
            <stop offset="0.35" stopColor={c.stem} />
            <stop offset="1" stopColor={mix(c.stem, '#1f150c', 0.45)} />
          </linearGradient>
        ) : (
          <linearGradient id={`${uid}-stem`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={stage === 8 ? pal.shade(dead ? '#8e8a84' : '#8b6a4c') : stemBottom} />
            <stop offset="1" stopColor={stemTop} />
          </linearGradient>
        )}
        <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.leafLight} />
          <stop offset="0.55" stopColor={c.leaf} />
          <stop offset="1" stopColor={mix(c.leaf, '#1e3a18', 0.25)} />
        </linearGradient>
      </defs>
      {stage <= 5 && <Mound w={stage === 2 ? 56 : 46} pal={pal} seed={seed} />}
      {stage === 2 && <Seed pal={pal} cracked />}
      {m.kind === 'tree' && <path d={m.roots} fill={c.outline} stroke={c.outline} strokeWidth={2.3} strokeLinejoin="round" />}
      <g className={windy ? 'gs-sway gs-sway-windy' : 'gs-sway'}>
        {m.root && <BranchV b={m.root} look={look} c={c} uid={uid} droopMax={droopMax} pass="outline" />}
      </g>
      {m.kind === 'tree' && <path d={m.roots} fill={c.stem} />}
      {m.kind === 'tree' && !dead && (
        <path d="M-30,-2 q4,-7 9,-3 M-14,-4 q3,-5 7,-2 M14,-3 q3,-6 8,-2 M26,-1 q2,-4 6,-1" stroke={pal.shade('#6f9a3a')} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.8} />
      )}
      {m.fruits?.fallen && !dead && look.keep > 0.6 && <path d={m.fruits.fallen} fill={pal.shade(FRUIT_COLORS[m.fruit][0])} stroke={c.ink} strokeWidth={0.8} />}
      <g className={windy ? 'gs-sway gs-sway-windy' : 'gs-sway'}>
        {m.root && <BranchV b={m.root} look={look} c={c} uid={uid} droopMax={droopMax} pass="fill" />}
        {m.root && m.kind !== 'tree' && <BranchV b={m.root} look={look} c={c} uid={uid} droopMax={droopMax} pass="top" />}
        {m.kind === 'tree' && (
          <g className="gs-canopy">
            <Canopy m={m} look={look} pal={pal} />
            <Crops m={m} look={look} pal={pal} dead={dead} />
          </g>
        )}
      </g>
      {/* fallen leaves at the foot of a thirsty plant */}
      {fallen &&
        [...Array(Math.round((1 - look.keep) * (m.kind === 'tree' ? 9 : 5)))].map((_, i) => {
          const x = r.range(-1, 1) * (m.kind === 'tree' ? 110 : 50)
          return (
            <path
              key={i}
              d={leafPath(m.kind === 'tree' ? 18 : 14, 7)}
              transform={`translate(${x.toFixed(1)},${r.range(-2, 4).toFixed(1)}) rotate(${r.range(-30, 30).toFixed(0)})`}
              fill={pal.shade(mix('#c9a24a', '#9a6a3a', r.next()))}
              stroke={pal.c.ink}
              strokeWidth={1}
            />
          )
        })}
    </g>
  )
})

/** Little patch of grass that hides the very bottom of the plant so it sits in the ground. */
export function GroundTuft({ pal, w, seed }: { pal: Palette; w: number; seed: number }) {
  const r = rng(seed)
  const blades: string[] = []
  for (let i = 0; i < 9; i++) {
    const x = r.range(-w, w)
    const h = r.range(8, 18)
    blades.push(brush([[x, 3], [x + r.range(-3, 3), -h * 0.5], [x + r.range(-6, 6), -h]], 3, 0.5, r, { taperIn: 0, taperOut: 0.7 }))
  }
  return <path d={blades.join(' ')} fill={pal.c.grass} stroke={pal.c.ink} strokeWidth={0.7} />
}


