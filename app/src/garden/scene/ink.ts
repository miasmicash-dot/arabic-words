// Hand-drawn geometry helpers: seeded randomness, wobbly closed shapes and tapered ink brush strokes.
export type P = [number, number]

/** Deterministic random numbers (mulberry32), so drawings look the same on every render. */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (lo: number, hi: number) => lo + (hi - lo) * next(),
    pick: <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
  }
}
export type Rng = ReturnType<typeof rng>

const f = (n: number) => Math.round(n * 10) / 10

/** Smooth curve through points (Catmull-Rom converted to cubic Bezier). */
export function smooth(pts: P[], closed = false): string {
  if (pts.length < 2) return ''
  const n = pts.length
  const get = (i: number): P => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`
  }
  return closed ? d + 'Z' : d
}

/** Jitter every point a little, for a hand-drawn wobble. */
export function jitter(pts: P[], r: Rng, amount: number): P[] {
  return pts.map(([x, y]) => [x + r.range(-amount, amount), y + r.range(-amount, amount)])
}

/** Sample a smooth curve through `pts` into `n` points (used for brush strokes). */
export function resample(pts: P[], n: number): P[] {
  if (pts.length === 2) {
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1)
      return [pts[0][0] + (pts[1][0] - pts[0][0]) * t, pts[0][1] + (pts[1][1] - pts[0][1]) * t] as P
    })
  }
  const out: P[] = []
  const m = pts.length
  const get = (i: number) => pts[Math.max(0, Math.min(m - 1, i))]
  for (let k = 0; k < n; k++) {
    const u = (k / (n - 1)) * (m - 1)
    const i = Math.min(m - 2, Math.floor(u))
    const t = u - i
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    const t2 = t * t
    const t3 = t2 * t
    const c = (a: number, b: number, cc: number, d: number) =>
      0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3)
    out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])])
  }
  return out
}

export interface BrushOpts {
  /** fraction of the length over which the start tapers (0 = blunt) */
  taperIn?: number
  taperOut?: number
  /** random width variation (0..1) */
  wobble?: number
  samples?: number
}

/**
 * A tapered ink brush stroke along `pts`, as a filled outline path.
 * Width goes from w0 to w1, with soft tapered ends and slight pressure variation.
 */
export function brush(pts: P[], w0: number, w1: number, r: Rng, o: BrushOpts = {}): string {
  const n = o.samples ?? 18
  const c = resample(pts, n)
  const tin = o.taperIn ?? 0.2
  const tout = o.taperOut ?? 0.3
  const wob = o.wobble ?? 0.15
  const left: P[] = []
  const right: P[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const a = c[Math.max(0, i - 1)]
    const b = c[Math.min(n - 1, i + 1)]
    let dx = b[0] - a[0]
    let dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    let w = w0 + (w1 - w0) * t
    if (tin > 0 && t < tin) w *= 0.25 + 0.75 * Math.sin((t / tin) * (Math.PI / 2))
    if (tout > 0 && t > 1 - tout) w *= 0.12 + 0.88 * Math.sin(((1 - t) / tout) * (Math.PI / 2))
    w *= 1 + r.range(-wob, wob)
    const h = w / 2
    left.push([c[i][0] - dy * h, c[i][1] + dx * h])
    right.push([c[i][0] + dy * h, c[i][1] - dx * h])
  }
  return smooth([...left, ...right.reverse()], true)
}

/** Points around an ellipse with random radius variation: a base for wobbly blobs. */
export function blobPts(cx: number, cy: number, rx: number, ry: number, n: number, r: Rng, var_ = 0.08): P[] {
  const start = r.range(0, Math.PI * 2)
  return Array.from({ length: n }, (_, i) => {
    const a = start + (i / n) * Math.PI * 2
    const k = 1 + r.range(-var_, var_)
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] as P
  })
}

/** Scalloped "cloud/canopy" outline: bumps bulging outward around an ellipse. */
export function scallop(cx: number, cy: number, rx: number, ry: number, bumps: number, r: Rng, bulge = 0.28): string {
  const start = r.range(0, Math.PI * 2)
  const pts: P[] = []
  for (let i = 0; i < bumps; i++) {
    const a = start + (i / bumps) * Math.PI * 2 + r.range(-0.12, 0.12)
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  for (let i = 0; i < bumps; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % bumps]
    const mx = (p[0] + q[0]) / 2
    const my = (p[1] + q[1]) / 2
    const ox = mx - cx
    const oy = my - cy
    const k = 1 + bulge * r.range(0.7, 1.3)
    d += `Q${f(cx + ox * k * 1.18)},${f(cy + oy * k * 1.18)} ${f(q[0])},${f(q[1])}`
  }
  return d + 'Z'
}

// ---------- colour ----------

type RGB = [number, number, number]

export function hex(c: string): RGB {
  const s = c.replace('#', '')
  const v = s.length === 3 ? s.split('').map((x) => x + x).join('') : s
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}

export function rgb([r, g, b]: RGB): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function mix(a: string, b: string, t: number): string {
  const x = hex(a)
  const y = hex(b)
  const k = Math.max(0, Math.min(1, t))
  return rgb([x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k])
}

export function desaturate(c: string, t: number): string {
  const [r, g, b] = hex(c)
  const l = 0.3 * r + 0.59 * g + 0.11 * b
  return rgb([r + (l - r) * t, g + (l - g) * t, b + (l - b) * t])
}

/** Multiply blend of a colour with a tint, applied by `t`. */
export function multiply(c: string, tint: string, t: number): string {
  const x = hex(c)
  const y = hex(tint)
  const m: RGB = [(x[0] * y[0]) / 255, (x[1] * y[1]) / 255, (x[2] * y[2]) / 255]
  return mix(c, rgb(m), t)
}
