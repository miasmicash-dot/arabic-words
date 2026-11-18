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
  marks: string
  /** where the broken ink outline starts (0..100) */
  dash: number
}
interface BranchM {
  base: P
  path: string
  /** -1 left, 1 right: which way it droops */
  side: number
  depth: number
  rank: number
  /** true for the finest twigs (hidden first when wilting) */
  twig: boolean
  kids: BranchM[]
  leaves: LeafM[]
  buds: P[]
  /** little blossoms on a full-grown plant (stage 8) */
  blooms: P[]
}
interface PlantM {
  kind: 'seed' | 'herb' | 'tree'
  root: BranchM | null
  clumps: ClumpM[]
  trunkDetail: string
  roots: string
  height: number
  stage: GrowthStage
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
    return { kind: 'herb', root: stem, clumps: [], trunkDetail: '', roots: '', height: H, stage }
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
  return { kind: 'herb', root: stem, clumps: [], trunkDetail: '', roots: '', height: H, stage }
}

/** Stages 9-11 (and forest neighbours): a woody tree with a clumped canopy like the reference picture. */
function tree(stage: GrowthStage, r: Rng): PlantM {
  const big = stage >= 10
  const trunkLen = big ? 165 : 128
  const baseW = big ? 44 : 18
  const maxD = big ? 3 : 2
  const clumpR = big ? 64 : 44
  const clumps: Omit<ClumpM, 'path' | 'hi' | 'marks' | 'dash'>[] = []

  const clampUp = (a: number) => Math.max(-162, Math.min(-18, a))

  function limb(base: P, ang: number, len: number, w: number, depth: number, side: number): BranchM {
    const drift = depth === 0 ? 3 : 10
    const a1 = ang + r.range(-drift, drift)
    const mid = add(base, dirv(a1), len * 0.5)
    const a2 = clampUp(a1 + r.range(-drift * 1.3, drift * 1.3))
    const end = add(mid, dirv(a2), len * 0.5)
    const pts: P[] = depth === 0 ? [base, add(base, dirv(-90 + r.range(-2, 2)), len * 0.45), mid, end] : [base, mid, end]
    const node = mkBranch(r, pts, w, w * (depth === 0 ? 0.6 : 0.5), depth, side, depth >= maxD)
    if (depth === 0) node.path = brush(pts, w, w * 0.5, r, { taperIn: 0, taperOut: 0.25, wobble: 0.04 })
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
      const t = depth === 0 ? [0.66, 0.8, 1][j] : 0.55 + (0.45 * j) / Math.max(1, k - 1)
      const p = at(pts, t)
      const spread = depth === 0 ? [-44, 40, r.range(-6, 6)][j] : (j - (k - 1) / 2) * r.range(34, 46)
      const ca = clampUp(a2 + spread + r.range(-6, 6))
      const cl = len * (depth === 0 ? (big ? 0.72 : 0.78) : 0.78) * r.range(0.88, 1.1)
      const cw = w * (depth === 0 ? (j === 2 ? 0.52 : 0.58) : 0.6)
      node.kids.push(limb(p, ca, cl, cw, depth + 1, ca < -90 ? -1 : 1))
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
    const bumps = Math.round(r.range(6, 9))
    const marks: string[] = []
    for (let m = 0; m < 2; m++) {
      const mx = c.x + r.range(-c.r * 0.45, c.r * 0.35)
      const my = c.y + r.range(-c.r * 0.1, c.r * 0.45)
      const s = c.r * r.range(0.08, 0.12)
      marks.push(`M${(mx - s * 2).toFixed(1)},${my.toFixed(1)} q${s},${-s * 1.6} ${s * 2},0 q${s},${-s * 1.6} ${s * 2},0`)
    }
    return {
      ...c,
      tone,
      path: scallop(c.x, c.y, c.r, c.r * 0.84, bumps, r, 0.32),
      hi: scallop(c.x - c.r * 0.2, c.y - c.r * 0.32, c.r * 0.6, c.r * 0.4, 6, r, 0.3),
      marks: marks.join(' '),
      dash: r.range(0, 100),
    }
  })

  // bark lines and root flare
  const H = trunkLen
  const bark: string[] = []
  for (let i = 0; i < (big ? 4 : 2); i++) {
    const x = r.range(-baseW * 0.22, baseW * 0.22)
    const yb = -r.range(10, H * 0.45)
    bark.push(smooth([[x, yb], [x + r.range(-3, 3), yb - r.range(16, 30)], [x + r.range(-3, 3), yb - r.range(36, 56)]]))
  }
  if (big) bark.push(`M${baseW * 0.05},${-H * 0.32} c-5,-3 -5,-11 1,-12 c6,-1 8,6 3,10`)
  const roots = big
    ? [
        brush([[-baseW * 0.3, -16], [-baseW * 0.65, -4], [-baseW * 1.05, 3]], 16, 3, r, { taperIn: 0, taperOut: 0.6 }),
        brush([[baseW * 0.3, -16], [baseW * 0.7, -3], [baseW * 1.15, 3]], 16, 3, r, { taperIn: 0, taperOut: 0.6 }),
      ].join(' ')
    : brush([[-baseW * 0.3, -6], [-baseW * 0.9, 2]], 8, 2, r, { taperIn: 0, taperOut: 0.6 }) +
      ' ' +
      brush([[baseW * 0.3, -6], [baseW * 0.95, 2]], 8, 2, r, { taperIn: 0, taperOut: 0.6 })

  return { kind: 'tree', root, clumps: full, trunkDetail: bark.join(' '), roots, height: H * 2.2, stage }
}

export function buildPlant(stage: GrowthStage, seed: number): PlantM {
  const r = rng(seed * 97 + stage * 13)
  if (stage === 1) return { kind: 'seed', root: null, clumps: [], trunkDetail: '', roots: '', height: 0, stage }
  if (stage <= 8) return herb(stage, r)
  return tree(stage, r)
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
  bloom: string
  bloomHeart: string
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

function BranchV({ b, look, c, uid, droopMax }: { b: BranchM; look: ReturnType<typeof looks>; c: Inks; uid: string; droopMax: number }) {
  const hideTwig = b.twig && b.rank > look.twigsKept
  const droop = b.depth === 0 ? b.side * look.wilt * droopMax * 0.4 : b.side * look.wilt * droopMax * (b.depth === 1 ? 1 : 0.6)
  return (
    <Rot x={b.base[0]} y={b.base[1]} a={droop}>
      <g className="gs-t" style={{ opacity: hideTwig ? 0 : 1 }}>
        {b.kids.map((k, i) => (
          <BranchV key={i} b={k} look={look} c={c} uid={uid} droopMax={droopMax} />
        ))}
        <path d={b.path} fill={b.depth === 0 ? `url(#${uid}-stem)` : c.stem} stroke={c.ink} strokeWidth={b.twig ? 1 : 1.5} strokeLinejoin="round" />
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
  const tones = ['#62a24a', '#72b04e', '#88c25c'].map((g) => pal.shade(wither(g)))
  const shadow = pal.shade(wither('#3f7a36'))
  const deep = pal.shade(wither('#33652e'))
  const hi = pal.shade(wither('#acd770'))
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
          <path d={cl.path} transform={`translate(${cl.x.toFixed(1)},${(cl.y + 6).toFixed(1)}) scale(1.1) translate(${(-cl.x).toFixed(1)},${(-cl.y).toFixed(1)})`} fill={deep} />
        </g>
      ))}
      {m.clumps.map((cl, i) => (
        <g key={i} {...tr(cl)}>
          <path d={cl.path} transform="translate(4,8)" fill={shadow} opacity={0.8} />
          <path d={cl.path} fill={tones[cl.tone]} />
          {cl.tone > 0 && <path d={cl.hi} fill={hi} opacity={cl.tone === 2 ? 0.85 : 0.55} />}
          <path d={cl.path} fill="none" stroke={pal.c.ink} strokeWidth={2.2} strokeLinecap="round" pathLength={100} strokeDasharray="58 42" strokeDashoffset={cl.dash} />
          <path d={cl.marks} fill="none" stroke={shadow} strokeWidth={1.7} strokeLinecap="round" opacity={0.9} />
        </g>
      ))}
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
    bloom: pal.shade('#fbf4f0'),
    bloomHeart: pal.shade('#f2c94c'),
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
        <linearGradient id={`${uid}-stem`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={stage === 8 ? pal.shade(dead ? '#8e8a84' : '#8b6a4c') : stemBottom} />
          <stop offset="1" stopColor={stemTop} />
        </linearGradient>
        <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.leafLight} />
          <stop offset="0.55" stopColor={c.leaf} />
          <stop offset="1" stopColor={mix(c.leaf, '#1e3a18', 0.25)} />
        </linearGradient>
      </defs>
      {stage <= 5 && <Mound w={stage === 2 ? 56 : 46} pal={pal} seed={seed} />}
      {stage === 2 && <Seed pal={pal} cracked />}
      {m.kind === 'tree' && <path d={m.roots} fill={c.stem} stroke={c.ink} strokeWidth={1.8} strokeLinejoin="round" />}
      <g className={windy ? 'gs-sway gs-sway-windy' : 'gs-sway'}>
        {m.root && <BranchV b={m.root} look={look} c={c} uid={uid} droopMax={droopMax} />}
        {m.kind === 'tree' && (
          <>
            <path d={m.trunkDetail} fill="none" stroke={c.stemDark} strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />
            <g className="gs-canopy">
              <Canopy m={m} look={look} pal={pal} />
            </g>
          </>
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


