import { useSid } from './ids'
// Static-ish scenery layers: sky (sun, moon, stars, clouds), rolling hills, pond, path and foreground.
import { memo, useMemo, type ReactNode } from 'react'
import { brush, jitter, mix, resample, rng, scallop, smooth, type P, type Rng } from './ink'
import { moonArc, sunArc, type Palette } from './palette'

export const W = 1000
export const H = 720
/** Where the main plant stands. */
export const PLANT_BASE: P = [620, 566]

// ---------- terrain lines ----------

export const LINES = {
  farBack: [[-20, 338], [90, 316], [220, 300], [360, 322], [470, 312], [600, 330], [740, 292], [880, 282], [1020, 306]] as P[],
  far: [[-20, 372], [120, 344], [260, 354], [400, 374], [560, 352], [700, 334], [830, 320], [960, 336], [1020, 344]] as P[],
  mid: [[-20, 402], [100, 392], [230, 404], [380, 430], [520, 452], [700, 446], [860, 428], [1020, 420]] as P[],
  field: [[360, 486], [470, 458], [610, 432], [760, 414], [900, 406], [1020, 404]] as P[],
  midLeft: [[-20, 448], [110, 436], [250, 448], [390, 474], [520, 506]] as P[],
  near: [[-20, 506], [150, 512], [330, 530], [480, 556], [620, 562], [760, 546], [880, 526], [1020, 516]] as P[],
  path: [[-30, 632], [150, 614], [330, 600], [500, 610], [660, 630], [820, 620], [1030, 598]] as P[],
  front: [[-20, 668], [160, 660], [360, 674], [560, 664], [760, 678], [1020, 662]] as P[],
}

/** y of a terrain line at x (linear between resampled points). */
export function yAt(line: P[], x: number): number {
  const s = resample(line, 60)
  for (let i = 0; i < s.length - 1; i++) {
    if (x >= s[i][0] && x <= s[i + 1][0]) {
      const t = (x - s[i][0]) / (s[i + 1][0] - s[i][0] || 1)
      return s[i][1] + (s[i + 1][1] - s[i][1]) * t
    }
  }
  return s[x < s[0][0] ? 0 : s.length - 1][1]
}

const area = (line: P[], bottom = H + 10) => smooth(line) + `L1030,${bottom} L-30,${bottom} Z`

/** Ink line along a hill top, broken into a few strokes like a quick pen sketch. */
function inkEdge(line: P[], r: Rng, w = 2.2, gaps = 2): string {
  const s = resample(line, 48)
  const out: string[] = []
  let i = 0
  const segLen = Math.floor(s.length / (gaps + 1))
  while (i < s.length - 3) {
    const len = Math.min(s.length - i, segLen + Math.floor(r.range(-3, 4)))
    const seg = s.slice(i, i + len)
    if (seg.length > 2) out.push(brush(seg, w * r.range(0.6, 1), w * r.range(0.7, 1.2), r, { taperIn: 0.15, taperOut: 0.2, samples: 24 }))
    i += len + Math.floor(r.range(1, 3))
  }
  return out.join(' ')
}

/** Little ink tick marks for grass on hills. */
function ticks(line: P[], r: Rng, n: number, dy: [number, number], size = 7): string {
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const x = r.range(line[0][0] + 20, line[line.length - 1][0] - 20)
    const y = yAt(line, x) + r.range(dy[0], dy[1])
    const h = size * r.range(0.6, 1.2)
    parts.push(`M${x.toFixed(1)},${y.toFixed(1)} l${r.range(-2, -0.5).toFixed(1)},${(-h).toFixed(1)}`)
    parts.push(`M${(x + 3).toFixed(1)},${y.toFixed(1)} l${r.range(0.5, 2.5).toFixed(1)},${(-h * 0.8).toFixed(1)}`)
    if (r.next() < 0.5) parts.push(`M${(x + 1.5).toFixed(1)},${y.toFixed(1)} l0,${(-h * 1.1).toFixed(1)}`)
  }
  return parts.join(' ')
}

function Bush({ x, y, s, pal, seed }: { x: number; y: number; s: number; pal: Palette; seed: number }) {
  const r = rng(seed)
  const blobs = [
    [-22, -16, 20],
    [0, -24, 25],
    [24, -14, 18],
    [-8, -8, 18],
    [14, -6, 16],
  ]
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {blobs.map(([bx, by, br], i) => {
        const d = scallop(bx, by, br, br * 0.82, 7, r, 0.3)
        return (
          <g key={i}>
            <path d={d} transform="translate(3,5)" fill={pal.c.bushDark} />
            <path d={d} fill={i % 2 ? pal.c.bush : mix(pal.c.bush, pal.c.bushLight, 0.4)} stroke={pal.c.ink} strokeWidth={1.8 / s} />
            <path d={scallop(bx - br * 0.25, by - br * 0.3, br * 0.45, br * 0.35, 5, r)} fill={pal.c.bushLight} opacity={0.7} />
          </g>
        )
      })}
    </g>
  )
}

function Flower({ x, y, color, pal, s = 1, dry }: { x: number; y: number; color: string; pal: Palette; s?: number; dry: boolean }) {
  if (dry) {
    return <path d={`M${x},${y} q-2,-10 1,-18 m0,0 l-3,-3 m3,3 l3,-4`} stroke={pal.shade('#9a7a4a')} strokeWidth={1.4} fill="none" />
  }
  const petals = [0, 72, 144, 216, 288]
  return (
    <g>
      <path d={`M${x},${y} q-2,-10 1,-${18 * s}`} stroke={pal.c.grass} strokeWidth={1.6} fill="none" />
      <g transform={`translate(${x + 1},${y - 18 * s}) scale(${s})`}>
        {petals.map((a) => (
          <ellipse key={a} cx={0} cy={-4} rx={2.8} ry={4.4} transform={`rotate(${a})`} fill={pal.shade(color)} stroke={pal.c.ink} strokeWidth={0.7} />
        ))}
        <circle r={2.2} fill={pal.shade('#f2c94c')} stroke={pal.c.ink} strokeWidth={0.6} />
      </g>
    </g>
  )
}

// ---------- the land (one static layer) ----------

export const Land = memo(function Land({ pal }: { pal: Palette }) {
  const sid = useSid()
  const c = pal.c
  const dry = pal.weather === 'drought'
  const g = useMemo(() => {
    const r = rng(42)
    return {
      farBackEdge: inkEdge(LINES.farBack, r, 1.4, 3),
      farEdge: inkEdge(LINES.far, r, 1.8, 2),
      midEdge: inkEdge(LINES.mid, r, 2, 2),
      fieldEdge: inkEdge(LINES.field, r, 2, 1),
      midLeftEdge: inkEdge(LINES.midLeft, r, 2.2, 1),
      nearEdge: inkEdge(LINES.near, r, 2.4, 3),
      fieldRows: [0.25, 0.45, 0.65, 0.82]
        .map((k) => smooth(LINES.field.slice(1).map(([x, y]) => [x - 10, y + (500 - y) * k * 0.9 + 6] as P)))
        .join(' '),
      ticksMid: ticks(LINES.mid, r, 14, [8, 30], 6),
      ticksNear: ticks(LINES.near, r, 26, [10, 36], 8),
      pathTop: resample(LINES.path, 40).map(([x, y], i) => [x, y - 13 - Math.sin(i / 4) * 2] as P),
      pathBot: resample(LINES.path, 40).map(([x, y], i) => [x, y + 15 + Math.cos(i / 5) * 2] as P),
      cracks: [...Array(16)].map(() => {
        const x = r.range(30, 960)
        const y = yAt(LINES.near, x) + r.range(20, 60)
        const pts: P[] = [[x, y]]
        for (let k = 0; k < 4; k++) pts.push([pts[k][0] + r.range(-14, 14), pts[k][1] + r.range(-6, 6)])
        const branch = `M${pts[2][0].toFixed(1)},${pts[2][1].toFixed(1)} l${r.range(-10, 10).toFixed(1)},${r.range(4, 10).toFixed(1)}`
        return `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L')} ${branch}`
      }),
      reeds: [...Array(7)].map((_, i) => {
        const x = 196 + i * 7 + r.range(-2, 2)
        const h = r.range(26, 40)
        return { x, h, bend: r.range(-5, 5) }
      }),
    }
  }, [])
  const pondY = 552
  return (
    <g filter={`url(#${sid('wc')})`}>
      {/* far hills, hazy blue like distance */}
      <path d={area(LINES.farBack)} fill={c.farHill2} />
      <path d={g.farBackEdge} fill={c.ink} opacity={0.35} />
      <path d={area(LINES.far)} fill={`url(#${sid('far')})`} />
      <path d={g.farEdge} fill={c.ink} opacity={0.6} />
      {/* middle hills: green slope and an ochre field */}
      <path d={area(LINES.mid)} fill={`url(#${sid('mid')})`} />
      <path d={g.midEdge} fill={c.ink} opacity={0.8} />
      <path d={area(LINES.field)} fill={`url(#${sid('field')})`} />
      <path d={g.fieldRows} fill="none" stroke={mix(c.ochre, '#7a4a20', 0.25)} strokeWidth={1.6} opacity={0.45} strokeLinecap="round" />
      <path d={g.fieldEdge} fill={c.ink} opacity={0.8} />
      <path d={g.ticksMid} stroke={c.ink} strokeWidth={1.1} opacity={0.5} strokeLinecap="round" />
      <path d={area(LINES.midLeft)} fill={mix(c.midA, c.midB, 0.3)} />
      <path d={g.midLeftEdge} fill={c.ink} opacity={0.85} />
      <Bush x={60} y={404} s={0.9} pal={pal} seed={3} />
      <Bush x={135} y={402} s={0.7} pal={pal} seed={4} />
      <Bush x={960} y={430} s={0.75} pal={pal} seed={6} />
      {/* near hill where the plant lives */}
      <path d={area(LINES.near)} fill={`url(#${sid('near')})`} />
      <path d={g.nearEdge} fill={c.ink} />
      <path d={g.ticksNear} stroke={c.ink} strokeWidth={1.2} opacity={0.6} strokeLinecap="round" />
      <Bush x={905} y={530} s={1} pal={pal} seed={8} />
      <Bush x={40} y={514} s={0.8} pal={pal} seed={9} />
      {/* pond with reeds (a cracked mud patch in drought) */}
      <ellipse cx={262} cy={pondY} rx={76} ry={14} fill={mix(c.near2, '#3a3020', 0.25)} />
      <ellipse cx={262} cy={pondY - 1} rx={70} ry={11} fill={dry ? c.pond : `url(#${sid('pond')})`} stroke={c.ink} strokeWidth={1.8} />
      {dry ? (
        <path d="M205,552 l18,-4 l14,6 l20,-5 l18,5 l22,-4 M230,549 l6,7 M262,553 l-4,6 M290,548 l5,7" stroke={mix(c.pond, '#3a2a1a', 0.45)} strokeWidth={1.4} fill="none" />
      ) : (
        g.reeds.map((rd, i) => (
          <g key={i}>
            <path d={`M${rd.x},${pondY - 4} q${rd.bend},-${rd.h / 2} ${rd.bend * 1.4},-${rd.h}`} stroke={c.grass} strokeWidth={2} fill="none" />
            {i % 2 === 0 && <rect x={rd.x + rd.bend * 1.2 - 2.2} y={pondY - 4 - rd.h * 0.95} width={4.4} height={11} rx={2.2} fill={c.barkDark} stroke={c.ink} strokeWidth={0.8} />}
          </g>
        ))
      )}
      {/* old stump (the owl's perch at night) */}
      <g transform="translate(108,534)">
        <path d="M-17,4 C-16,-8 -15,-20 -14,-28 L14,-28 C15,-18 16,-8 19,4 Z" fill={c.bark} stroke={c.ink} strokeWidth={2} strokeLinejoin="round" />
        <ellipse cx={0} cy={-28} rx={14} ry={5} fill={mix(c.bark, '#f0d8a8', 0.45)} stroke={c.ink} strokeWidth={1.6} />
        <path d="M-7,-28 a7,2.6 0 1 0 14,0 a4,1.4 0 1 0 -8,0" fill="none" stroke={c.barkDark} strokeWidth={1} />
        <path d="M-8,-18 q2,8 -1,18 M6,-22 q-3,10 1,20" stroke={c.barkDark} strokeWidth={1.2} fill="none" />
      </g>
      {/* dirt path with dotted edges */}
      <path d={smooth(g.pathTop) + 'L' + [...g.pathBot].reverse().map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + 'Z'} fill={c.path} />
      <path d={smooth(g.pathTop)} fill="none" stroke={c.ink} strokeWidth={1.5} strokeDasharray="7 10" strokeLinecap="round" opacity={0.75} />
      <path d={smooth(g.pathBot)} fill="none" stroke={c.ink} strokeWidth={1.5} strokeDasharray="9 8" strokeLinecap="round" opacity={0.75} />
      <path d={smooth(g.pathBot.map(([x, y]) => [x, y - 4] as P))} fill="none" stroke={c.pathEdge} strokeWidth={4} opacity={0.6} />
      {dry && <path d={g.cracks.join(' ')} stroke={mix(c.near, '#4a3018', 0.5)} strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      <defs>
        <linearGradient id={sid('far')} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={c.farHill} />
          <stop offset="0.4" stopColor={mix(c.farHill, c.farHill2, 0.5)} />
        </linearGradient>
        <linearGradient id={sid('mid')} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor={c.midA} />
          <stop offset="1" stopColor={c.midB} />
        </linearGradient>
        <linearGradient id={sid('field')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={c.ochre2} />
          <stop offset="0.5" stopColor={c.ochre} />
        </linearGradient>
        <linearGradient id={sid('near')} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor={c.near} />
          <stop offset="0.6" stopColor={c.near2} />
        </linearGradient>
        <linearGradient id={sid('pond')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(pal.sky.bottom, c.pond, 0.4)} />
          <stop offset="1" stopColor={mix(c.pond, '#3f7f8a', 0.35)} />
        </linearGradient>
      </defs>
    </g>
  )
})

// ---------- foreground (in front of the animals on the path) ----------

export const Front = memo(function Front({ pal }: { pal: Palette }) {
  const sid = useSid()
  const c = pal.c
  const dry = pal.weather === 'drought'
  const g = useMemo(() => {
    const r = rng(77)
    const blades = (x0: number, x1: number, n: number, hMin: number, hMax: number, lean: number) => {
      const out: string[] = []
      for (let i = 0; i < n; i++) {
        const x = r.range(x0, x1)
        const h = r.range(hMin, hMax)
        const l = lean + r.range(-12, 12)
        out.push(brush([[x, H + 6], [x + l * 0.3, H - h * 0.5], [x + l, H - h]], r.range(5, 9), 0.6, r, { taperIn: 0, taperOut: 0.75 }))
      }
      return out.join(' ')
    }
    const flowers: { x: number; y: number; color: string; s: number }[] = []
    const colors = ['#b59ad8', '#f7f3ea', '#f4cf4a', '#eaa0b4', '#b59ad8']
    for (let i = 0; i < 16; i++) {
      const x = r.range(40, 980)
      const onNear = i < 7
      const y = onNear ? yAt(LINES.near, x) + r.range(14, 32) : yAt(LINES.front, x) + r.range(10, 40)
      if (onNear && Math.abs(x - 262) < 90) continue
      flowers.push({ x, y, color: colors[i % colors.length], s: onNear ? 0.75 : 1 })
    }
    return {
      edge: inkEdge(LINES.front, r, 2.4, 2),
      ticks: ticks(LINES.front, r, 18, [8, 40], 9),
      left: blades(-20, 120, 14, 70, 150, 20),
      right: blades(840, 1000, 8, 40, 90, -14),
      flowers,
      jit: jitter(LINES.front, r, 1),
    }
  }, [])
  return (
    <g filter={`url(#${sid('wc')})`}>
      <path d={area(LINES.front)} fill={`url(#${sid('front')})`} />
      <path d={g.edge} fill={c.ink} />
      <path d={g.ticks} stroke={c.ink} strokeWidth={1.2} opacity={0.55} strokeLinecap="round" />
      {g.flowers.map((f, i) => (
        <Flower key={i} {...f} color={f.color} pal={pal} dry={dry} />
      ))}
      <Bush x={985} y={722} s={1.6} pal={pal} seed={12} />
      <path d={g.right} fill={mix(c.front2, c.grass, 0.5)} stroke={c.ink} strokeWidth={1} />
      <path d={g.left} fill={c.grass} stroke={c.ink} strokeWidth={1.1} />
      <defs>
        <linearGradient id={sid('front')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.front} />
          <stop offset="1" stopColor={c.front2} />
        </linearGradient>
      </defs>
    </g>
  )
})

// ---------- sky ----------

function cloudPath(w: number, h: number, r: Rng): string {
  // flat-ish bottom, bumpy top
  const n = Math.round(r.range(3, 5))
  let d = `M0,0 C${w * 0.3},${h * 0.12} ${w * 0.7},${h * 0.12} ${w},0`
  let x = w
  for (let i = 0; i < n; i++) {
    const nx = w - ((i + 1) / n) * w
    const bh = h * (i === 0 || i === n - 1 ? r.range(0.45, 0.7) : r.range(0.75, 1.05))
    d += ` C${x + 6},${-bh * 0.9} ${nx - 4},${-bh * 1.05} ${nx},${i === n - 1 ? 0 : -bh * 0.22}`
    x = nx
  }
  return d + 'Z'
}

interface CloudM {
  d: string
  y: number
  w: number
  h: number
  dur: number
  delay: number
  s: number
}

function makeClouds(count: number, seed: number, size: 0 | 1 | 2): CloudM[] {
  const r = rng(seed)
  return Array.from({ length: count }, (_, i) => {
    const w = [r.range(120, 220), r.range(220, 360), r.range(520, 760)][size]
    const h = w * r.range(0.26, 0.36) * (size === 2 ? 0.8 : 1)
    const dur = r.range(150, 260) * (size === 2 ? 1.6 : 1)
    return {
      d: cloudPath(w, h, r),
      y: [r.range(60, 230), r.range(60, 280), r.range(70, 210)][size],
      w,
      h,
      dur,
      delay: -((i / count) * dur + r.range(0, 20)),
      s: r.range(0.85, 1.1),
    }
  })
}

const CLOUDS = {
  sunny: makeClouds(3, 11, 0),
  'partly-cloudy': makeClouds(7, 12, 0),
  overcast: [...makeClouds(5, 16, 2), ...makeClouds(7, 13, 1), ...makeClouds(4, 14, 0)],
  drought: makeClouds(2, 15, 0),
}

export function Sky({ pal, children }: { pal: Palette; children?: ReactNode }) {
  const sid = useSid()
  const { sky, night, weather, hour } = pal
  const sun = sunArc(hour)
  const moon = moonArc(hour)
  const stars = useMemo(() => {
    const r = rng(5)
    return [...Array(70)].map(() => ({ x: r.range(0, W), y: r.range(0, 330), s: r.range(0.6, 1.8), tw: r.next() < 0.35, d: r.range(2, 6), dl: -r.range(0, 6) }))
  }, [])
  const rays = useMemo(() => {
    const r = rng(8)
    return [...Array(12)].map((_, i) => {
      const a = (i / 12) * Math.PI * 2 + r.range(-0.1, 0.1)
      const r0 = 58 + r.range(0, 6)
      const r1 = r0 + r.range(14, 26)
      return brush([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], 2.4, 1, r, { taperIn: 0.2, taperOut: 0.5, samples: 8 })
    }).join(' ')
  }, [])
  const sunOutline = useMemo(() => {
    const r = rng(9)
    const pts: P[] = [...Array(14)].map((_, i) => [Math.cos((i / 14) * Math.PI * 2) * 44, Math.sin((i / 14) * Math.PI * 2) * 44])
    return smooth(jitter(pts, r, 1.6), true)
  }, [])
  const starsVis = night * (weather === 'overcast' ? 0.12 : weather === 'partly-cloudy' ? 0.7 : 1)
  const sunVis = weather === 'overcast' ? 0.15 : 1
  const sx = sun === null ? 0 : 40 + sun * 250
  const sy = sun === null ? 0 : 330 - Math.sin(sun * Math.PI) * 250
  const mx = moon === null ? 0 : 290 - moon * 230
  const my = moon === null ? 0 : 320 - Math.sin(moon * Math.PI) * 230
  const lowSun = sun === null ? 0 : 1 - Math.min(1, Math.sin(sun * Math.PI) * 2.2)
  const cloudFill = (k: number) =>
    weather === 'overcast' ? pal.shade(mix('#a9b1b7', '#7d8790', k)) : pal.shade(mix('#ffffff', weather === 'drought' ? '#efe1c0' : '#cddbe4', k))
  return (
    <g>
      <defs>
        <linearGradient id={sid('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="0.38" stopColor={sky.mid} />
          <stop offset="0.6" stopColor={sky.bottom} />
        </linearGradient>
        <radialGradient id={sid('glow')}>
          <stop offset="0" stopColor={sky.glow} stopOpacity={0.85} />
          <stop offset="0.35" stopColor={sky.glow} stopOpacity={0.35} />
          <stop offset="1" stopColor={sky.glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={sid('sun')} cx="0.4" cy="0.38">
          <stop offset="0" stopColor={mix('#fff2a8', '#ffb070', lowSun)} />
          <stop offset="1" stopColor={mix('#f9c443', '#f08a4a', lowSun)} />
        </radialGradient>
        <radialGradient id={sid('moonglow')}>
          <stop offset="0" stopColor="#e8ecff" stopOpacity={0.45} />
          <stop offset="1" stopColor="#e8ecff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={sid('cloud')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cloudFill(0)} />
          <stop offset="1" stopColor={cloudFill(1)} />
        </linearGradient>
      </defs>
      <rect x={-10} y={-10} width={W + 20} height={H + 20} fill={`url(#${sid('sky')})`} />
      {/* stars */}
      <g style={{ opacity: starsVis }} className="gs-fade">
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fffbe8" className={s.tw ? 'gs-twinkle' : undefined} style={s.tw ? { animationDuration: `${s.d}s`, animationDelay: `${s.dl}s` } : undefined} />
        ))}
        {night > 0.6 && weather !== 'overcast' && (
          <g className="gs-shoot">
            <path d="M0,0 L-70,30" stroke={`url(#${sid('glow')})`} strokeWidth={2} />
            <path d="M0,0 L-60,26" stroke="#fffbe8" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
          </g>
        )}
      </g>
      {/* sun */}
      {sun !== null && (
        <g transform={`translate(${sx.toFixed(1)},${sy.toFixed(1)})`} style={{ opacity: sunVis }}>
          <circle r={230} fill={`url(#${sid('glow')})`} opacity={1 - night * 0.7} />
          <g className="gs-spin">
            <path d={rays} fill={pal.c.ink} opacity={0.85} />
          </g>
          <path d={sunOutline} fill={`url(#${sid('sun')})`} />
          <path d={sunOutline} fill="none" stroke={pal.c.ink} strokeWidth={2} opacity={0.85} />
          <path d="M-22,-14 q8,-12 22,-12" stroke="#fffbe0" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.6} />
        </g>
      )}
      {/* moon */}
      {moon !== null && (
        <g transform={`translate(${mx.toFixed(1)},${my.toFixed(1)})`} style={{ opacity: Math.min(1, night * 1.6) * (weather === 'overcast' ? 0.3 : 1) }}>
          <circle r={110} fill={`url(#${sid('moonglow')})`} />
          <circle r={28} fill="#f5f1dc" stroke="#2c3346" strokeWidth={1.6} />
          <circle cx={-8} cy={-6} r={6} fill="#e2dcc0" />
          <circle cx={9} cy={7} r={4.5} fill="#e2dcc0" />
          <circle cx={4} cy={-12} r={2.6} fill="#e2dcc0" />
          <path d="M-20,8 a22,22 0 0 0 30,12" stroke="#d5ceb2" strokeWidth={3} fill="none" />
        </g>
      )}
      {/* clouds */}
      {CLOUDS[weather].map((cl, i) => (
        <g key={`${weather}-${i}`} transform={`translate(0,${cl.y.toFixed(0)}) scale(${cl.s.toFixed(2)})`}>
          <g className="gs-drift" style={{ animationDuration: `${cl.dur.toFixed(0)}s`, animationDelay: `${cl.delay.toFixed(0)}s` }}>
            <path d={cl.d} transform="translate(4,6)" fill={cloudFill(1)} opacity={0.5} />
            <path d={cl.d} fill={`url(#${sid('cloud')})`} stroke={pal.c.ink} strokeWidth={1.8} strokeLinejoin="round" opacity={weather === 'overcast' ? 0.95 : 1} />
            <path d={`M${cl.w * 0.12},${-cl.h * 0.08} C${cl.w * 0.35},${cl.h * 0.02} ${cl.w * 0.6},${cl.h * 0.02} ${cl.w * 0.86},${-cl.h * 0.1}`} stroke={pal.c.ink} strokeWidth={1.1} fill="none" opacity={0.35} />
          </g>
        </g>
      ))}
      {children}
    </g>
  )
}

// ---------- filters and grain ----------

export function Filters() {
  const sid = useSid()
  return (
    <defs>
      <filter id={sid('wc')} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={4} result="warp" />
        <feDisplacementMap in="SourceGraphic" in2="warp" scale={4} xChannelSelector="R" yChannelSelector="G" result="wob" />
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.018" numOctaves={3} seed={9} result="pig" />
        <feColorMatrix in="pig" type="matrix" values="0.32 0 0 0 0.78  0.32 0 0 0 0.78  0.32 0 0 0 0.78  0 0 0 0 1" result="pigGrey" />
        <feBlend in="wob" in2="pigGrey" mode="multiply" result="painted" />
        <feComposite in="painted" in2="wob" operator="in" />
      </filter>
      <filter id={sid('grain')} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={2} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.12  1.5 0 0 0 -0.62" />
      </filter>
    </defs>
  )
}
