import { useSid } from './ids'
// Static-ish scenery layers: sky (sun, moon, stars, clouds), rolling hills, pond, path and foreground.
import { memo, useMemo, type ReactNode } from 'react'
import { brush, desaturate, jitter, mix, resample, rng, scallop, smooth, type P, type Rng } from './ink'
import { area, H, LINES, pathEdges, W, yAt } from './terrain'
import { moonArc, sunArc, type Palette } from './palette'
import { FRONT_BANDS, grassClass, GrassWaves } from './Ground'

export { W, H, PLANT_BASE, LINES, yAt, area, pathEdges } from './terrain'

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

/** Tiny far-away trees standing along a hill top. */
function treeLine(line: P[], r: Rng, s = 1): string {
  const out: string[] = []
  let x = r.range(10, 40)
  while (x < 1000) {
    if (r.next() < 0.55) {
      const y = yAt(line, x) + 2
      const h = r.range(7, 15) * s
      const w = h * r.range(0.45, 0.65)
      if (r.next() < 0.5) out.push(`M${(x - w / 2).toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},${(y - h).toFixed(1)} L${(x + w / 2).toFixed(1)},${y.toFixed(1)}Z`)
      else out.push(`M${(x - w / 2).toFixed(1)},${y.toFixed(1)} a${(w / 2).toFixed(1)},${(h / 2).toFixed(1)} 0 1 1 ${w.toFixed(1)},0Z`)
    }
    x += r.range(6, 22)
  }
  return out.join(' ')
}

/** Fine grass blades scattered below a hill line (painted texture, not ink). */
function grassTexture(line: P[], r: Rng, n: number, dy: [number, number], size: number): string {
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const x = r.range(line[0][0] + 5, line[line.length - 1][0] - 5)
    const y = yAt(line, x) + r.range(dy[0], dy[1])
    const h = size * r.range(0.5, 1.1)
    const l = r.range(-2.5, 2.5)
    parts.push(`M${x.toFixed(1)},${y.toFixed(1)} q${(l * 0.3).toFixed(1)},${(-h * 0.5).toFixed(1)} ${l.toFixed(1)},${(-h).toFixed(1)}`)
  }
  return parts.join(' ')
}

const BLOBS = [
  [-22, -16, 20],
  [0, -24, 25],
  [24, -14, 18],
  [-8, -8, 18],
  [14, -6, 16],
]

/** Spring blossom dots and snow caps for each lobe of a bush (seeded, so they never move). */
function bushExtras(seed: number) {
  const r = rng(seed + 900)
  return {
    dots: BLOBS.map(([bx, by, br]) =>
      [...Array(5)].map(() => {
        const a = r.range(-Math.PI, Math.PI)
        const d = br * Math.sqrt(r.range(0.05, 0.7))
        const cx = bx + Math.cos(a) * d
        const cy = by + Math.sin(a) * d * 0.8
        const rr = r.range(1.6, 2.6)
        return `M${(cx + rr).toFixed(1)},${cy.toFixed(1)} a${rr.toFixed(1)},${rr.toFixed(1)} 0 1,0 ${(-2 * rr).toFixed(1)},0 a${rr.toFixed(1)},${rr.toFixed(1)} 0 1,0 ${(2 * rr).toFixed(1)},0Z`
      }).join(''),
    ),
    caps: BLOBS.map(([bx, by, br]) => scallop(bx, by - br * 0.5, br * 0.82, br * 0.36, 8, r, 0.14)),
  }
}

function Bush({ x, y, s, pal, seed }: { x: number; y: number; s: number; pal: Palette; seed: number }) {
  const r = rng(seed)
  const blobs = BLOBS
  const { dots, caps } = useMemo(() => bushExtras(seed), [seed])
  const bloom = pal.season.spring * (1 - pal.snow) * (pal.weather === 'drought' ? 0.2 : 1)
  const snowC = pal.shade('#f6f9fc')
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {blobs.map(([bx, by, br], i) => {
        const d = scallop(bx, by, br, br * 0.82, 7, r, 0.3)
        return (
          <g key={i}>
            <path d={d} transform="translate(3,5)" fill={pal.c.bushDark} />
            <path d={d} fill={i % 2 ? pal.c.bush : mix(pal.c.bush, pal.c.bushLight, 0.4)} stroke={pal.c.ink} strokeWidth={1.8 / s} />
            <path d={scallop(bx - br * 0.25, by - br * 0.3, br * 0.45, br * 0.35, 5, r)} fill={pal.c.bushLight} opacity={0.7} />
            {bloom > 0.05 && <path d={dots[i]} fill={pal.shade(i % 2 ? '#fbe3ea' : '#fff8f0')} opacity={bloom} />}
            {pal.snow > 0.05 && <path d={caps[i]} fill={snowC} stroke={pal.c.ink} strokeWidth={0.9 / s} strokeOpacity={0.45} opacity={Math.min(1, pal.snow * 1.4)} />}
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
      pathTop: pathEdges().top,
      pathBot: pathEdges().bot,
      cracks: [...Array(16)].map(() => {
        const x = r.range(30, 960)
        const y = yAt(LINES.near, x) + r.range(20, 60)
        const pts: P[] = [[x, y]]
        for (let k = 0; k < 4; k++) pts.push([pts[k][0] + r.range(-14, 14), pts[k][1] + r.range(-6, 6)])
        const branch = `M${pts[2][0].toFixed(1)},${pts[2][1].toFixed(1)} l${r.range(-10, 10).toFixed(1)},${r.range(4, 10).toFixed(1)}`
        return `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L')} ${branch}`
      }),
      treeline: treeLine(LINES.far, r),
      treelineBack: treeLine(LINES.farBack, r, 0.6),
      grassNear: grassTexture(LINES.near, r, 260, [8, 150], 7),
      grassMid: grassTexture(LINES.midLeft, r, 110, [6, 60], 5),
      grassMidR: grassTexture(LINES.mid, r, 70, [6, 40], 4),
      pebbles: [...Array(26)].map(() => {
        const x = r.range(0, 1000)
        return { x, y: yAt(LINES.path, x) + r.range(-8, 10), rx: r.range(1.2, 3), ry: r.range(0.8, 1.8) }
      }),
    }
  }, [])
  const pondY = 556
  // the colour of the air near the horizon, laid over distant land
  const air = mix(pal.sky.bottom, pal.sky.mid, 0.25)
  const haze = (col: string, k: number) => mix(col, air, k * (pal.weather === 'overcast' ? 1.3 : 1))
  return (
    <g>
      {/* far hills: the further away, the more they take on the colour of the air (atmospheric perspective) */}
      <path d={area(LINES.farBack)} fill={`url(#${sid('farback')})`} />
      <path d={g.farBackEdge} fill={c.ink} opacity={0.22} />
      <path d={g.treelineBack} fill={haze(mix(c.farHill2, c.farHill, 0.6), 0.42)} />
      <path d={area(LINES.far)} fill={`url(#${sid('far')})`} />
      <path d={g.treeline} fill={haze(mix(c.farHill, '#2e5a52', 0.35), 0.24)} />
      <path d={smooth(LINES.far.map(([x, y]) => [x, y + 3] as P))} fill="none" stroke={mix(c.farHill2, '#ffffff', 0.4)} strokeWidth={3} opacity={0.35} />
      <path d={g.farEdge} fill={c.ink} opacity={0.42} />
      {/* a low band of haze where the far hills meet the middle distance */}
      <path d={smooth(LINES.mid.map(([x, y]) => [x, y - 26] as P)) + 'L1030,440 L-30,440Z'} fill={`url(#${sid('lowhaze')})`} />
      {/* middle hills: green slope and an ochre field */}
      <path d={area(LINES.mid)} fill={`url(#${sid('mid')})`} />
      <path d={g.grassMidR} stroke={mix(c.midB, '#24401a', 0.3)} strokeWidth={1} opacity={0.5} strokeLinecap="round" />
      <path d={smooth(LINES.mid.map(([x, y]) => [x, y + 3] as P))} fill="none" stroke={mix(c.midA, '#fffbe0', 0.45)} strokeWidth={3} opacity={0.4} />
      <path d={g.midEdge} fill={c.ink} opacity={0.8} />
      <path d={area(LINES.field)} fill={`url(#${sid('field')})`} />
      <path d={g.fieldRows} fill="none" stroke={mix(c.ochre, '#7a4a20', 0.25)} strokeWidth={1.6} opacity={0.45} strokeLinecap="round" />
      <path d={g.fieldEdge} fill={c.ink} opacity={0.8} />
      <path d={g.ticksMid} stroke={c.ink} strokeWidth={1.1} opacity={0.5} strokeLinecap="round" />
      <path d={area(LINES.midLeft)} fill={mix(c.midA, c.midB, 0.3)} />
      <path d={g.grassMid} stroke={mix(c.midB, '#24401a', 0.35)} strokeWidth={1.1} opacity={0.55} strokeLinecap="round" />
      <path d={smooth(LINES.midLeft.map(([x, y]) => [x, y + 3] as P))} fill="none" stroke={mix(c.midA, '#fffbe0', 0.5)} strokeWidth={3} opacity={0.4} />
      <path d={g.midLeftEdge} fill={c.ink} opacity={0.85} />
      <Bush x={60} y={404} s={0.9} pal={pal} seed={3} />
      <Bush x={135} y={402} s={0.7} pal={pal} seed={4} />
      <Bush x={960} y={430} s={0.75} pal={pal} seed={6} />
      {/* near hill where the plant lives */}
      <path d={area(LINES.near)} fill={`url(#${sid('near')})`} />
      <path d={g.grassNear} stroke={mix(c.near2, '#1f3a14', 0.35)} strokeWidth={1.1} opacity={0.55} strokeLinecap="round" />
      <path d={smooth(LINES.near.map(([x, y]) => [x, y + 3] as P))} fill="none" stroke={mix(c.near, '#fffbe0', 0.5)} strokeWidth={3.5} opacity={0.45} />
      <path d={g.nearEdge} fill={c.ink} />
      <path d={g.ticksNear} stroke={c.ink} strokeWidth={1.2} opacity={0.6} strokeLinecap="round" />
      <Bush x={905} y={530} s={1} pal={pal} seed={8} />
      <Bush x={40} y={514} s={0.8} pal={pal} seed={9} />
      {/* pond with reeds (a cracked mud patch in drought) */}
      <ellipse cx={258} cy={pondY + 1} rx={107} ry={20} fill={mix(c.near2, '#3a3020', 0.25)} />
      <ellipse cx={258} cy={pondY - 3} rx={104} ry={16} fill={mix(c.near, '#ffffff', 0.15)} opacity={0.6} />
      <ellipse cx={258} cy={pondY} rx={100} ry={16} fill={dry ? c.pond : `url(#${sid('pond')})`} stroke={c.ink} strokeWidth={1.8} />
      {dry && (
        <path d="M175,556 l22,-5 l18,7 l24,-6 l22,6 l26,-5 l24,4 l20,-3 M205,552 l7,9 M243,557 l-5,8 M282,551 l6,9 M318,555 l-4,7" stroke={mix(c.pond, '#3a2a1a', 0.45)} strokeWidth={1.4} fill="none" />
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
      <path d={smooth(g.pathTop.map(([x, y]) => [x, y + 4] as P))} fill="none" stroke={mix(c.path, '#ffffff', 0.5)} strokeWidth={3} opacity={0.5} />
      {g.pebbles.map((pb, i) => (
        <ellipse key={i} cx={pb.x} cy={pb.y} rx={pb.rx} ry={pb.ry} fill={mix(c.pathEdge, '#6a5a40', 0.35)} opacity={0.7} />
      ))}
      {dry && <path d={g.cracks.join(' ')} stroke={mix(c.near, '#4a3018', 0.5)} strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      <defs>
        <linearGradient id={sid('farback')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={haze(c.farHill2, 0.5)} />
          <stop offset="0.25" stopColor={haze(c.farHill2, 0.36)} />
        </linearGradient>
        <linearGradient id={sid('far')} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor={haze(c.farHill, 0.3)} />
          <stop offset="0.4" stopColor={haze(mix(c.farHill, c.farHill2, 0.5), 0.18)} />
        </linearGradient>
        <linearGradient id={sid('lowhaze')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={air} stopOpacity={0} />
          <stop offset="0.45" stopColor={air} stopOpacity={0.28} />
          <stop offset="1" stopColor={air} stopOpacity={0} />
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

export const Front = memo(function Front({ pal, wind = 0.15 }: { pal: Palette; wind?: number }) {
  const sid = useSid()
  const c = pal.c
  const dry = pal.weather === 'drought'
  const sea = pal.season
  // most flowers in spring, fewer in autumn, only dry stalks in winter or under snow
  const flowering = (sea.spring + sea.summer * 0.9 + sea.autumn * 0.45 + sea.winter * 0.05) * (1 - pal.snow)
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
      if (onNear && Math.abs(x - 258) < 120) continue
      flowers.push({ x, y, color: colors[i % colors.length], s: onNear ? 0.75 : 1 })
    }
    return {
      edge: inkEdge(LINES.front, r, 2.4, 2),
      ticks: ticks(LINES.front, r, 18, [8, 40], 9),
      grass: grassTexture(LINES.front, r, 220, [6, 60], 9),
      left: blades(-20, 120, 14, 70, 150, 20),
      right: blades(840, 1000, 8, 40, 90, -14),
      flowers,
      jit: jitter(LINES.front, r, 1),
    }
  }, [])
  return (
    <g>
      <path d={area(LINES.front)} fill={`url(#${sid('front')})`} />
      <path d={g.grass} stroke={mix(c.front2, '#1a3310', 0.35)} strokeWidth={1.2} opacity={0.5} strokeLinecap="round" />
      <path d={smooth(LINES.front.map(([x, y]) => [x, y + 3] as P))} fill="none" stroke={mix(c.front, '#fffbe0', 0.45)} strokeWidth={3.5} opacity={0.4} />
      <path d={g.edge} fill={c.ink} />
      <path d={g.ticks} stroke={c.ink} strokeWidth={1.2} opacity={0.55} strokeLinecap="round" />
      <GrassWaves pal={pal} wind={wind} front={{ bands: FRONT_BANDS }} />
      {g.flowers.map((f, i) => (
        <Flower key={i} {...f} color={f.color} pal={pal} dry={dry || i / g.flowers.length >= flowering} />
      ))}
      <Bush x={985} y={722} s={1.6} pal={pal} seed={12} />
      {/* tall blades in the corners lean with the wind (each pivots at its foot) */}
      <g className={grassClass(wind)} style={{ animationDelay: '-1.3s' }}>
        <path d={g.right} fill={mix(c.front2, c.grass, 0.5)} stroke={c.ink} strokeWidth={1} />
      </g>
      <g className={grassClass(wind)}>
        <path d={g.left} fill={c.grass} stroke={c.ink} strokeWidth={1.1} />
      </g>
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
/** Extra clouds that gather as the garden is neglected (added one by one with the gloom). */
const GATHERING = (() => {
  const big = makeClouds(5, 23, 2)
  const mid = makeClouds(6, 22, 1)
  return [mid[0], mid[1], big[0], mid[2], big[1], mid[3], big[2], mid[4], big[3], mid[5], big[4]]
})()

/** Where the sun and moon are (scene units), or null when below the horizon. Shared with the sky shader. */
export function celestial(hour: number) {
  const sun = sunArc(hour)
  const moon = moonArc(hour)
  return {
    sun: sun === null ? null : { x: 40 + sun * 250, y: 330 - Math.sin(sun * Math.PI) * 250, low: 1 - Math.min(1, Math.sin(sun * Math.PI) * 2.2) },
    moon: moon === null ? null : { x: 290 - moon * 230, y: 320 - Math.sin(moon * Math.PI) * 230 },
  }
}

/** Moon phase for a date: 0 = new, 0.5 = full (from a known new moon, 29.53-day cycle). */
export function moonPhase(d: Date): number {
  const ref = Date.UTC(2000, 0, 6, 18, 14)
  const days = (d.getTime() - ref) / 86_400_000
  return (((days / 29.530588853) % 1) + 1) % 1
}

/** Lit part of the moon disk of radius r for phase p. */
function moonLit(p: number, r: number): string {
  const k = Math.cos(2 * Math.PI * p)
  const rx = Math.abs(k) * r
  const sweep = k > 0 ? 0 : 1
  const d = `M0,${-r} A${r},${r} 0 0,1 0,${r} A${rx.toFixed(2)},${r} 0 0,${sweep} 0,${-r}Z`
  return d
}

export function Moon({ phase, ink }: { phase: number; ink: string }) {
  const sid = useSid()
  const r = 26
  const waning = phase > 0.5
  const lit = moonLit(waning ? 1 - phase : phase, r)
  return (
    <g>
      <defs>
        <clipPath id={sid('moonlit')}>
          <path d={lit} transform={waning ? 'scale(-1,1)' : undefined} />
        </clipPath>
        <radialGradient id={sid('moonface')} cx="0.42" cy="0.4">
          <stop offset="0" stopColor="#fffdf0" />
          <stop offset="1" stopColor="#e9e3c8" />
        </radialGradient>
      </defs>
      {/* earthshine: the dark part of the moon faintly visible */}
      <circle r={r} fill="#25304d" opacity={0.55} />
      <g clipPath={`url(#${sid('moonlit')})`}>
        <circle r={r} fill={`url(#${sid('moonface')})`} />
        <path d="M-12,-10 c5,-4 12,-2 11,4 c-1,6 -9,7 -12,3 c-2,-2 -1,-5 1,-7Z" fill="#d9d2b4" opacity={0.8} />
        <path d="M4,4 c6,-2 11,2 9,7 c-2,4 -8,4 -10,1 c-2,-3 -1,-6 1,-8Z" fill="#d9d2b4" opacity={0.7} />
        <path d="M-6,10 c3,-1 6,1 5,4 c-1,2 -5,2 -6,0Z" fill="#d9d2b4" opacity={0.7} />
        <circle cx={10} cy={-13} r={2.4} fill="none" stroke="#cfc7a6" strokeWidth={0.9} />
        <circle cx={-15} cy={6} r={1.6} fill="none" stroke="#cfc7a6" strokeWidth={0.8} />
        <circle cx={-2} cy={-18} r={1.3} fill="#d6cfb0" />
      </g>
      <circle r={r} fill="none" stroke={ink} strokeWidth={1.1} opacity={0.5} />
    </g>
  )
}

export function Sky({ pal, children, shader, phase, wind = 0.15 }: { pal: Palette; children?: ReactNode; shader: boolean; phase: number; wind?: number }) {
  const sid = useSid()
  const { sky, night, weather, hour } = pal
  const { sun, moon } = celestial(hour)
  const stars = useMemo(() => {
    const r = rng(5)
    return [...Array(70)].map(() => ({ x: r.range(0, W), y: r.range(0, 330), s: r.range(0.6, 1.8), tw: r.next() < 0.35, d: r.range(2, 6), dl: -r.range(0, 6) }))
  }, [])
  const rays = useMemo(() => {
    const r = rng(8)
    return [...Array(16)].map((_, i) => {
      const a = (i / 16) * Math.PI * 2 + r.range(-0.05, 0.05)
      const long = i % 2 === 0
      const r0 = 54 + r.range(0, 3)
      const r1 = r0 + (long ? r.range(22, 30) : r.range(10, 15))
      return brush([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], long ? 2.2 : 1.6, 0.8, r, { taperIn: 0.15, taperOut: 0.55, samples: 8, wobble: 0.05 })
    }).join(' ')
  }, [])
  const sunOutline = useMemo(() => {
    const r = rng(9)
    const pts: P[] = [...Array(18)].map((_, i) => [Math.cos((i / 18) * Math.PI * 2) * 44, Math.sin((i / 18) * Math.PI * 2) * 44])
    return smooth(jitter(pts, r, 0.8), true)
  }, [])
  const starsVis = night * (weather === 'overcast' ? 0.12 : weather === 'partly-cloudy' ? 0.7 : 1)
  const sunVis = (weather === 'overcast' ? 0.15 : 1) * (1 - pal.gloom * 0.45)
  const sunC = (c: string) => desaturate(c, pal.gloom * 0.85)
  const lowSun = sun?.low ?? 0
  const g = pal.gloom
  const cloudFill = (k: number) =>
    weather === 'overcast'
      ? pal.shade(mix('#a9b1b7', '#7d8790', k))
      : pal.shade(mix(mix('#ffffff', weather === 'drought' ? '#efe1c0' : '#cddbe4', k), mix('#b3b9bd', '#8a939a', k), g * 0.7))
  const clouds = weather === 'overcast' ? CLOUDS.overcast : [...CLOUDS[weather], ...GATHERING.slice(0, Math.round(g * GATHERING.length))]
  const rim = mix(sky.glow, '#ffffff', 0.5)
  // clouds race in a strong wind and dawdle on a still day
  const speed = 0.55 + wind * 2.6
  // at sunrise and sunset the undersides of the clouds catch the low sun
  const blush = sun ? lowSun * (1 - night) * (weather === 'overcast' ? 0.35 : 0.8) * (1 - g * 0.7) : 0
  const under = mix(cloudFill(1), mix(sky.glow, '#ff8f6a', 0.35), blush * 0.75)
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
          <stop offset="0" stopColor={sunC(mix('#fffbe0', '#ffd0a0', lowSun))} />
          <stop offset="0.55" stopColor={sunC(mix('#ffe27a', '#ffb070', lowSun))} />
          <stop offset="1" stopColor={sunC(mix('#f6b93b', '#ee7d45', lowSun))} />
        </radialGradient>
        <radialGradient id={sid('moonglow')}>
          <stop offset="0" stopColor="#e8ecff" stopOpacity={0.45} />
          <stop offset="1" stopColor="#e8ecff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={sid('cloud')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cloudFill(0)} />
          <stop offset="0.7" stopColor={mix(cloudFill(0), under, 0.6)} />
          <stop offset="1" stopColor={under} />
        </linearGradient>
      </defs>
      {!shader && (
        <>
          <rect x={-10} y={-10} width={W + 20} height={H + 20} fill={`url(#${sid('sky')})`} />
          <g style={{ opacity: starsVis }} className="gs-fade">
            {stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fffbe8" className={s.tw ? 'gs-twinkle' : undefined} style={s.tw ? { animationDuration: `${s.d}s`, animationDelay: `${s.dl}s` } : undefined} />
            ))}
          </g>
        </>
      )}
      {/* sun */}
      {sun && (
        <g transform={`translate(${sun.x.toFixed(1)},${sun.y.toFixed(1)})`} style={{ opacity: sunVis }}>
          {!shader && <circle r={230} fill={`url(#${sid('glow')})`} opacity={1 - night * 0.7} />}
          <g className="gs-spin">
            <path d={rays} fill={pal.c.ink} opacity={0.8} />
          </g>
          <circle r={44} fill="transparent" data-sun="1" />
          <path d={sunOutline} fill={`url(#${sid('sun')})`} />
          <path d={sunOutline} fill="none" stroke={pal.c.ink} strokeWidth={1.6} opacity={0.75} />
          <path d="M-24,-12 q8,-15 26,-16" stroke="#fffdf0" strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.7} />
          <path d="M-30,4 q-1,8 3,14" stroke="#fffdf0" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.45} />
        </g>
      )}
      {/* moon */}
      {moon && (
        <g transform={`translate(${moon.x.toFixed(1)},${moon.y.toFixed(1)})`} style={{ opacity: Math.min(1, night * 1.6) * (weather === 'overcast' ? 0.3 : 1) }}>
          {!shader && <circle r={110} fill={`url(#${sid('moonglow')})`} />}
          <Moon phase={phase} ink={pal.c.ink} />
        </g>
      )}
      {/* clouds */}
      {clouds.map((cl, i) => (
        <g key={`${weather}-${i}`} transform={`translate(0,${cl.y.toFixed(0)}) scale(${cl.s.toFixed(2)})`}>
          <g className="gs-drift" style={{ animationDuration: `${(cl.dur / speed).toFixed(0)}s`, animationDelay: `${(cl.delay / speed).toFixed(0)}s` }}>
            <path d={cl.d} transform="translate(4,6)" fill={under} opacity={0.45} />
            <path d={cl.d} className="gs-cloudbody" fill={`url(#${sid('cloud')})`} />
            {/* sunlit upper rim */}
            <path d={cl.d} fill="none" stroke={rim} strokeWidth={3} opacity={weather === 'overcast' ? 0.15 : 0.55 * (1 - night) * (1 - g * 0.7)} transform="translate(-1,-1.5)" />
            <path d={cl.d} fill="none" stroke={pal.c.ink} strokeWidth={1.4} strokeLinejoin="round" opacity={0.8} />
            <path d={`M${cl.w * 0.12},${-cl.h * 0.08} C${cl.w * 0.35},${cl.h * 0.02} ${cl.w * 0.6},${cl.h * 0.02} ${cl.w * 0.86},${-cl.h * 0.1}`} stroke={pal.c.ink} strokeWidth={0.9} fill="none" opacity={0.3} />
          </g>
        </g>
      ))}
      {children}
    </g>
  )
}

// ---------- paper texture ----------

/** A watercolour-paper texture laid over the whole scene with a multiply blend (crisp, nothing is blurred). */
export function Paper() {
  const sid = useSid()
  return (
    <>
      <defs>
        <filter id={sid('paper')} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.005 0.014" numOctaves={3} seed={9} result="pig" />
          <feColorMatrix in="pig" type="matrix" values="0.28 0 0 0 0.8  0.28 0 0 0 0.8  0.28 0 0 0 0.79  0 0 0 0 1" result="pigGrey" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={2} seed={2} result="fine" />
          <feColorMatrix in="fine" type="matrix" values="0.18 0 0 0 0.88  0.18 0 0 0 0.87  0.18 0 0 0 0.85  0 0 0 0 1" result="fineGrey" />
          <feBlend in="pigGrey" in2="fineGrey" mode="multiply" />
        </filter>
      </defs>
      <rect width={W} height={H} filter={`url(#${sid('paper')})`} />
    </>
  )
}
