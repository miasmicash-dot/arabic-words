// Stories for the small life in front of the plant: insects, little animals, garden birds, and the night's owl,
// moth and fireflies. Two or three of these at most are about at once (see director.ts).
import { useMemo, useState } from 'react'
import { rng, type Rng } from './ink'
import { Actor, EASE, band, story, type Beat, type P, type TapAt } from './actor'
import { Bee, Butterfly, Owl } from './Creatures'
import {
  Ant, Beetle, Bumblebee, Caterpillar, Chipmunk, Firefly, Fly, Grasshopper, Hummingbird, Ladybird, Leaf, Lizard, Mole, Molehill,
  Moth, Mouse, Snail, Tortoise, Songbird, Spider, Toad, Web, Woodpecker, Worm, FENCE,
} from './Critters'
import { chance, dur, flower, int, offEdge, padTo, perch, ring, simple, type Ctx, type Species, type VisitProps } from './kit'

const ground = band(0.5)
const spot = (c: Ctx, r: Rng, lo = 0.15, hi = 0.85): number => c.view.x0 + (c.view.x1 - c.view.x0) * r.range(lo, hi)
const flight = (s: ReturnType<typeof story>, to: P, n: number, r: Rng, wob: number, ms: [number, number], pose = 'fly') => {
  const [x0, y0] = [s.x, s.y]
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const last = i === n
    s.xy(x0 + (to[0] - x0) * t + (last ? 0 : r.range(-wob, wob)), y0 + (to[1] - y0) * t + (last ? 0 : r.range(-wob, wob)), r.range(ms[0], ms[1]), pose, { ease: last ? EASE.stop : EASE.move })
  }
  return s
}
const away = (c: Ctx, r: Rng, dir: number): P => [offEdge(c, -dir, 60), r.range(300, 460)]

// ---------- ladybird: climbs a grass blade and flies off ----------
const ladybird = simple({
  k: 2.6,
  hit: [-6, -8, 12, 10],
  head: [4, -8],
  draw: (a) => <Ladybird s={a.s} ink={a.ink} />,
  under: (u, c) => {
    const [bx, by] = u.beats[2]?.to ?? u.start
    return <path d={`M${bx},${by} q-3,-26 4,-${BLADE}`} stroke={c.pal.c.grass} strokeWidth={3.2} fill="none" strokeLinecap="round" className="st-fadein" />
  },
  story: (r, c) => {
    const dir = r.sign()
    const bx = spot(c, r, 0.55, 0.9)
    const gy = ground(bx)
    const s = story([bx - dir * 40, gy], undefined, 'crawl')
    s.beats[0].alpha = 0
    s.xy(bx - dir * 40, gy, 600, 'crawl', { alpha: 1 })
    s.xy(bx - 1, gy, r.range(3200, 4200), 'crawl')
    s.wait(400, 'crawl', { rot: -80 * dir })
    s.xy(bx + 3, gy - BLADE + 2, r.range(3800, 5000), 'crawl')
    s.wait(500, 'idle', { rot: 0 }).wait(r.range(900, 1600), 'idle')
    s.wait(600, 'open')
    return s.xy(bx + dir * r.range(140, 240), gy - r.range(220, 300), 1900, 'fly', { ease: EASE.start, alpha: 0 }).end()
  },
  tap: (at) => [
    { ms: 300, pose: 'legs', rot: at.rot + 180, ease: EASE.dart },
    { ms: 1800, pose: 'legs' },
    { ms: 500, pose: 'crawl', rot: at.rot },
  ],
})
const BLADE = 46
// ---------- ants: march to a crumb and carry it home ----------
function Ants({ seed, ctx, onDone }: VisitProps) {
  const plan = useMemo(() => {
    const r = rng(seed)
    const hx = spot(ctx, r, 0.2, 0.55)
    const hy = band(0.35)(hx)
    const dir = r.sign()
    const cx = hx + dir * r.range(70, 120)
    const n = int(r, 4, 6)
    const ants = Array.from({ length: n }, (_, i) => {
      const s = story([hx, hy], band(0.35), 'crawl')
      s.beats[0].alpha = 0
      s.wait(i * r.range(500, 800) + 50, 'crawl', { alpha: 1 })
      const mid = hx + (cx - hx) * r.range(0.4, 0.6)
      s.go(mid, r.range(14, 20), 'crawl').wait(r.range(200, 700), 'idle').go(cx - dir * (i === 0 ? 0 : r.range(4, 12)), r.range(14, 20), 'crawl')
      s.wait(r.range(1400, 2200), 'idle')
      if (i === 0) s.wait(20, 'haul', { call: 'pick' })
      s.go(hx, 16, i === 0 ? 'haul' : 'crawl')
      return s.wait(400, 'crawl', { alpha: 0 }).end()
    })
    return { hx, hy, cx, ants, total: Math.max(...ants.map(dur)) }
  }, [seed, ctx])
  const [cue, setCue] = useState(0)
  const [, setLeft] = useState(plan.ants.length)
  const [picked, setPicked] = useState(false)
  const ink = ctx.pal.c.ink
  const scatter = (at: TapAt, r: Rng): Beat[] => {
    const out: Beat[] = []
    for (let i = 0; i < 3; i++) out.push({ to: [at.pos[0] + r.range(-28, 28), at.pos[1] + r.range(-4, 4)], ms: 260, pose: 'crawl', ease: EASE.dart })
    out.push({ ms: 600, pose: 'idle' }, { to: [plan.hx, plan.hy], ms: 3500, pose: 'crawl' }, { ms: 300, alpha: 0, end: true })
    return out
  }
  return (
    <g>
      <g transform={`translate(${plan.hx},${plan.hy}) scale(2.6)`} className="st-fadein">
        <ellipse cx={0} cy={0} rx={8} ry={2.6} fill={ctx.pal.shade('#a07850')} stroke={ink} strokeWidth={0.6} />
        <path d="M-4,-1 q4,-4 8,0" stroke={ctx.pal.shade('#6e5034')} strokeWidth={1} fill="none" />
      </g>
      {!picked && <g transform={`translate(${plan.cx},${band(0.35)(plan.cx)}) scale(2.6)`} className="st-fadein"><circle cx={0} cy={-1.2} r={1.4} fill="#f2e2b8" stroke={ink} strokeWidth={0.3} /></g>}
      {plan.ants.map((b, i) => {
        const tr = rng(seed + i)
        return (
          <Actor key={i} beats={b} k={2.6} hit={[-5, -5, 10, 6]} still={ctx.still} cue={cue} onCall={(n) => n === 'pick' && setPicked(true)} onTap={() => setCue(Date.now())} tap={(at) => scatter(at, tr)}
            onDone={() => setLeft((l) => { if (l - 1 <= 0) setTimeout(onDone, 0); return l - 1 })}
            art={(l) => <Ant ink={ink} crumb={l.pose === 'haul'} />} />
        )
      })}
    </g>
  )
}

// ---------- earthworm ----------
const earthworm = simple({
  k: 2.7,
  hit: [-6, -10, 12, 12],
  head: [3, -10],
  draw: (a) => <Worm s={a.s} ink={a.ink} />,
  story: (r, c) => {
    const x = spot(c, r, 0.1, 0.6)
    const y = band(0.85)(x)
    const s = story([x, y], undefined, 'sway')
    s.beats[0].sy = 0
    s.wait(1400, 'sway', { sy: 1, fx: 'dirt', ease: EASE.stop }).wait(r.range(2500, 3500), 'sway').wait(1200, 'idle', { rot: r.sign() * 18 }).wait(1600, 'sway', { rot: 0 })
    s.wait(900, 'idle', { sy: 0, ease: EASE.start })
    if (chance(r, 0.6)) {
      const x2 = x + r.sign() * r.range(30, 60)
      s.xy(x2, band(0.85)(x2), 1800, 'idle').wait(1200, 'sway', { sy: 1, fx: 'dirt' }).wait(2400, 'sway').wait(900, 'idle', { sy: 0 })
    }
    return s.wait(300, 'idle', { alpha: 0 }).end()
  },
  tap: () => [
    { ms: 160, pose: 'idle', sy: 0, ease: EASE.dart, fx: 'dirt' },
    { ms: 1400, pose: 'idle' },
    { ms: 600, pose: 'sway', sy: 1, fx: 'alarm' },
  ],
})

// ---------- caterpillar: inches to a leaf and munches it ----------
const caterpillar = simple({
  k: 2.7,
  hit: [-10, -8, 20, 10],
  head: [7, -6],
  vars: { ['--eat' as string]: '20deg' },
  draw: (a) => <Caterpillar s={a.s} ink={a.ink} pose={a.pose} />,
  under: (u, c) => {
    const [lx, ly] = u.beats[2]?.to ?? u.start
    return <g transform={`translate(${lx + 26},${ly}) scale(2.7)`}><Leaf s={c.pal.shade} ink={c.pal.c.ink} bitten={Math.min(3, Math.max(0, Math.floor((u.i - 2) / 2)))} /></g>
  },
  story: (r, c) => {
    const x = spot(c, r, 0.55, 0.9)
    const y = band(0.25)(x)
    const s = story([x, y], undefined, 'inch')
    s.beats[0].alpha = 0
    s.beats[0].face = 1
    s.wait(1500, 'inch', { alpha: 1 })
    s.xy(x + LEAF_DX - 26, y, r.range(6000, 8000), 'inch', { ease: EASE.lin })
    for (let i = 0; i < 3; i++) s.wait(r.range(1800, 2600), 'eat').wait(r.range(500, 900), i === 1 ? 'alert' : 'idle')
    return s.xy(x + LEAF_DX + 30, y, 7000, 'inch', { ease: EASE.lin, alpha: 0 }).end()
  },
  tap: () => [
    { ms: 300, pose: 'curl', ease: EASE.dart },
    { ms: 2200, pose: 'curl' },
    { ms: 700, pose: 'alert' },
  ],
})
const LEAF_DX = 60

// ---------- beetle: trundles, then clumsily flies off ----------
const beetle = simple({
  k: 2.7,
  hit: [-6, -7, 14, 8],
  head: [5, -6],
  draw: (a) => <Beetle s={a.s} ink={a.ink} />,
  story: (r, c) => {
    const dir = r.sign()
    const x0 = offEdge(c, dir, 20)
    const s = story([x0, band(0.75)(x0)], band(0.75), 'crawl')
    for (let i = 0; i < int(r, 2, 3); i++) s.go(s.x + dir * r.range(60, 120), r.range(16, 26), 'crawl').wait(r.range(700, 1500), r.pick(['sniff', 'idle']))
    s.wait(800, 'open')
    s.xy(s.x + dir * 20, s.y - 40, 700, 'fly', { rot: 15, ease: EASE.start }).xy(s.x + dir * 40, s.y - 50, 700, 'fly', { rot: -10 })
    return s.xy(s.x + dir * 200, s.y - 220, 1600, 'fly', { rot: 0, alpha: 0 }).end()
  },
  tap: () => [
    { ms: 280, pose: 'legs', rot: 180, ease: EASE.dart },
    { ms: 600, pose: 'legs', rot: 160 },
    { ms: 600, pose: 'legs', rot: 200 },
    { ms: 700, pose: 'legs', rot: 180 },
    { ms: 450, pose: 'crawl', rot: 0 },
  ],
})

// ---------- grasshopper: big springy jumps ----------
const grasshopper = simple({
  k: 2.7,
  hit: [-10, -9, 20, 10],
  head: [7, -6],
  draw: (a) => <Grasshopper s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const x = spot(c, r, 0.15, 0.6)
    const g = band(0.45)
    const s = story([offEdge(c, -dir, 30), g(x) - 120], g, 'hop')
    s.beats[0].alpha = 0
    s.xy(x, g(x), 900, 'hop', { hop: 60, alpha: 1, ease: EASE.lin })
    s.wait(r.range(1200, 2000), 'idle').wait(1100, 'sniff').wait(900, 'idle')
    for (let i = 0; i < int(r, 1, 2); i++) {
      const nx = s.x + dir * r.range(60, 110)
      s.wait(300, 'crouch').xy(nx, g(nx), 560, 'hop', { hop: r.range(40, 60) }).wait(r.range(1200, 2200), r.pick(['idle', 'sniff']))
    }
    return s.wait(300, 'crouch').xy(s.x + dir * 380, g(s.x) - 80, 900, 'hop', { hop: 70, alpha: 0 }).end()
  },
  tap: (at) => [
    { ms: 160, pose: 'crouch' },
    { ms: 800, pose: 'hop', hop: 90, rot: at.rot + 360 },
    { ms: 600, pose: 'idle', fx: 'sparkle' },
  ],
})

// ---------- garden spider: drops down, spins a web, climbs back ----------
const spider = simple({
  k: 2.4,
  hit: [-6, -6, 12, 12],
  head: [0, -4],
  draw: (a) => <Spider ink={a.ink} />,
  under: (u) => {
    const top = 330
    const len = Math.max(1, u.pos[1] - top)
    const webAt: P = [u.start[0], u.start[1] + 70]
    return (
      <g>
        <line x1={0} y1={0} x2={0} y2={1} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.8} style={{ transform: `translate(${u.start[0]}px,${top}px) scaleY(${len.toFixed(1)})`, transition: `transform ${u.ms}ms ${u.ease}` }} />
        {u.i >= 2 && <g transform={`translate(${webAt[0]},${webAt[1]}) scale(2.4)`} style={{ opacity: u.beat.alpha === 0 ? 0 : 1, transition: 'opacity 2s' }}><Web grow /></g>}
      </g>
    )
  },
  story: (r) => {
    const x = r.range(40, 90)
    const y0 = 420
    const s = story([x, y0], undefined, 'idle')
    s.xy(x, y0 + 70, r.range(2600, 3400), 'idle', { ease: EASE.stop })
    s.wait(r.range(6500, 7500), 'legs').wait(r.range(5000, 8000), 'idle').wait(1500, 'legs').wait(3000, 'idle')
    return s.xy(x, y0 - 10, 3000, 'legs', { ease: EASE.start }).wait(2200, 'idle', { alpha: 0 }).end()
  },
  tap: (at) => [
    { to: [at.pos[0], at.pos[1] - 34], ms: 420, pose: 'legs', ease: EASE.dart },
    { to: [at.pos[0], at.pos[1] + 8], ms: 700, pose: 'idle', ease: EASE.stop },
    { to: at.pos, ms: 500, pose: 'idle' },
  ],
})

// ---------- bumblebee: bumbles, bumps a flower, rests ----------
const bumblebee = simple({
  k: 2.5,
  hit: [-6, -6, 12, 10],
  head: [3, -6],
  draw: (a) => <Bumblebee ink={a.ink} />,
  story: (r, c) => {
    const dir = r.sign()
    const f = flower(c, r)
    const s = story([offEdge(c, dir, 30), f[1] - r.range(20, 80)], undefined, 'fly')
    flight(s, [f[0] - dir * 14, f[1] - 6], int(r, 4, 5), r, 26, [700, 1100])
    s.xy(f[0] - dir * 4, f[1], 220, 'fly', { rot: 25, ease: EASE.dart }).xy(f[0] - dir * 16, f[1] - 8, 300, 'fly', { rot: -15 })
    s.xy(f[0], f[1], 600, 'fly', { rot: 0 }).wait(r.range(2400, 3400), 'rest', { fx: 'pollen' }).wait(1400, 'idle')
    if (chance(r, 0.6)) {
      const g = flower(c, r)
      flight(s, g, 3, r, 18, [600, 900]).wait(2600, 'rest', { fx: 'pollen' })
    }
    return flight(s, away(c, r, dir), 4, r, 30, [600, 900]).end({ alpha: 0 })
  },
  tap: (at) => ring(at.pos[0], at.pos[1] - 20, 22, 18, 6, Math.PI / 2, 1).map((p, i) => ({ to: p, ms: 220, pose: 'fly', rot: i * 60, fx: i === 0 ? 'question' : undefined } as Beat)).concat([{ ms: 400, pose: 'fly', rot: 0 }]),
})

// ---------- honeybee: flower to flower, then a beeline home ----------
const honeybee = simple({
  k: 1.4,
  hit: [-8, -12, 16, 16],
  head: [6, -8],
  draw: (a) => <Bee ink={a.ink} pollen={a.look.i > 4} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir, 30), r.range(380, 480)], undefined, 'fly')
    for (let i = 0; i < int(r, 2, 4); i++) {
      const f = flower(c, r)
      s.xy(f[0] - dir * 10, f[1] - 10, r.range(900, 1400), 'fly', { ease: EASE.move })
      s.wait(r.range(500, 900), 'hover').xy(f[0], f[1], 400, 'hover', { ease: EASE.stop }).wait(r.range(1400, 2200), 'rest', { fx: i === 1 ? 'pollen' : undefined })
    }
    return s.xy(offEdge(c, -dir, 60), r.range(260, 360), 2200, 'fly', { ease: EASE.start }).end()
  },
  tap: (at) => {
    // a waggle dance: a figure of eight, wiggling through the middle
    const [x, y] = at.pos
    const pts: [number, number, number][] = [[x + 14, y - 8, 20], [x, y, -20], [x - 14, y - 8, 20], [x - 14, y + 8, 0], [x, y, 20], [x + 14, y + 8, -20], [x, y, 0]]
    return pts.map(([px, py, rot]) => ({ to: [px, py], ms: 240, pose: 'hover', rot } as Beat))
  },
})

// ---------- fly (silent) ----------
const fly = simple({
  k: 2.6,
  hit: [-4, -4, 8, 6],
  head: [2, -4],
  draw: (a) => <Fly ink={a.ink} />,
  story: (r, c) => {
    const dir = r.sign()
    const x = spot(c, r, 0.2, 0.8)
    const y = band(0.2)(x)
    const s = story([offEdge(c, dir, 20), y - 120], undefined, 'fly')
    for (let i = 0; i < 4; i++) s.xy(x + r.range(-80, 80), y - r.range(30, 110), r.range(250, 400), 'fly', { ease: EASE.dart })
    s.xy(x, y, 300, 'fly', { ease: EASE.stop }).wait(r.range(1000, 1600), 'rest').wait(r.range(1600, 2400), 'legs')
    for (let i = 0; i < 3; i++) s.xy(s.x + dir * r.range(6, 12), y, 160, 'crawl').wait(r.range(300, 700), 'rest')
    s.wait(1400, 'legs')
    return s.xy(offEdge(c, -dir, 30), y - 200, 900, 'fly', { ease: EASE.start }).end()
  },
  tap: (at, r) => [
    ...[0, 1, 2].map(() => ({ to: [at.pos[0] + r.range(-90, 90), at.pos[1] - r.range(30, 100)] as P, ms: 200, pose: 'fly', ease: EASE.dart })),
    { to: at.pos, ms: 260, pose: 'fly', ease: EASE.stop },
    { ms: 1600, pose: 'legs' },
  ],
})

// ---------- butterflies ----------
function butterflyStory(r: Rng, c: Ctx, lands: number, glide: boolean): Beat[] {
  const dir = r.sign()
  const s = story([offEdge(c, dir, 30), r.range(400, 520)], undefined, 'fly')
  for (let l = 0; l < lands; l++) {
    const f = flower(c, r)
    const hops = int(r, 3, 5)
    const [x0, y0] = [s.x, s.y]
    for (let i = 1; i <= hops; i++) {
      const t = i / hops
      const up = (i % 2 ? -1 : 1) * r.range(14, 34)
      s.xy(x0 + (f[0] - x0) * t, y0 + (f[1] - y0) * t + (i < hops ? up : 0), r.range(glide ? 1300 : 700, glide ? 1900 : 1100), glide && i % 2 ? 'glide' : 'fly', { ease: EASE.move })
    }
    s.wait(r.range(500, 800), 'rest').wait(r.range(3200, 5200), 'open').wait(r.range(700, 1200), 'rest')
  }
  const out = away(c, r, dir)
  return s.xy(out[0] * 0.5 + s.x * 0.5, s.y - 60, 1200, glide ? 'glide' : 'fly').xy(out[0], out[1] - 120, 1600, 'fly').end()
}
const painted = simple({
  k: 0.85,
  hit: [-15, -13, 30, 26],
  head: [0, -12],
  draw: (a) => <Butterfly color={a.s('#f2a541')} ink={a.ink} spot="#2a2a2a" tip="#3a2a20" />,
  story: (r, c) => butterflyStory(r, c, int(r, 1, 2), false),
  tap: (at, r, c) => {
    const f = flower(c, r)
    const loop = ring(at.pos[0], at.pos[1] - 40, 30, 26, 5, Math.PI / 2, 1).map((p) => ({ to: p, ms: 380, pose: 'fly' } as Beat))
    return [...loop, { to: f, ms: 1400, pose: 'fly' }, { ms: 2600, pose: 'open' }]
  },
})
const swallowtail = simple({
  k: 1.2,
  hit: [-15, -13, 30, 32],
  head: [0, -12],
  vars: { ['--flap' as string]: '.24s' },
  draw: (a) => <Butterfly color={a.s('#f5dc6a')} ink={a.ink} spot="#3b6fc4" tip="#1f2a44" tails />,
  story: (r, c) => butterflyStory(r, c, 1, true),
  tap: (at, r, c) => [
    { ms: 800, pose: 'open', sc: 1.15, fx: 'sparkle' },
    { ms: 300, pose: 'glide', sc: 1 },
    { to: [at.pos[0] + at.face * 160, at.pos[1] - 80], ms: 1800, pose: 'glide' },
    { to: [offEdge(c, at.face, 60), r.range(260, 360)], ms: 2200, pose: 'fly', end: true },
  ],
})

/** Two cabbage whites spiralling round each other as they rise. */
function CabbageWhites({ seed, ctx, onDone }: VisitProps) {
  const pair = useMemo(() => {
    const r = rng(seed)
    const dir = r.sign()
    const x0 = offEdge(ctx, dir, 30)
    const x1 = offEdge(ctx, -dir, 30)
    const yc = r.range(460, 540)
    const n = 26
    return [0, 1].map((k) => {
      const b: Beat[] = [{ to: [x0, yc], ms: 0, pose: 'fly' }]
      for (let i = 1; i <= n; i++) {
        const t = i / n
        const a = t * Math.PI * 2 * 5 + k * Math.PI
        const cx = x0 + (x1 - x0) * t
        const cy = yc - Math.sin(t * Math.PI) * 120 - t * 60
        b.push({ to: [cx + Math.cos(a) * 20, cy + Math.sin(a) * 12], ms: 520, pose: 'fly', ease: EASE.lin })
      }
      b[b.length - 1].end = true
      return b
    })
  }, [seed, ctx])
  const [cue, setCue] = useState(0)
  const [, setLeft] = useState(2)
  const part = (at: TapAt, k: number): Beat[] => [
    { to: [at.pos[0] + (k ? 40 : -40), at.pos[1] - 30], ms: 500, pose: 'fly', ease: EASE.dart },
    { to: [at.pos[0] + (k ? 300 : -300), at.pos[1] - 200], ms: 2600, pose: 'fly', end: true },
  ]
  return (
    <g>
      {pair.map((b, k) => (
        <Actor key={k} beats={b} k={0.7} hit={[-15, -13, 30, 26]} still={ctx.still} cue={cue} onTap={() => setCue(Date.now())} tap={(at) => part(at, k)}
          onDone={() => setLeft((l) => { if (l <= 1) setTimeout(onDone, 0); return l - 1 })}
          art={() => <Butterfly color={ctx.pal.shade('#f7f4ea')} ink={ctx.pal.c.ink} tip="#4a4a4a" spot="#4a4a4a" />} />
      ))}
    </g>
  )
}

// ---------- moth (night) ----------
const moth = simple({
  k: 2.4,
  hit: [-8, -6, 16, 10],
  head: [0, -6],
  vars: { ['--flap' as string]: '.12s' },
  draw: (a) => <Moth ink={a.ink} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir, 30), r.range(440, 520)], undefined, 'fly')
    for (let i = 0; i < 7; i++) s.xy(c.plant.x + r.range(-120, 120), c.plant.y - r.range(60, 200), r.range(320, 520), 'fly', { ease: EASE.dart })
    const f = flower(c, r)
    s.xy(f[0], f[1], 600, 'fly', { ease: EASE.stop }).wait(r.range(3000, 4500), 'rest')
    for (let i = 0; i < 4; i++) s.xy(f[0] + r.range(-60, 60), f[1] - r.range(20, 90), r.range(320, 520), 'fly', { ease: EASE.dart })
    return s.xy(offEdge(c, -dir, 40), r.range(300, 400), 1800, 'fly').end()
  },
  tap: (at) => ring(at.pos[0], at.pos[1] - 30, 24, 30, 6, Math.PI / 2, 1.5).map((p, i) => ({ to: [p[0], p[1] - i * 20], ms: 260, pose: 'fly' } as Beat)).concat([{ ms: 300, pose: 'fly', alpha: 0, end: true }]),
})

// ---------- fireflies (clear, healthy nights) ----------
function Fireflies({ seed, ctx, onDone }: VisitProps) {
  const flies = useMemo(() => {
    const r = rng(seed)
    const n = int(r, 6, 9)
    const spots: [number, number, number, number][] = [[258, 520, 110, 30], [620, 480, 170, 80], [480, 600, 380, 40], [120, 520, 80, 40]]
    return Array.from({ length: n }, (_, i) => {
      const [cx, cy, rx, ry] = spots[i % spots.length]
      const x = cx + r.range(-rx, rx)
      const y = cy + r.range(-ry, ry)
      const s = story([x, y], undefined, 'glow')
      s.beats[0].alpha = 0
      s.wait(i * r.range(900, 1600), 'glow').wait(1200, 'glow', { alpha: 1 })
      for (let k = 0; k < int(r, 3, 5); k++) s.xy(s.x + r.range(-40, 40), s.y + r.range(-30, 20), r.range(2600, 4200), 'glow', { ease: EASE.move })
      return s.wait(1500, 'glow', { alpha: 0 }).end()
    })
  }, [seed])
  const [cue, setCue] = useState(0)
  const [, setLeft] = useState(flies.length)
  return (
    <g>
      {flies.map((b, i) => (
        <Actor key={i} beats={b} k={1} hit={[-10, -10, 20, 20]} still={ctx.still} cue={cue} onTap={() => setCue(Date.now())} tap={() => [{ ms: 2200, pose: 'flash' }]}
          onDone={() => setLeft((l) => { if (l <= 1) setTimeout(onDone, 0); return l - 1 })} art={() => <Firefly />} />
      ))}
    </g>
  )
}

// ---------- mouse ----------
const mouse = simple({
  k: 2.5,
  hit: [-10, -10, 20, 12],
  head: [4, -10],
  vars: { ['--run' as string]: '.1s' },
  draw: (a) => <Mouse s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const g = band(0.6)
    const s = story([offEdge(c, dir, 30), g(offEdge(c, dir, 30))], g, 'run')
    for (let i = 0; i < int(r, 2, 4); i++) s.go(s.x + dir * r.range(60, 120), 170, 'run', { ease: EASE.dart }).wait(r.range(400, 900), r.pick(['alert', 'sniff']))
    s.wait(500, 'sit').wait(r.range(2200, 3200), 'eat').wait(900, 'sniff').wait(r.range(1400, 2000), 'eat')
    if (chance(r, 0.5)) s.wait(900, 'look')
    return s.go(s.x + dir * 70, 160, 'run', { alpha: 0 }).end()
  },
  tap: (at, _r, c) => [
    { ms: 800, pose: 'alert', fx: 'alarm' },
    { to: [offEdge(c, at.face, 40), at.pos[1] + 6], ms: 1100, pose: 'run', ease: EASE.dart, end: true },
  ],
})

// ---------- tortoise ----------
const tortoise = simple({
  k: 2.5,
  hit: [-10, -10, 26, 12],
  head: [14, -6],
  vars: { ['--plod' as string]: '1.1s', ['--eat' as string]: '14deg' },
  draw: (a) => <Tortoise s={a.s} ink={a.ink} pose={a.pose} />,
  under: (u, c) => {
    const fx = (u.beats[2]?.to ?? u.start)[0] + 16
    return (
      <g transform={`translate(${fx},${band(0.1)(fx) + 2})`}>
        <path d="M0,0 L0,-14" stroke={c.pal.c.grass} strokeWidth={1.6} />
        <circle cx={0} cy={-15} r={4.5} fill="#f4d35e" stroke={c.pal.c.ink} strokeWidth={0.6} style={{ transform: u.i >= 5 ? 'scale(.55)' : undefined, transformBox: 'fill-box', transformOrigin: '50% 50%', transition: 'transform 3s' }} />
      </g>
    )
  },
  story: (r, c) => {
    const g = band(0.1)
    const x = spot(c, r, 0.55, 0.75)
    const s = story([x, g(x)], g, 'plod')
    s.beats[0].alpha = 0
    s.wait(2000, 'plod', { alpha: 1 })
    s.go(x + 52, 6, 'plod').wait(1200, 'idle').wait(r.range(3000, 4200), 'eat').wait(1400, 'look')
    s.go(s.x + 40, 6, 'plod').wait(r.range(1500, 2500), 'idle')
    return s.go(s.x + 30, 6, 'plod', { alpha: 0 }).end()
  },
  tap: () => [
    { ms: 2800, pose: 'hide' },
    { ms: 1200, pose: 'idle' },
    { ms: 800, pose: 'look' },
  ],
})

// ---------- lizard on its sunning stone ----------
const STONE: P = [954, 594]
const lizard = simple({
  k: 2.3,
  hit: [-12, -6, 28, 8],
  head: [14, -4],
  draw: (a) => <Lizard s={a.s} ink={a.ink} />,
  story: (r, c) => {
    const s = story([c.view.x1 + 40, 640], undefined, 'crawl')
    s.xy(STONE[0] + 20, 612, 900, 'crawl', { ease: EASE.dart, face: -1 }).wait(r.range(500, 900), 'idle')
    s.xy(STONE[0], STONE[1], 400, 'crawl', { ease: EASE.dart, face: -1 }).wait(r.range(3000, 4500), 'idle')
    s.wait(2000, 'pushup').wait(r.range(2500, 4000), 'idle').wait(1800, 'nod').wait(r.range(2000, 3000), 'idle')
    return s.xy(STONE[0] - 120, 630, 800, 'crawl', { ease: EASE.dart, alpha: 0 }).end()
  },
  tap: (at) => [
    { to: [at.pos[0] + 22, at.pos[1] + 8], ms: 260, pose: 'crawl', alpha: 0, ease: EASE.dart },
    { ms: 1800, pose: 'idle' },
    { to: at.pos, ms: 500, pose: 'nod', alpha: 1, face: -1 },
  ],
})

// ---------- toad ----------
const toad = simple({
  k: 2.3,
  hit: [-8, -10, 16, 11],
  head: [5, -10],
  draw: (a) => <Toad s={a.s} ink={a.ink} />,
  story: (r, c) => {
    const dir = r.sign()
    const g = band(0.4)
    const x = c.view.x0 + (c.view.x1 - c.view.x0) * (dir > 0 ? 0.2 : 0.8)
    const s = story([offEdge(c, dir, 30), g(offEdge(c, dir, 30))], g, 'hop')
    s.hops(x, int(r, 3, 4), 700, 12)
    s.wait(r.range(2500, 3500), 'breathe').wait(400, 'idle', { fx: 'gulp' }).wait(2400, 'breathe')
    s.hops(x + dir * 60, 2, 700, 10).wait(r.range(2000, 3000), 'breathe')
    return s.hops(offEdge(c, -dir, 30), 5, 650, 12).end()
  },
  tap: () => [
    { ms: 1400, pose: 'puff' },
    { ms: 1600, pose: 'breathe' },
  ],
})

// ---------- chipmunk: stuffs its cheeks ----------
const chipmunk = simple({
  k: 2.5,
  hit: [-10, -14, 20, 15],
  head: [5, -14],
  draw: (a) => <Chipmunk s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const g = band(0.55)
    const s = story([offEdge(c, dir, 30), g(offEdge(c, dir, 30))], g, 'hop')
    for (let i = 0; i < 2; i++) s.hops(s.x + dir * r.range(80, 130), int(r, 3, 4), 200, 8).wait(r.range(500, 900), r.pick(['alert', 'swish']))
    s.wait(400, 'sit').wait(2400, 'stuff').wait(800, 'look').wait(2400, 'stuff').wait(600, 'alert')
    return s.hops(offEdge(c, -dir, 30), 8, 200, 9).end()
  },
  tap: (at, _r, c) => [
    { ms: 700, pose: 'alert', fx: 'alarm' },
    { ms: 900, pose: 'swish' },
    { to: [offEdge(c, at.face, 40), at.pos[1]], ms: 1300, pose: 'hop', hop: 9, hops: 6, ease: EASE.lin, end: true },
  ],
})

// ---------- mole: molehills pop up and a pink nose peeks out ----------
const mole = simple({
  k: 2.4,
  hit: [-6, -8, 12, 9],
  head: [0, -6],
  draw: (a) => <g transform="translate(0,-4)"><Mole s={a.s} ink={a.ink} /></g>,
  under: (u, c) => {
    const second = u.beats.find((b, i) => i > 0 && b.to && b.to[0] !== u.start[0])?.to
    return (
      <g>
        <g transform={`translate(${u.start[0]},${u.start[1] + 1}) scale(2.4)`}><g className="st-grow"><Molehill s={c.pal.shade} ink={c.pal.c.ink} /></g></g>
        {second && u.i >= 7 && <g transform={`translate(${second[0]},${second[1] + 1}) scale(2.4)`}><g className="st-grow"><Molehill s={c.pal.shade} ink={c.pal.c.ink} /></g></g>}
      </g>
    )
  },
  story: (r, c) => {
    const g = band(0.7)
    const x = spot(c, r, 0.1, 0.45)
    const s = story([x, g(x)], undefined, 'idle')
    s.beats[0].sy = 0
    const x2 = x + r.sign() * r.range(50, 90)
    s.wait(1400, 'idle', { fx: 'dirt' }).wait(600, 'idle', { sy: 1, ease: EASE.stop }).wait(r.range(1800, 2600), 'sniff').wait(1200, 'look').wait(400, 'idle', { sy: 0 })
    s.xy(x2, g(x2), 2200, 'idle').wait(1200, 'idle', { fx: 'dirt' }).wait(600, 'idle', { sy: 1 }).wait(r.range(1600, 2400), 'sniff').wait(500, 'idle', { sy: 0 })
    return s.wait(2500, 'idle', { alpha: 0 }).end()
  },
  tap: () => [
    { ms: 150, pose: 'idle', sy: 0, fx: 'dirt', ease: EASE.dart },
    { ms: 1300, pose: 'idle' },
    { ms: 500, pose: 'sniff', sy: 1, fx: 'alarm' },
  ],
})

// ---------- snail (grey and wet days): leaves a shiny trail ----------
const snail = simple({
  k: 1.7,
  hit: [-8, -10, 20, 12],
  head: [10, -6],
  draw: (a) => <Snail s={a.s} ink={a.ink} pose={a.pose} />,
  under: (u) => {
    const dx = u.pos[0] - u.start[0]
    const dy = u.pos[1] - u.start[1]
    const len = Math.max(0.01, Math.hypot(dx, dy))
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI
    return <line x1={0} y1={0} x2={1} y2={0} stroke="#e8f2fa" strokeOpacity={0.75} strokeWidth={2.2} strokeLinecap="round" style={{ transform: `translate(${u.start[0]}px,${u.start[1] + 1}px) rotate(${ang.toFixed(1)}deg) scaleX(${len.toFixed(1)})`, transition: `transform ${u.ms}ms linear` }} />
  },
  story: (r, c) => {
    const dir = r.sign()
    const g = band(0.25)
    const x = spot(c, r, 0.3, 0.7)
    const pt = (t: number): P => [x + dir * t * 150, g(x) + t * 6]
    const s = story(pt(0), undefined, 'idle')
    s.beats[0].alpha = 0
    s.wait(1500, 'hide', { alpha: 1 }).wait(1500, 'idle')
    s.xy(...pt(0.35), 18000, 'idle', { ease: EASE.lin }).wait(r.range(2500, 4000), 'look')
    s.xy(...pt(0.7), 18000, 'idle', { ease: EASE.lin }).wait(r.range(2000, 3000), 'idle')
    return s.xy(...pt(1), 14000, 'idle', { ease: EASE.lin }).wait(2000, 'idle', { alpha: 0 }).end()
  },
  tap: () => [
    { ms: 3000, pose: 'hide' },
    { ms: 1800, pose: 'idle' },
  ],
})

// ---------- garden birds ----------
const bird = (body: string, belly: string) => (a: { s: (c: string) => string; ink: string; pose: string }) => <Songbird body={a.s(body)} belly={a.s(belly)} ink={a.ink} pose={a.pose} />
const landFromSky = (c: Ctx, r: Rng, to: P) => {
  const dir = to[0] < 500 ? 1 : -1
  const s = story([offEdge(c, dir, 40), r.range(300, 380)], undefined, 'fly')
  s.xy((s.x + to[0]) / 2, to[1] - r.range(40, 90), r.range(1000, 1400), 'fly', { ease: EASE.lin })
  s.xy(to[0], to[1], r.range(700, 900), 'glide', { ease: EASE.stop })
  return s
}

const robin = simple({
  k: 2.4,
  hit: [-10, -13, 20, 14],
  head: [5, -12],
  vars: { ['--flap' as string]: '.12s', ['--peck' as string]: '50deg' },
  draw: bird('#8a5a3a', '#e2683a'),
  story: (r, c) => {
    const g = band(0.3)
    const x = spot(c, r, 0.2, 0.75)
    const s = landFromSky(c, r, [x, g(x)])
    s.wait(500, 'idle')
    for (let i = 0; i < int(r, 2, 3); i++) {
      s.hops(s.x + r.sign() * r.range(14, 30), int(r, 2, 3), 220, 5)
      s.wait(r.range(700, 1200), 'tilt').wait(r.range(800, 1400), i === 1 ? 'tug' : 'peck')
    }
    s.wait(600, 'idle')
    const p = perch(r)
    s.xy(p[0], p[1], 1300, 'fly', { ease: EASE.move }).wait(r.range(2000, 3000), 'sing').wait(900, 'look')
    return s.xy(offEdge(c, 1, 50), r.range(280, 360), 1400, 'fly', { ease: EASE.start }).end()
  },
  tap: () => [
    { ms: 1300, pose: 'puff' },
    { ms: 900, pose: 'swish' },
    { ms: 600, pose: 'tilt' },
  ],
})

const bluebird = simple({
  k: 2.3,
  hit: [-10, -13, 20, 14],
  head: [5, -12],
  vars: { ['--flap' as string]: '.1s' },
  draw: bird('#4f7fc4', '#e9a066'),
  story: (r, c) => {
    const p = perch(r)
    const s = landFromSky(c, r, p)
    s.wait(r.range(1500, 2500), 'look').wait(800, 'idle')
    for (let i = 0; i < int(r, 1, 2); i++) {
      const gx = p[0] - r.range(40, 120)
      s.xy(gx, band(0.2)(gx) - 30, 500, 'hover', { ease: EASE.move }).wait(r.range(500, 800), 'hover')
      s.xy(gx, band(0.2)(gx), 300, 'fly', { ease: EASE.start }).wait(900, 'peck')
      s.xy(p[0], p[1], 800, 'fly', { ease: EASE.move }).wait(r.range(1500, 2200), 'sing')
    }
    return s.xy(offEdge(c, 1, 50), r.range(260, 340), 1300, 'fly', { ease: EASE.start }).end()
  },
  tap: (at) => [
    { to: [at.pos[0], at.pos[1] - 16], ms: 300, pose: 'hover' },
    { ms: 700, pose: 'hover' },
    { to: at.pos, ms: 300, pose: 'fly' },
    { ms: 700, pose: 'tilt' },
  ],
})

/** A little flock of sparrows: hop and peck, one has a dust bath, and they all leave together. */
function Sparrows({ seed, ctx, onDone }: VisitProps) {
  const flock = useMemo(() => {
    const r = rng(seed)
    const g = band(0.2)
    const cx = spot(ctx, r, 0.25, 0.7)
    const birds = [0, 1, 2].map((i) => {
      const x = cx + (i - 1) * r.range(26, 40)
      const s = landFromSky(ctx, r, [x, g(x)])
      s.beats[0].ms = i * 500
      for (let k = 0; k < 3; k++) {
        s.hops(s.x + r.sign() * r.range(8, 20), int(r, 1, 3), 200, 4)
        s.wait(r.range(900, 1600), i === 1 && k === 1 ? 'dig' : 'peck', { fx: i === 1 && k === 1 ? 'dust' : undefined })
      }
      return s.beats
    })
    const T = Math.max(...birds.map(dur)) + 600
    const dir = r.sign()
    return birds.map((b, i) => [...padTo(b, T, 'idle'), { to: [offEdge(ctx, dir, 50) + i * 20, 300 + i * 14] as P, ms: 1500 + i * 120, pose: 'fly', ease: EASE.start, end: true } as Beat])
  }, [seed, ctx])
  const [cue, setCue] = useState(0)
  const [, setLeft] = useState(3)
  const flee = (at: TapAt, i: number): Beat[] => {
    const p = FENCE.rail(-26 + i * 22)
    return [{ ms: 200, pose: 'alert' }, { to: p, ms: 800, pose: 'fly' }, { ms: 1800, pose: 'tilt' }, { to: [at.pos[0] + 900, 280], ms: 1800, pose: 'fly', end: true }]
  }
  return (
    <g>
      {flock.map((b, i) => (
        <Actor key={i} beats={b} k={2.1} hit={[-10, -13, 20, 14]} still={ctx.still} cue={cue} onTap={() => setCue(Date.now())} tap={(at) => flee(at, i)} vars={{ ['--flap' as string]: '.1s' }}
          onDone={() => setLeft((l) => { if (l <= 1) setTimeout(onDone, 0); return l - 1 })} art={(l) => <Songbird body={ctx.pal.shade('#a88b6a')} belly={ctx.pal.shade('#efe0c8')} ink={ctx.pal.c.ink} pose={l.pose} />} />
      ))}
    </g>
  )
}

const hummingbird = simple({
  k: 2.4,
  hit: [-9, -7, 20, 10],
  head: [8, -4],
  draw: (a) => <Hummingbird ink={a.ink} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir, 30), r.range(420, 500)], undefined, 'hover')
    for (let i = 0; i < int(r, 2, 3); i++) {
      const f = flower(c, r)
      const side = f[0] > s.x ? -1 : 1
      s.xy(f[0] + side * 30, f[1], r.range(450, 650), 'hover', { ease: EASE.dart }).wait(r.range(500, 900), 'hover')
      s.xy(f[0] + side * 14, f[1], 300, 'hover').wait(r.range(1100, 1700), 'hover').xy(f[0] + side * 32, f[1] - 4, 260, 'hover', { face: (-side) as 1 | -1 })
    }
    return s.xy(offEdge(c, -dir, 40), r.range(300, 380), 900, 'hover', { ease: EASE.start }).end()
  },
  tap: (at) => [
    { to: [at.pos[0] + 30, at.pos[1] - 26], ms: 160, pose: 'hover', ease: EASE.dart },
    { to: [at.pos[0] - 30, at.pos[1] - 26], ms: 160, pose: 'hover', ease: EASE.dart },
    { to: at.pos, ms: 160, pose: 'hover', ease: EASE.dart },
    { ms: 900, pose: 'hover', face: (-at.face) as 1 | -1, fx: 'heart' },
  ],
})

const POST_SIDE: P = [FENCE.x - 38.6 * FENCE.k, FENCE.base - 16 * FENCE.k]
const woodpecker = simple({
  k: 2.3,
  hit: [-6, -15, 13, 20],
  head: [4, -12],
  draw: (a) => <Woodpecker ink={a.ink} />,
  story: (r) => {
    const s = story([700, 360], undefined, 'idle')
    s.beats[0].alpha = 0
    s.xy(POST_SIDE[0] - 40, POST_SIDE[1] - 40, 900, 'idle', { alpha: 1, hop: 16, ease: EASE.lin, face: 1 })
    s.xy(POST_SIDE[0], POST_SIDE[1], 500, 'idle', { hop: 10, face: 1 }).wait(800, 'look')
    for (let i = 0; i < int(r, 2, 3); i++) {
      s.wait(1100, 'drum', { fx: 'chips' }).wait(r.range(900, 1600), r.pick(['idle', 'look']))
      s.xy(POST_SIDE[0], s.y - r.range(4, 8), 300, 'idle', { face: 1 })
    }
    return s.xy(620, 360, 1400, 'idle', { hop: 20, alpha: 0, face: -1 }).end()
  },
  tap: (at) => [
    { to: [at.pos[0] + 8, at.pos[1]], ms: 300, pose: 'idle', alpha: 0.2, face: 1 },
    { ms: 1600, pose: 'idle' },
    { to: at.pos, ms: 400, pose: 'tilt', alpha: 1, face: 1 },
    { ms: 600, pose: 'idle' },
  ],
})

const dove = simple({
  k: 2.3,
  hit: [-10, -13, 20, 14],
  head: [5, -12],
  vars: { ['--flap' as string]: '.16s' },
  draw: bird('#e7e4df', '#f3e9e6'),
  story: (r, c) => {
    const p = FENCE.rail(r.range(-20, 0))
    const s = landFromSky(c, r, p)
    s.wait(r.range(2200, 3000), 'coo').wait(1800, 'nod').wait(600, 'idle')
    const q = FENCE.rail(r.range(8, 24))
    s.xy(q[0], q[1], 1400, 'idle', { hop: 4, hops: 4, ease: EASE.lin }).wait(r.range(2200, 2800), 'preen').wait(r.range(1600, 2400), 'coo')
    return s.xy(offEdge(c, 1, 50), r.range(240, 320), 1600, 'fly', { ease: EASE.start }).end()
  },
  tap: (at) => [
    { to: [at.pos[0] - 30, at.pos[1] - 50], ms: 500, pose: 'fly', fx: 'sparkle' },
    { to: [at.pos[0] + 20, at.pos[1] - 60], ms: 700, pose: 'glide' },
    { to: at.pos, ms: 700, pose: 'glide', ease: EASE.stop },
    { ms: 1600, pose: 'coo' },
  ],
})

const crow = simple({
  k: 2.5,
  hit: [-10, -13, 20, 14],
  head: [5, -12],
  vars: { ['--flap' as string]: '.18s', ['--peck' as string]: '48deg' },
  draw: bird('#2c2d33', '#3d3f47'),
  story: (r, c) => {
    const g = band(0.15)
    const x = spot(c, r, 0.25, 0.75)
    const s = landFromSky(c, r, [x, g(x)])
    s.wait(600, 'idle')
    // struts about, finds something shiny, caws
    for (let i = 0; i < 2; i++) s.xy(s.x + r.sign() * r.range(20, 40), g(s.x), 900, 'idle', { hop: 3, hops: 3, ease: EASE.lin }).wait(r.range(700, 1100), 'tilt')
    s.wait(1100, 'peck', { fx: 'sparkle' }).wait(1300, 'sing').wait(700, 'look')
    return s.xy(offEdge(c, r.sign(), 50), r.range(260, 340), 1500, 'fly', { ease: EASE.start }).end()
  },
  tap: (at) => [
    { ms: 600, pose: 'tilt' },
    { to: [at.pos[0] - at.face * 14, at.pos[1]], ms: 260, pose: 'idle', hop: 6, face: at.face },
    { to: [at.pos[0] - at.face * 28, at.pos[1]], ms: 260, pose: 'idle', hop: 6, face: at.face },
    { ms: 1100, pose: 'sing' },
  ],
})

// ---------- the owl (clear, healthy nights) ----------
const STUMP: P = [108, 506]
function OwlVisit({ seed, ctx, onDone }: VisitProps) {
  const beats = useMemo(() => {
    const r = rng(seed)
    const s = story([-60, 400], undefined, 'glide')
    s.xy(60, 470, 1800, 'fly', { ease: EASE.lin, face: 1 }).xy(STUMP[0], STUMP[1], 1100, 'glide', { ease: EASE.stop })
    s.wait(600, 'idle')
    const acts = ['turn', 'look', 'puff', 'doze', 'idle', 'turn', 'look']
    for (let i = 0; i < int(r, 6, 9); i++) s.wait(r.range(3000, 6000), 'idle').wait(r.range(1400, 3200), r.pick(acts))
    return s.xy(STUMP[0] + 80, STUMP[1] - 60, 900, 'fly', { ease: EASE.start }).xy(-80, 380, 2000, 'glide').end()
  }, [seed])
  return (
    <Actor beats={beats} k={1} hit={[-16, -38, 32, 40]} head={[0, -36]} still={ctx.still} onDone={onDone} onCall={ctx.call} vars={{ ['--flap' as string]: '.4s' }}
      tap={() => [{ ms: 1400, pose: 'spin', call: 'hoot' }, { ms: 900, pose: 'idle' }]} art={(l) => <Owl pal={ctx.pal} pose={l.pose} />} />
  )
}

export const SMALL: Record<string, Species> = {
  ladybird: { name: 'ladybird', icon: '🐞', slot: 'near', layer: 'front', min: 0.1, when: 'day', Comp: ladybird, tale: 'Walks to a grass blade, climbs to the very top, opens its red wing cases and flies off. Tap: plays dead upside down, then rights itself.' },
  ant: { name: 'ant', icon: '🐜', slot: 'near', layer: 'front', min: 0.1, when: 'day', need: (e) => !e.wet, Comp: Ants, tale: 'Ants file out of their little hill to a crumb, and one carries it home. Tap: they scatter, then regroup and go home.' },
  earthworm: { name: 'earthworm', icon: '🪱', slot: 'near', layer: 'front', min: 0.1, when: 'any', weight: 1.2, Comp: earthworm, tale: 'Pokes up out of the soil, sways, leans, slips down and pops up again nearby. Tap: shoots back underground, then peeks out.' },
  caterpillar: { name: 'caterpillar', icon: '🐛', slot: 'near', layer: 'front', min: 0.45, when: 'day', Comp: caterpillar, tale: 'Inches along to a leaf and munches bites out of it, rearing up between. Tap: curls into a ring.' },
  beetle: { name: 'beetle', icon: '🪲', slot: 'near', layer: 'front', min: 0.5, when: 'day', Comp: beetle, tale: 'Trundles in stop-start, then opens its shell and clumsily flies away. Tap: flips onto its back, legs waving, and rocks itself upright.' },
  grasshopper: { name: 'grasshopper', icon: '🦗', slot: 'near', layer: 'front', min: 0.55, when: 'day', Comp: grasshopper, tale: 'Lands with a leap, cleans its feelers, crouches and springs about, then one huge jump away (silently). Tap: a spinning leap.' },
  spider: { name: 'garden spider', icon: '🕷️', slot: 'near', layer: 'front', min: 0.5, when: 'any', Comp: spider, tale: 'Drops down on a silk thread, spins a web strand by strand, waits in the middle, climbs back up. Tap: yo-yos up its thread.' },
  bumblebee: { name: 'bumblebee', icon: '🐝', slot: 'near', layer: 'front', min: 0.6, when: 'day', need: (e) => !e.wet, Comp: bumblebee, tale: 'Bumbles in on a wobbly path, bonks into a flower, rests and gathers pollen. Tap: a dizzy loop-the-loop.' },
  honeybee: { name: 'honeybee', icon: '🍯', slot: 'near', layer: 'front', min: 0.45, when: 'day', need: (e) => !e.wet, Comp: honeybee, tale: 'Visits two to four flowers on the plant, hovering then landing, gets pollen on its legs and makes a beeline home. Tap: a waggle dance.' },
  fly: { name: 'fly', icon: '🪰', slot: 'near', layer: 'front', min: 0.4, when: 'day', Comp: fly, tale: 'Zips about, lands, rubs its front legs, takes a few jerky steps (no buzzing). Tap: zooms off... and comes right back.' },
  'painted butterfly': { name: 'painted butterfly', icon: '🦋', slot: 'near', layer: 'front', min: 0.4, when: 'day', need: (e) => !e.wet, weight: 1.3, Comp: painted, tale: 'Flutters up and down to the plant, lands and slowly opens and closes its wings, then drifts to another flower. Tap: a spiral flight and a new flower.' },
  'cabbage white': { name: 'cabbage white', icon: '🤍', slot: 'near', layer: 'front', min: 0.7, when: 'day', need: (e) => !e.wet, Comp: CabbageWhites, tale: 'Two white butterflies spiral round each other as they cross and rise. Tap: they part ways.' },
  swallowtail: { name: 'swallowtail', icon: '💛', slot: 'near', layer: 'front', min: 0.85, when: 'day', need: (e) => !e.wet, Comp: swallowtail, tale: 'Glides in on big floaty swoops, lands and fans its tailed wings. Tap: flashes its wings and sails away.' },
  moth: { name: 'moth', icon: '🌙', slot: 'near', layer: 'front', min: 0.3, when: 'night', Comp: moth, tale: 'Flutters in jittery loops round the plant at night, rests with wings flat, flits off. Tap: spirals up into the dark.' },
  firefly: { name: 'firefly', icon: '✨', slot: 'near', layer: 'front', min: 0.5, when: 'night', need: (e) => e.nightLife, Comp: Fireflies, tale: 'A few fireflies light up one by one, drift and glow, then fade. Tap: they all flash together.' },
  mouse: { name: 'mouse', icon: '🐭', slot: 'near', layer: 'front', min: 0.6, when: 'day', Comp: mouse, tale: 'Scurries in short dashes, sits up to nibble a seed held in its paws, whiskers twitching, slips into the grass. Tap: freezes, then dashes off.' },
  tortoise: { name: 'tortoise', icon: '🐢', slot: 'near', layer: 'front', min: 0.6, when: 'day', Comp: tortoise, tale: 'Plods out of the grass ever so slowly to a dandelion and munches it. Tap: pulls into its shell, then peeks out.' },
  lizard: { name: 'lizard', icon: '🦎', slot: 'near', layer: 'front', min: 0.65, when: 'day', need: (e) => !e.wet && !e.grey, Comp: lizard, tale: 'Darts onto its sunning stone, basks, does push-ups and head bobs, darts away. Tap: hides behind the stone, then peeks back.' },
  toad: { name: 'toad', icon: '🐸', slot: 'near', layer: 'front', min: 0.5, when: 'any', Comp: toad, tale: 'Plops in with slow hops, sits with its throat pulsing, snaps a gnat, hops on. Tap: puffs itself up big.' },
  chipmunk: { name: 'chipmunk', icon: '🌰', slot: 'near', layer: 'front', min: 0.7, when: 'day', Comp: chipmunk, tale: 'Dashes in, sits up and stuffs its cheeks, looks round, stuffs some more, scampers off. Tap: chirps, flicks its tail, runs.' },
  mole: { name: 'mole', icon: '🕳️', slot: 'near', layer: 'front', min: 0.7, when: 'any', Comp: mole, tale: 'A molehill rises, a pink nose peeks out and sniffs, then another molehill pops up nearby. Tap: ducks down, then pops back up.' },
  snail: { name: 'snail', icon: '🐌', slot: 'near', layer: 'front', min: 0.3, when: 'day', need: (e) => e.grey || e.wet, weight: 1.5, Comp: snail, tale: 'On grey or wet days, slides very slowly leaving a shiny trail, stopping to look about. Tap: hides in its shell, then slowly comes out.' },
  robin: { name: 'robin', icon: '🐦', slot: 'near', layer: 'front', min: 0.5, when: 'day', Comp: robin, tale: 'Flies down, hops, cocks its head to listen, tugs up a worm, then sings from the fence. Tap: puffs up its red chest.' },
  bluebird: { name: 'bluebird', icon: '💙', slot: 'near', layer: 'front', min: 0.8, when: 'day', Comp: bluebird, tale: 'Perches on the fence, hovers and drops to catch an insect, back to the fence to sing. Tap: flutters up and resettles.' },
  sparrow: { name: 'sparrow', icon: '🐤', slot: 'near', layer: 'front', min: 0.55, when: 'day', Comp: Sparrows, tale: 'Three sparrows hop and peck, one has a dust bath, and they all fly off together. Tap: they flee to the fence first.' },
  hummingbird: { name: 'hummingbird', icon: '🌺', slot: 'near', layer: 'front', min: 0.6, when: 'day', need: (e) => !e.wet, Comp: hummingbird, tale: 'Zips to a flower, hovers, sips, backs out and zips to the next. Tap: a quick triangle round you and a heart.' },
  woodpecker: { name: 'woodpecker', icon: '🪵', slot: 'near', layer: 'front', min: 0.7, when: 'day', Comp: woodpecker, tale: 'Bounds over to a fence post, drums in bursts with chips flying, hitches up the post. Tap: hides behind the post, then peeks out.' },
  dove: { name: 'dove', icon: '🕊️', slot: 'near', layer: 'front', min: 0.75, when: 'day', Comp: dove, tale: 'Glides onto the fence rail, coos and bows, shuffles along, preens. Tap: claps up and glides back down.' },
  crow: { name: 'crow', icon: '🐦‍⬛', slot: 'near', layer: 'front', min: 0.85, when: 'day', Comp: crow, tale: 'Lands and struts, tilts its head, finds something shiny and caws about it. Tap: a sideways hop and a caw.' },
  owl: { name: 'owl', icon: '🦉', slot: 'near', layer: 'front', min: 0.3, when: 'night', need: (e) => e.nightLife, weight: 2, Comp: OwlVisit, tale: 'Glides in silently to the old stump, blinks, turns its head right round, fluffs up, dozes, then flies off. Tap: head spin and a hoot.' },
}
