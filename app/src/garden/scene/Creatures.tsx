import { useSid } from './ids'
// Wildlife and little atmospheric effects. All motion is CSS transform/opacity animation (see garden.css).
import { memo, useMemo } from 'react'
import { brush, mix, rng, type P } from './ink'
import { LINES, yAt } from './Landscape'
import type { Palette } from './palette'

type Shade = (c: string) => string

// ---------- walking animals (facing right, feet at y=0) ----------

function Leg({ d, cls, delay, color }: { d: string; cls: string; delay: number; color: string }) {
  return <path d={d} className={cls} style={{ animationDelay: `${delay}s` }} stroke={color} strokeWidth={3.2} strokeLinecap="round" fill="none" />
}

export function Fox({ s, ink }: { s: Shade; ink: string }) {
  const fur = s('#e2793a')
  const cream = s('#fbf1de')
  const dark = s('#3d2a20')
  return (
    <g className="gs-bob">
      <Leg d="M-20,-12 L-22,0" cls="gs-leg" delay={0} color={dark} />
      <Leg d="M14,-12 L16,0" cls="gs-leg" delay={-0.25} color={dark} />
      <path d="M-26,-20 C-38,-28 -54,-24 -60,-14 C-54,-10 -40,-11 -28,-15Z" fill={fur} stroke={ink} strokeWidth={1.5} className="gs-tail" />
      <path d="M-52,-20 C-57,-18 -60,-15 -60,-14 C-56,-11 -52,-12 -49,-14Z" fill={cream} />
      <path d="M-28,-22 C-20,-32 10,-32 20,-26 C26,-22 26,-14 20,-11 C8,-8 -18,-8 -26,-12 C-32,-15 -32,-19 -28,-22Z" fill={fur} stroke={ink} strokeWidth={1.6} />
      <path d="M-18,-11 C-6,-9 8,-9 16,-12" stroke={cream} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Leg d="M-25,-12 L-27,0" cls="gs-leg" delay={-0.25} color={dark} />
      <Leg d="M9,-12 L8,0" cls="gs-leg" delay={0} color={dark} />
      <path d="M18,-26 C22,-34 30,-36 36,-33 L45,-28 C46,-27 45,-25 43,-25 L36,-23 C32,-20 24,-19 19,-21Z" fill={fur} stroke={ink} strokeWidth={1.5} />
      <path d="M30,-24 L43,-25 L37,-22Z" fill={cream} />
      <path d="M22,-31 L24,-43 L30,-34Z M28,-34 L32,-44 L35,-34Z" fill={fur} stroke={ink} strokeWidth={1.3} strokeLinejoin="round" />
      <circle cx={33} cy={-30} r={1.4} fill={ink} />
      <circle cx={45} cy={-27} r={1.4} fill={ink} />
    </g>
  )
}

export function Rabbit({ s, ink }: { s: Shade; ink: string }) {
  const fur = s('#a88e74')
  const light = s('#d9c7b0')
  return (
    <g className="gs-hop">
      <g transform="scale(1.1)">
        <path d="M10,-25 C6,-36 8,-44 12,-44 C15,-42 14,-33 13,-26Z" fill={fur} stroke={ink} strokeWidth={1.3} />
        <path d="M14,-25 C14,-37 18,-43 21,-41 C22,-37 18,-30 16,-24Z" fill={fur} stroke={ink} strokeWidth={1.3} />
        <path d="M-14,-6 C-18,-16 -10,-24 2,-23 C10,-22 14,-16 13,-9 C12,-4 4,-1 -6,-1 C-12,-1 -14,-3 -14,-6Z" fill={fur} stroke={ink} strokeWidth={1.5} />
        <circle cx={-15} cy={-11} r={4.5} fill="#fbf8f2" stroke={ink} strokeWidth={1} />
        <path d="M8,-26 C14,-30 22,-26 22,-19 C22,-14 17,-12 12,-13 C8,-15 6,-22 8,-26Z" fill={fur} stroke={ink} strokeWidth={1.4} />
        <path d="M-10,-3 L6,-1 C7,1 4,1 -10,1Z" fill={light} stroke={ink} strokeWidth={1} />
        <circle cx={17} cy={-21} r={1.4} fill={ink} />
        <circle cx={22} cy={-17} r={1} fill={s('#d88a8a')} />
      </g>
    </g>
  )
}

export function Squirrel({ s, ink }: { s: Shade; ink: string }) {
  const fur = s('#b8653a')
  const light = s('#f0d9b8')
  return (
    <g className="gs-hop gs-hop-fast">
      <path d="M-10,-6 C-26,-10 -28,-32 -17,-38 C-8,-42 -1,-36 -6,-29 C-10,-24 -15,-18 -12,-10Z" fill={fur} stroke={ink} strokeWidth={1.4} className="gs-tail" />
      <path d="M-18,-34 C-12,-37 -7,-34 -8,-30" stroke={light} strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M-10,-4 C-14,-14 -6,-22 4,-20 C12,-18 14,-10 10,-4 C6,0 -6,0 -10,-4Z" fill={fur} stroke={ink} strokeWidth={1.4} />
      <path d="M4,-17 C9,-14 10,-8 7,-4" stroke={light} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={10} cy={-21} r={6.5} fill={fur} stroke={ink} strokeWidth={1.3} />
      <path d="M7,-26 L8,-33 L12,-26Z" fill={fur} stroke={ink} strokeWidth={1} />
      <circle cx={12} cy={-22} r={1.2} fill={ink} />
      <path d="M-6,-1 L6,-1" stroke={s('#5a3420')} strokeWidth={3} strokeLinecap="round" />
    </g>
  )
}

export function Hedgehog({ s, ink }: { s: Shade; ink: string }) {
  const spines = s('#7a5a3e')
  const face = s('#e9d3b0')
  return (
    <g className="gs-bob gs-bob-slow">
      <Leg d="M-8,-3 L-9,1" cls="gs-leg gs-leg-fast" delay={0} color={s('#4a3322')} />
      <Leg d="M8,-3 L9,1" cls="gs-leg gs-leg-fast" delay={-0.15} color={s('#4a3322')} />
      <path d="M-16,-1 C-19,-11 -10,-21 2,-21 C12,-21 18,-12 18,-4 L16,-1Z" fill={spines} stroke={ink} strokeWidth={1.4} />
      <path d="M-15,-6 L-20,-9 L-13,-11 L-17,-16 L-10,-15 L-10,-22 L-4,-18 L0,-25 L3,-18 L9,-22 L8,-15 L14,-17 L12,-11" stroke={ink} strokeWidth={1.1} fill="none" strokeLinejoin="round" />
      <path d="M-8,-10 l-3,-4 M-2,-12 l-1,-5 M4,-12 l2,-5 M-4,-6 l-3,-3" stroke={mix(spines, '#000', 0.3)} strokeWidth={1} />
      <path d="M12,-12 C16,-12 23,-7 26,-4 C24,-1 17,-1 13,-2 C11,-5 11,-9 12,-12Z" fill={face} stroke={ink} strokeWidth={1.2} />
      <circle cx={26} cy={-4} r={1.6} fill={ink} />
      <circle cx={17} cy={-8} r={1.1} fill={ink} />
    </g>
  )
}

export function Deer({ s, ink }: { s: Shade; ink: string }) {
  const fur = s('#a8784e')
  const light = s('#e8d2b0')
  const dark = s('#5a3e2a')
  return (
    <g className="gs-bob gs-bob-slow">
      <Leg d="M-22,-42 L-25,0" cls="gs-leg gs-leg-slow" delay={0} color={dark} />
      <Leg d="M16,-40 L18,0" cls="gs-leg gs-leg-slow" delay={-0.45} color={dark} />
      <path d="M-30,-52 C-22,-61 14,-61 24,-55 C30,-50 30,-42 24,-40 C10,-37 -20,-37 -28,-41 C-33,-44 -34,-49 -30,-52Z" fill={fur} stroke={ink} strokeWidth={1.6} />
      <path d="M-30,-50 L-37,-47 L-31,-45Z" fill={light} stroke={ink} strokeWidth={1} />
      <Leg d="M-28,-42 L-27,0" cls="gs-leg gs-leg-slow" delay={-0.45} color={dark} />
      <Leg d="M10,-40 L9,0" cls="gs-leg gs-leg-slow" delay={0} color={dark} />
      <g className="gs-graze">
        <path d="M18,-54 C22,-64 27,-74 31,-80 C35,-85 42,-85 46,-81 L55,-74 C57,-72 55,-70 52,-70 L44,-70 C40,-66 34,-56 30,-45Z" fill={fur} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M36,-82 L28,-91 L40,-86Z" fill={fur} stroke={ink} strokeWidth={1.2} />
        <path d="M38,-85 C36,-97 31,-104 27,-111 M33,-97 L25,-100 M31,-104 L34,-112 M42,-85 C45,-97 49,-103 53,-109 M47,-97 L54,-99 M50,-104 L48,-111" stroke={dark} strokeWidth={2} fill="none" strokeLinecap="round" />
        <circle cx={44} cy={-78} r={1.5} fill={ink} />
        <circle cx={55} cy={-73} r={1.3} fill={ink} />
        <path d="M25,-60 C28,-66 31,-72 34,-76" stroke={light} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
      </g>
      <path d="M-14,-50 l3,-2 M-4,-52 l3,-2 M6,-51 l3,-2" stroke={light} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    </g>
  )
}

export type AnimalKind = 'fox' | 'rabbit' | 'deer' | 'squirrel' | 'hedgehog'
export const ANIMALS: AnimalKind[] = ['fox', 'rabbit', 'deer', 'squirrel', 'hedgehog', 'rabbit', 'fox']

const SPEC: Record<AnimalKind, { line: 'path' | 'mid'; scale: number; dur: number }> = {
  fox: { line: 'path', scale: 0.95, dur: 13 },
  rabbit: { line: 'path', scale: 0.95, dur: 15 },
  deer: { line: 'mid', scale: 0.55, dur: 34 },
  squirrel: { line: 'path', scale: 1, dur: 10 },
  hedgehog: { line: 'path', scale: 0.9, dur: 30 },
}

/** CSS keyframes that move a walker along a terrain line, generated once. */
export const PATH_CSS = (['path', 'mid'] as const)
  .map((name) => {
    const line = LINES[name]
    const steps = 20
    const frames = Array.from({ length: steps + 1 }, (_, i) => {
      const x = -90 + (1180 * i) / steps
      const y = yAt(line, x) + (name === 'path' ? 3 : 6)
      return `${((i / steps) * 100).toFixed(1)}%{transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)}`
    }).join('')
    return `@keyframes gs-along-${name}{${frames}}`
  })
  .join('\n')

export function Walker({ kind, reverse, pal, onDone }: { kind: AnimalKind; reverse: boolean; pal: Palette; onDone: () => void }) {
  const spec = SPEC[kind]
  const A = { fox: Fox, rabbit: Rabbit, deer: Deer, squirrel: Squirrel, hedgehog: Hedgehog }[kind]
  return (
    <g
      className="gs-walker"
      style={{ animation: `gs-along-${spec.line} ${spec.dur}s linear 1 both${reverse ? ' reverse' : ''}` }}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onDone()
      }}
    >
      <ellipse cx={0} cy={1} rx={28 * spec.scale} ry={4 * spec.scale} fill="#000" opacity={0.12} />
      <g transform={`scale(${reverse ? -spec.scale : spec.scale},${spec.scale})`}>
        <A s={pal.shade} ink={pal.c.ink} />
      </g>
    </g>
  )
}

// ---------- sky wildlife ----------

export const Flocks = memo(function Flocks({ ink }: { ink: string }) {
  const flocks = useMemo(() => {
    const r = rng(21)
    return [0, 1].map((f) => ({
      y: r.range(110, 240),
      dur: r.range(30, 42),
      delay: -f * 19 - r.range(0, 6),
      birds: [...Array(f === 0 ? 7 : 5)].map((_, i) => ({ x: -i * r.range(16, 26), y: (i % 2 ? 1 : -1) * i * r.range(5, 9), s: r.range(0.7, 1.1), fd: r.range(0.35, 0.55) })),
    }))
  }, [])
  return (
    <g>
      {flocks.map((f, i) => (
        <g key={i} transform={`translate(0,${f.y.toFixed(0)})`}>
          <g className="gs-flock" style={{ animationDuration: `${f.dur.toFixed(1)}s`, animationDelay: `${f.delay.toFixed(1)}s` }}>
            {f.birds.map((b, j) => (
              <g key={j} transform={`translate(${b.x.toFixed(1)},${b.y.toFixed(1)}) scale(${b.s.toFixed(2)})`}>
                <path d="M-9,1 Q-4,-6 0,0 Q4,-6 9,1" fill="none" stroke={ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="gs-flap" style={{ animationDuration: `${b.fd.toFixed(2)}s` }} />
              </g>
            ))}
          </g>
        </g>
      ))}
    </g>
  )
})

// ---------- small creatures near the plant ----------

export function Butterfly({ x, y, color, path, dur, delay, ink }: { x: number; y: number; color: string; path: 1 | 2 | 3; dur: number; delay: number; ink: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g className={`gs-flutter-${path}`} style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
        <g transform="scale(0.9)">
          <g className="gs-wing-l">
            <path d="M0,0 C-4,-11 -15,-13 -15,-4 C-15,2 -6,2 0,0Z M0,0 C-6,2 -11,9 -6,11 C-2,11 0,5 0,0Z" fill={color} stroke={ink} strokeWidth={1.1} />
          </g>
          <g className="gs-wing-r">
            <path d="M0,0 C4,-11 15,-13 15,-4 C15,2 6,2 0,0Z M0,0 C6,2 11,9 6,11 C2,11 0,5 0,0Z" fill={color} stroke={ink} strokeWidth={1.1} />
          </g>
          <path d="M0,-6 L0,7" stroke={ink} strokeWidth={2} strokeLinecap="round" />
          <path d="M0,-6 q-2,-5 -4,-6 M0,-6 q2,-5 4,-6" stroke={ink} strokeWidth={0.8} fill="none" />
        </g>
      </g>
    </g>
  )
}

export function Bee({ x, y, dur, delay, ink }: { x: number; y: number; dur: number; delay: number; ink: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g className="gs-buzz" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
        <ellipse cx={-1} cy={-6} rx={4} ry={5} fill="#eef6ff" opacity={0.85} stroke={ink} strokeWidth={0.6} className="gs-bee-wing" />
        <ellipse cx={3} cy={-6} rx={3.4} ry={4.2} fill="#eef6ff" opacity={0.85} stroke={ink} strokeWidth={0.6} className="gs-bee-wing" />
        <ellipse cx={0} cy={0} rx={6.5} ry={4.5} fill="#f5c842" stroke={ink} strokeWidth={1.1} />
        <path d="M-2,-4 L-2,4 M2,-4.2 L2,4.2" stroke={ink} strokeWidth={1.6} />
        <circle cx={6.2} cy={-0.5} r={0.9} fill={ink} />
      </g>
    </g>
  )
}

export function Owl({ x, y, pal }: { x: number; y: number; pal: Palette }) {
  const ink = pal.c.ink
  const body = mix('#8a6a50', '#3a3a5a', 0.35)
  const belly = mix('#d8c2a0', '#5a5a7a', 0.3)
  return (
    <g transform={`translate(${x},${y})`} className="gs-owl">
      <path d="M-13,0 C-16,-12 -13,-27 0,-29 C13,-27 16,-12 13,0Z" fill={body} stroke={ink} strokeWidth={1.5} />
      <path d="M-8,-2 C-10,-10 -8,-17 0,-18 C8,-17 10,-10 8,-2Z" fill={belly} />
      <path d="M-5,-12 l2,2 l2,-2 M1,-12 l2,2 l2,-2 M-3,-7 l2,2 l2,-2 M2,-7 l2,2 l2,-2" stroke={mix(body, '#000', 0.3)} strokeWidth={0.9} fill="none" />
      <g className="gs-owlhead">
        <path d="M-12,-24 L-13,-35 L-6,-28 M12,-24 L13,-35 L6,-28" fill={body} stroke={ink} strokeWidth={1.3} strokeLinejoin="round" />
        <ellipse cx={0} cy={-26} rx={12} ry={9} fill={body} stroke={ink} strokeWidth={1.4} />
        <circle cx={-5} cy={-26} r={4.6} fill="#ffd85a" stroke={ink} strokeWidth={1} />
        <circle cx={5} cy={-26} r={4.6} fill="#ffd85a" stroke={ink} strokeWidth={1} />
        <circle cx={-5} cy={-26} r={2.2} fill="#1a1a1a" />
        <circle cx={5} cy={-26} r={2.2} fill="#1a1a1a" />
        <circle cx={-4.2} cy={-27} r={0.8} fill="#fff" />
        <circle cx={5.8} cy={-27} r={0.8} fill="#fff" />
        <g className="gs-blink">
          <ellipse cx={-5} cy={-26} rx={5} ry={5} fill={body} />
          <ellipse cx={5} cy={-26} rx={5} ry={5} fill={body} />
        </g>
        <path d="M-1.5,-23 L0,-19 L1.5,-23Z" fill="#e0a040" stroke={ink} strokeWidth={0.7} />
      </g>
      <path d="M-5,0 l-1,3 M-3,0 l0,3 M3,0 l0,3 M5,0 l1,3" stroke="#e0a040" strokeWidth={1.2} />
    </g>
  )
}

export const Fireflies = memo(function Fireflies() {
  const sid = useSid()
  const flies = useMemo(() => {
    const r = rng(31)
    return [...Array(16)].map(() => ({ x: r.range(30, 970), y: r.range(440, 650), d: r.range(5, 10), dl: -r.range(0, 10), p: r.pick([1, 2, 3] as const) }))
  }, [])
  return (
    <g>
      {flies.map((f, i) => (
        <g key={i} transform={`translate(${f.x.toFixed(0)},${f.y.toFixed(0)})`}>
          <g className={`gs-firefly gs-ff-${f.p}`} style={{ animationDuration: `${f.d.toFixed(1)}s`, animationDelay: `${f.dl.toFixed(1)}s` }}>
            <circle r={9} fill={`url(#${sid('ffglow')})`} />
            <circle r={2.1} fill="#fffbb0" />
          </g>
        </g>
      ))}
      <defs>
        <radialGradient id={sid('ffglow')}>
          <stop offset="0" stopColor="#f6ff9a" stopOpacity={0.8} />
          <stop offset="1" stopColor="#f6ff9a" stopOpacity={0} />
        </radialGradient>
      </defs>
    </g>
  )
})

// ---------- wind, leaves, mist, dust ----------

export const Swirls = memo(function Swirls({ count, ink }: { count: number; ink: string }) {
  const items = useMemo(() => {
    const r = rng(41)
    return [...Array(8)].map(() => {
      const len = r.range(70, 140)
      const pts: P[] = [[0, 0], [len * 0.35, r.range(-6, 6)], [len * 0.7, r.range(-4, 4)], [len, 0]]
      const curl = r.next() < 0.6
      const tail = curl ? ` M${len},0 c10,-1 14,-10 7,-14 c-6,-3 -11,3 -6,7` : ''
      return {
        x: r.range(60, 860),
        y: r.range(90, 520),
        d: brush(pts, 0.6, 1.8, r, { taperIn: 0.6, taperOut: 0.1, samples: 14 }),
        tail,
        dur: r.range(7, 11),
        delay: -r.range(0, 11),
      }
    })
  }, [])
  return (
    <g>
      {items.slice(0, count).map((s, i) => (
        <g key={i} transform={`translate(${s.x.toFixed(0)},${s.y.toFixed(0)})`}>
          <g className="gs-swirl" style={{ animationDuration: `${s.dur.toFixed(1)}s`, animationDelay: `${s.delay.toFixed(1)}s` }}>
            <path d={s.d} fill={ink} opacity={0.7} />
            {s.tail && <path d={s.tail} fill="none" stroke={ink} strokeWidth={1.3} opacity={0.7} strokeLinecap="round" />}
          </g>
        </g>
      ))}
    </g>
  )
})

export function BlowingLeaves({ x, y, spread, colors, count, ink }: { x: number; y: number; spread: number; colors: string[]; count: number; ink: string }) {
  const items = useMemo(() => {
    const r = rng(51)
    return [...Array(10)].map((_, i) => ({ dx: r.range(-spread, spread), dy: r.range(-spread * 0.4, spread * 0.3), dur: r.range(6, 10), delay: -r.range(0, 10), p: (i % 3) + 1, c: i }))
  }, [spread])
  return (
    <g transform={`translate(${x},${y})`}>
      {items.slice(0, count).map((l, i) => (
        <g key={i} transform={`translate(${l.dx.toFixed(0)},${l.dy.toFixed(0)})`}>
          <g className={`gs-leaffall gs-lf-${l.p}`} style={{ animationDuration: `${l.dur.toFixed(1)}s`, animationDelay: `${l.delay.toFixed(1)}s` }}>
            <path d="M0,0 C3,-4 8,-4 11,0 C8,3 3,3 0,0Z" fill={colors[l.c % colors.length]} stroke={ink} strokeWidth={0.8} />
          </g>
        </g>
      ))}
    </g>
  )
}

export function Mist({ color, opacity }: { color: string; opacity: number }) {
  const sid = useSid()
  return (
    <g style={{ opacity }} className="gs-fade">
      <defs>
        <radialGradient id={sid('mistg')}>
          <stop offset="0" stopColor={color} stopOpacity={0.7} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g className="gs-mist">
        <ellipse cx={250} cy={395} rx={360} ry={26} fill={`url(#${sid('mistg')})`} />
        <ellipse cx={780} cy={420} rx={320} ry={22} fill={`url(#${sid('mistg')})`} />
      </g>
      <g className="gs-mist gs-mist-2">
        <ellipse cx={500} cy={500} rx={420} ry={20} fill={`url(#${sid('mistg')})`} />
      </g>
    </g>
  )
}

export const Dust = memo(function Dust() {
  const motes = useMemo(() => {
    const r = rng(61)
    return [...Array(18)].map(() => ({ x: r.range(0, 1000), y: r.range(380, 680), s: r.range(1, 2.4), d: r.range(8, 16), dl: -r.range(0, 16) }))
  }, [])
  return (
    <g>
      {motes.map((m, i) => (
        <g key={i} transform={`translate(${m.x.toFixed(0)},${m.y.toFixed(0)})`}>
          <circle r={m.s} fill="#f3dfb0" className="gs-dust" style={{ animationDuration: `${m.d.toFixed(1)}s`, animationDelay: `${m.dl.toFixed(1)}s` }} />
        </g>
      ))}
    </g>
  )
})

export function PondShimmer() {
  return (
    <g>
      <path d="M222,549 l22,0 M268,555 l26,0 M248,560 l14,0" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" className="gs-shimmer" />
      <path d="M236,553 l16,0 M282,550 l12,0" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" className="gs-shimmer gs-shimmer-2" />
    </g>
  )
}

/** Short watering animation: droplets fall on the plant, splash, and a warm glow with sparkles. */
export function Watering({ height }: { height: number }) {
  const sid = useSid()
  const drops = useMemo(() => {
    const r = rng(71)
    return [...Array(14)].map(() => ({ x: r.range(-60, 60) * (0.4 + height / 400), y: -height - r.range(20, 80), dl: r.range(0, 0.9) }))
  }, [height])
  return (
    <g className="gs-watering">
      <ellipse cx={0} cy={-height * 0.45} rx={height * 0.55 + 50} ry={height * 0.55 + 40} fill={`url(#${sid('waterglow')})`} className="gs-wglow" />
      {drops.map((d, i) => (
        <g key={i} transform={`translate(${d.x.toFixed(0)},${d.y.toFixed(0)})`}>
          <path d="M0,-7 C3,-2 4,1 4,3 A4,4 0 0 1 -4,3 C-4,1 -3,-2 0,-7Z" fill="#9fd8f0" stroke="#2c5a70" strokeWidth={0.9} className="gs-drop" style={{ animationDelay: `${d.dl.toFixed(2)}s`, ['--fall' as string]: `${(-d.y).toFixed(0)}px` }} />
        </g>
      ))}
      <ellipse cx={0} cy={2} rx={30} ry={6} fill="none" stroke="#9fd8f0" strokeWidth={2} className="gs-splash" />
      {[...Array(8)].map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        const rr = height * 0.4 + 40
        return (
          <path key={i} transform={`translate(${(Math.cos(a) * rr).toFixed(0)},${(-height * 0.45 + Math.sin(a) * rr * 0.8).toFixed(0)})`} d="M0,-6 l1.5,4.5 l4.5,1.5 l-4.5,1.5 l-1.5,4.5 l-1.5,-4.5 l-4.5,-1.5 l4.5,-1.5Z" fill="#fff4b0" className="gs-spark" style={{ animationDelay: `${(0.9 + i * 0.08).toFixed(2)}s` }} />
        )
      })}
      <defs>
        <radialGradient id={sid('waterglow')}>
          <stop offset="0" stopColor="#fff6c8" stopOpacity={0.7} />
          <stop offset="1" stopColor="#fff6c8" stopOpacity={0} />
        </radialGradient>
      </defs>
    </g>
  )
}
