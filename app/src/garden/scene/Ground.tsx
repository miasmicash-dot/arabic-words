// The living ground, drawn over the land and under the plant and animals: grass that sways in waves with the
// wind, the plant's long shadow moving with the sun, sunrise and sunset light on the hill tops, wet paths with
// puddles that ripple in the rain, fallen autumn leaves and settled snow. In front of everything: dew in the
// morning grass, snow on the farmer's fence and glints on fresh snow.
import { memo, useMemo } from 'react'
import { brush, mix, rng, smooth, type P } from './ink'
import { LINES, pathEdges, yAt, PLANT_BASE } from './terrain'
import type { Palette } from './palette'
import { useSid } from './ids'

/** CSS class for the sway of grass at this wind strength (0..1). */
export function grassClass(wind: number): string {
  return wind < 0.18 ? 'gs-grass gs-grass-calm' : wind < 0.42 ? 'gs-grass gs-grass-breeze' : wind < 0.72 ? 'gs-grass gs-grass-windy' : 'gs-grass gs-grass-gale'
}

const f = (n: number) => n.toFixed(1)

// ---------- grass in waves ----------

interface Band { d: string; x: number; light: boolean }

/** Grass blades along a hill, in narrow bands that each sway a moment after the one before: a wave of wind. */
function grassBands(line: P[], seed: number, x0: number, x1: number, bands: number, perBand: number, dy: [number, number], size: number): Band[] {
  const r = rng(seed)
  const out: Band[] = []
  const w = (x1 - x0) / bands
  for (let b = 0; b < bands; b++) {
    const parts: string[] = []
    for (let i = 0; i < perBand; i++) {
      const x = x0 + b * w + r.range(0, w)
      const y = yAt(line, x) + r.range(dy[0], dy[1])
      const h = size * r.range(0.55, 1.15)
      const l = r.range(-2, 3)
      parts.push(brush([[x, y + 1], [x + l * 0.4, y - h * 0.55], [x + l, y - h]], r.range(1.6, 2.6), 0.3, r, { taperIn: 0, taperOut: 0.8, samples: 6, wobble: 0.05 }))
    }
    out.push({ d: parts.join(' '), x: x0 + (b + 0.5) * w, light: b % 2 === 0 })
  }
  return out
}

const NEAR_BANDS = grassBands(LINES.near, 314, -10, 1010, 14, 16, [4, 34], 11)
const MID_BANDS = grassBands(LINES.midLeft, 271, -10, 520, 6, 12, [3, 22], 7)

export function GrassWaves({ pal, wind, front }: { pal: Palette; wind: number; front?: { bands: Band[] } }) {
  const c = pal.c
  const cls = grassClass(wind)
  // the wave travels with the wind: each band starts a little later than the one on its left
  const period = wind < 0.18 ? 5 : wind < 0.42 ? 3.6 : wind < 0.72 ? 2.2 : 1.3
  const bands = front?.bands
  const draw = (b: Band, i: number, fill: string, k: string) => (
    <path
      key={k + i}
      d={b.d}
      fill={fill}
      className={cls}
      style={{ animationDelay: `${(-period * 3 + (b.x / 1000) * period * 1.6).toFixed(2)}s` }}
    />
  )
  if (bands) return <g>{bands.map((b, i) => draw(b, i, b.light ? c.grass : mix(c.front2, c.grass, 0.5), 'f'))}</g>
  return (
    <g>
      {MID_BANDS.map((b, i) => draw(b, i, b.light ? mix(c.midA, c.midB, 0.7) : mix(c.midB, '#24401a', 0.15), 'm'))}
      {NEAR_BANDS.map((b, i) => draw(b, i, b.light ? mix(c.near2, c.grass, 0.6) : mix(c.near2, '#1f3a14', 0.18), 'n'))}
    </g>
  )
}

export const FRONT_BANDS = grassBands(LINES.front, 515, -10, 1010, 12, 14, [6, 30], 15)

// ---------- light on the hills ----------

const RIM_LINES = [LINES.farBack, LINES.far, LINES.mid, LINES.field, LINES.midLeft, LINES.near]

function HillLight({ pal, low, strength }: { pal: Palette; low: number; strength: number }) {
  const sid = useSid()
  if (strength < 0.02) return null
  const warm = mix(pal.sky.glow, '#ff9a55', 0.35 * low)
  return (
    <g style={{ opacity: strength }} className="gs-fade">
      <defs>
        <linearGradient id={sid('hillglow')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={warm} stopOpacity={0.55} />
          <stop offset="1" stopColor={warm} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* warm light washing over the far hills, then a bright rim on every hill top facing the low sun */}
      <path d={smooth(LINES.farBack) + 'L1030,440 L-30,440Z'} fill={`url(#${sid('hillglow')})`} />
      {RIM_LINES.map((l, i) => (
        <path key={i} d={smooth(l.map(([x, y]) => [x, y + 2] as P))} fill="none" stroke={mix(warm, '#fff3d0', 0.3)} strokeWidth={i < 2 ? 2.4 : 3.2} strokeLinecap="round" opacity={0.75 - i * 0.07} />
      ))}
    </g>
  )
}

// ---------- shadows ----------

interface ShadowCaster {
  x: number
  y: number
  /** height of the plant (scene units) */
  h: number
  /** half-width of the crown, 0 for a thin plant */
  crown: number
}

/** A long soft shadow from a light at (lx, ly): it swings and stretches as the sun moves and sinks. */
function Shadow({ s, lx, ly, low, opacity, color, id }: { s: ShadowCaster; lx: number; ly: number; low: number; opacity: number; color: string; id: string }) {
  if (opacity < 0.01 || s.h <= 0) return null
  const dx = s.x - lx
  const dy = s.y - ly
  const l = Math.hypot(dx, dy) || 1
  // on the ground the shadow is foreshortened when it points toward us
  const ang = (Math.atan2((dy / l) * 0.32, dx / l) * 180) / Math.PI
  const len = s.h * (0.35 + 1.7 * low)
  const w = Math.max(6, s.crown * 0.9)
  return (
    <g transform={`translate(${f(s.x)},${f(s.y + 2)}) rotate(${f(ang)})`} opacity={opacity} style={{ transition: 'opacity 3s' }}>
      {/* trunk */}
      <path d={`M0,${f(-Math.max(3, s.crown * 0.08))} L${f(len * 0.55)},${f(-Math.max(2, s.crown * 0.05))} L${f(len * 0.55)},${f(Math.max(2, s.crown * 0.05))} L0,${f(Math.max(3, s.crown * 0.08))}Z`} fill={color} opacity={0.75} />
      {/* crown */}
      <ellipse cx={len * (s.crown ? 0.72 : 0.55)} cy={0} rx={Math.max(len * 0.32, w * 0.8)} ry={Math.max(5, w * 0.3)} fill={`url(#${id})`} />
      {/* contact shadow at the foot */}
      <ellipse cx={4} cy={0} rx={Math.max(10, s.crown * 0.35)} ry={4} fill={color} opacity={0.6} />
    </g>
  )
}

// ---------- wet path and puddles ----------

const PUDDLES = [
  { x: 132, rx: 30, ry: 5.5 },
  { x: 402, rx: 38, ry: 6.5 },
  { x: 548, rx: 22, ry: 4.5 },
  { x: 770, rx: 34, ry: 6 },
  { x: 930, rx: 26, ry: 5 },
].map((p) => ({ ...p, y: yAt(LINES.path, p.x) + 3 }))

const RAIN_RINGS = (() => {
  const r = rng(808)
  return [...Array(14)].map((_, i) => {
    const p = PUDDLES[i % PUDDLES.length]
    return { x: p.x + r.range(-p.rx * 0.6, p.rx * 0.6), y: p.y + r.range(-p.ry * 0.3, p.ry * 0.3), d: r.range(0.9, 1.7), dl: -r.range(0, 2) }
  })
})()

function WetGround({ pal, wet, raining, reduced }: { pal: Palette; wet: number; raining: boolean; reduced: boolean }) {
  const sid = useSid()
  const g = useMemo(() => {
    const { top, bot } = pathEdges()
    return {
      path: smooth(top) + 'L' + [...bot].reverse().map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + 'Z',
      sheen: [0.3, 0.55].map((k) => smooth(top.map(([x, y], i) => [x, y + (bot[i][1] - y) * k] as P))),
    }
  }, [])
  if (wet < 0.03) return null
  const { sky } = pal
  const puddle = Math.max(0, Math.min(1, (wet - 0.25) / 0.45))
  const refl = mix(sky.bottom, sky.mid, 0.4)
  return (
    <g className="gs-fade">
      <defs>
        <linearGradient id={sid('puddle')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(sky.top, sky.mid, 0.4)} />
          <stop offset="1" stopColor={mix(sky.bottom, '#ffffff', 0.25)} />
        </linearGradient>
      </defs>
      {/* the wet path reflects a little of the sky */}
      <path d={g.path} fill={refl} opacity={wet * 0.22} />
      {g.sheen.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#ffffff" strokeWidth={i ? 1.2 : 2} strokeDasharray={i ? '20 34 8 40' : '40 60 14 30'} strokeLinecap="round" opacity={wet * 0.3} />
      ))}
      {puddle > 0 &&
        PUDDLES.map((p, i) => (
          <g key={i} opacity={puddle}>
            <ellipse cx={p.x} cy={p.y + 1} rx={p.rx + 2} ry={p.ry + 1.2} fill={mix(pal.c.pathEdge, '#3a3020', 0.35)} opacity={0.5} />
            <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={`url(#${sid('puddle')})`} />
            <path d={`M${f(p.x - p.rx * 0.55)},${f(p.y - p.ry * 0.25)} h${f(p.rx * 0.5)} M${f(p.x + p.rx * 0.1)},${f(p.y + p.ry * 0.2)} h${f(p.rx * 0.3)}`} stroke="#ffffff" strokeWidth={1.1} strokeLinecap="round" opacity={0.75} className={reduced ? undefined : 'gs-shimmer'} />
            <ellipse cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="none" stroke={pal.c.ink} strokeWidth={0.7} opacity={0.35} />
          </g>
        ))}
      {raining && puddle > 0 && !reduced &&
        RAIN_RINGS.map((rr, i) => (
          <ellipse key={i} cx={rr.x} cy={rr.y} rx={5} ry={1.4} fill="none" stroke="#ffffff" strokeWidth={0.8} className="gs-rainring" style={{ animationDuration: `${rr.d.toFixed(2)}s`, animationDelay: `${rr.dl.toFixed(2)}s` }} />
        ))}
    </g>
  )
}

// ---------- fallen leaves and petals ----------

const FALLEN = (() => {
  const r = rng(919)
  return [...Array(46)].map((_, i) => {
    // half gather under the tree, the rest lie scattered on the near hill and the path
    const nearTree = i % 2 === 0
    const x = nearTree ? PLANT_BASE[0] + r.range(-170, 170) : r.range(10, 990)
    const y = nearTree ? PLANT_BASE[1] + r.range(-4, 22) : yAt(LINES.near, x) + r.range(14, 120)
    return { x, y, a: r.range(0, 360), s: r.range(0.7, 1.2), k: r.next(), tone: i % 4 }
  })
})()
const LEAF = 'M0,0 C2.5,-3.2 7,-3.2 9.5,0 C7,2.6 2.5,2.6 0,0Z'

function Fallen({ pal, autumn, winter, petals }: { pal: Palette; autumn: number; winter: number; petals: number }) {
  const shown = Math.max(autumn, winter * 0.5)
  if (shown < 0.05 && petals < 0.05) return null
  const tones = autumn > winter ? ['#d9822f', '#c4512a', '#e9b443', '#a8662e'] : ['#9a7450', '#86684a', '#a88a62', '#7a6046']
  const petal = ['#fbd9e3', '#f6c3d3', '#fff4f6', '#f2b5c8']
  return (
    <g>
      {FALLEN.map((l, i) => {
        const leafOn = l.k < shown * 0.95
        const petalOn = !leafOn && l.k < petals * 0.7 && i % 2 === 0
        if (!leafOn && !petalOn) return null
        return (
          <path
            key={i}
            d={LEAF}
            transform={`translate(${f(l.x)},${f(l.y)}) rotate(${l.a.toFixed(0)}) scale(${(petalOn ? 0.6 : l.s).toFixed(2)})`}
            fill={pal.shade(petalOn ? petal[l.tone] : tones[l.tone])}
            stroke={pal.c.ink}
            strokeWidth={0.6}
            strokeOpacity={0.5}
          />
        )
      })}
    </g>
  )
}

// ---------- snow ----------

function SnowDepth({ pal, snow }: { pal: Palette; snow: number }) {
  if (snow < 0.05) return null
  const blue = pal.shade('#b4c6dc')
  return (
    <g opacity={snow} className="gs-fade">
      {/* blue shade just below each hill top, as if the snow had some depth */}
      {[LINES.mid, LINES.field, LINES.midLeft, LINES.near].map((l, i) => (
        <path key={i} d={smooth(l.map(([x, y]) => [x, y + 9] as P))} fill="none" stroke={blue} strokeWidth={9} strokeLinecap="round" opacity={0.35} />
      ))}
      {/* snow on the old stump */}
      <path d="M94,507 q14,-6 28,0 q-2,4 -14,4 q-12,0 -14,-4Z" fill={pal.shade('#f6f9fc')} stroke={pal.c.ink} strokeWidth={0.8} opacity={0.95} />
    </g>
  )
}

// ---------- the whole ground layer ----------

export interface GroundProps {
  pal: Palette
  /** sun and moon positions (scene units) */
  sun: { x: number; y: number; low: number } | null
  moon: { x: number; y: number } | null
  /** 0..1 how bright the moon is */
  moonLight: number
  /** main plant: height (scene units, already scaled) and crown half-width */
  plant: { h: number; crown: number }
  wind: number
  raining: boolean
  reduced: boolean
  /** petals lying under a blossoming tree (0..1) */
  petals: number
}

export const Ground = memo(function Ground({ pal, sun, moon, moonLight, plant, wind, raining, reduced, petals }: GroundProps) {
  const sid = useSid()
  const { night, weather, season, snow, wet } = pal
  const clearK = { sunny: 1, 'partly-cloudy': 0.65, overcast: 0.12, drought: 0.9 }[weather] * (1 - pal.gloom * 0.6)
  const caster: ShadowCaster = { x: PLANT_BASE[0], y: PLANT_BASE[1], h: plant.h, crown: plant.crown }
  const shadowCol = mix(pal.shade('#24321f'), '#26345a', 0.3 + snow * 0.5)
  const sunShadow = sun ? (1 - night) * clearK * 0.34 : 0
  const moonShadow = moon ? night * moonLight * clearK * 0.18 : 0
  return (
    <g>
      <defs>
        <radialGradient id={sid('shadowg')}>
          <stop offset="0" stopColor={shadowCol} stopOpacity={0.85} />
          <stop offset="0.6" stopColor={shadowCol} stopOpacity={0.55} />
          <stop offset="1" stopColor={shadowCol} stopOpacity={0} />
        </radialGradient>
      </defs>
      {sun && <HillLight pal={pal} low={sun.low} strength={sun.low * (1 - night) * clearK * (1 - snow * 0.3)} />}
      <SnowDepth pal={pal} snow={snow} />
      <WetGround pal={pal} wet={wet} raining={raining} reduced={reduced} />
      <GrassWaves pal={pal} wind={wind} />
      <Fallen pal={pal} autumn={season.autumn} winter={season.winter * (1 - snow)} petals={petals} />
      {sun && <Shadow s={caster} lx={sun.x} ly={sun.y} low={sun.low} opacity={sunShadow} color={shadowCol} id={sid('shadowg')} />}
      {moon && <Shadow s={caster} lx={moon.x} ly={moon.y} low={0.6} opacity={moonShadow} color={shadowCol} id={sid('shadowg')} />}
    </g>
  )
})

// ---------- in front: dew, snow on the fence, glints ----------

const DEW = (() => {
  const r = rng(2024)
  return [...Array(30)].map(() => {
    const x = r.range(10, 990)
    const front = r.next() < 0.6
    return { x, y: front ? yAt(LINES.front, x) + r.range(6, 50) : yAt(LINES.near, x) + r.range(8, 40), s: r.range(0.7, 1.3), d: r.range(2, 4.5), dl: -r.range(0, 4) }
  })
})()

/** The farmer's fence (drawn by the creatures layer at x=912 on the near hill, scale 1.7): where snow settles. */
const FENCE = { x: 912, y: yAt(LINES.near, 912) + 10, k: 1.7 }

export const FrontTraces = memo(function FrontTraces({ pal, reduced }: { pal: Palette; reduced: boolean }) {
  const { hour, night, snow, weather } = pal
  // dew: early on clear mornings, gone as the sun climbs (none on snow or in a drought)
  const dewK = hour > 5 && hour < 10 ? Math.max(0, 1 - Math.abs(hour - 7) / 3) : 0
  const dew = dewK * (1 - snow) * (weather === 'drought' ? 0 : weather === 'overcast' ? 0.4 : 1) * (1 - night * 0.8)
  const glint = snow * (1 - night) * (weather === 'sunny' ? 1 : weather === 'partly-cloudy' ? 0.5 : 0)
  const snowC = pal.shade('#f7fafd')
  const sparkle = (opacity: number, color: string) =>
    DEW.map((d, i) => (
      <path
        key={i}
        d={`M${f(d.x)},${f(d.y - 2.6 * d.s)} L${f(d.x + 0.6)},${f(d.y - 0.6)} L${f(d.x + 2.6 * d.s)},${f(d.y)} L${f(d.x + 0.6)},${f(d.y + 0.6)} L${f(d.x)},${f(d.y + 2.6 * d.s)} L${f(d.x - 0.6)},${f(d.y + 0.6)} L${f(d.x - 2.6 * d.s)},${f(d.y)} L${f(d.x - 0.6)},${f(d.y - 0.6)}Z`}
        fill={color}
        opacity={opacity}
        className={reduced ? undefined : 'gs-twinkle'}
        style={reduced ? undefined : { animationDuration: `${d.d.toFixed(1)}s`, animationDelay: `${d.dl.toFixed(1)}s` }}
      />
    ))
  return (
    <g>
      {dew > 0.03 && <g opacity={dew} className="gs-fade">{sparkle(0.9, '#ffffff')}</g>}
      {glint > 0.05 && <g opacity={glint} className="gs-fade">{sparkle(0.8, '#fffdf2')}</g>}
      {snow > 0.05 && (
        <g transform={`translate(${FENCE.x},${f(FENCE.y)}) scale(${FENCE.k})`} opacity={Math.min(1, snow * 1.3)} className="gs-fade">
          {/* snow lying along the rails and capping the posts */}
          <path d="M-41,-23.6 L41,-27.6 M-41,-11.6 L41,-15.6" stroke={snowC} strokeWidth={2.2} strokeLinecap="round" />
          {[-36, 36].map((x) => (
            <path key={x} d={`M${x - 3.4},${x < 0 ? -30.6 : -31.6} q3.4,-3 6.8,0Z`} fill={snowC} stroke={pal.c.ink} strokeWidth={0.4} strokeOpacity={0.5} />
          ))}
        </g>
      )}
    </g>
  )
})
