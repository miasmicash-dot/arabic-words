// Stories for the pond (one visitor at a time), the sky (one) and the far hills (one): ducks, swan, heron,
// kingfisher, turtle, fish, the frog's fly, dragonflies; swallows, geese, eagle, bats; herds, horses, elephants,
// a chase and the monkeys in the grove.
import { useMemo, useState } from 'react'
import { rng, type Rng } from './ink'
import { Actor, EASE, story, type Beat, type P, type TapAt } from './actor'
import { Elephant, Fox, GROVE, Horse, Monkey, Rabbit, VINE } from './Creatures'
import { Bat, Damselfly, Dragonfly, Duck, Eagle, FarHerdAnimal, Fish, Fly, Goose, Heron, Kingfisher, Log, Swallow, Swan, Turtle, type Herd } from './Critters'
import { LINES, W, yAt } from './Landscape'
import { REEDS } from './Pond'
import { chance, dur, int, padTo, ring, simple, type Species, type VisitProps } from './kit'

// ---------- pond geometry (see Pond.tsx) ----------
const PCX = 258
const WATER = 557
const reedTop = (i: number): P => {
  const rd = REEDS[i % REEDS.length]
  return [rd.x + rd.bend * 1.4, 551 - rd.h]
}
const onWater = (x: number) => WATER + Math.max(0, 1 - Math.abs(x - PCX) / 100) * 3

/** A group of actors that leaves together: onDone when the last one finishes. */
function useGroup(n: number, onDone: () => void) {
  const [left, setLeft] = useState(n)
  const [cue, setCue] = useState(0)
  const done = () => setLeft((l) => { if (l <= 1) setTimeout(onDone, 0); return l - 1 })
  return { left, cue, poke: () => setCue(Date.now()), done }
}

// ---------- duck and ducklings ----------
function Ducks({ seed, ctx, onDone }: VisitProps) {
  const plan = useMemo(() => {
    const r = rng(seed)
    const dir = r.sign()
    const xs = dir > 0 ? [168, 228, 292, 352] : [352, 292, 228, 168]
    const mum = story([xs[0], onWater(xs[0])], onWater, 'swim')
    mum.beats[0].alpha = 0
    mum.wait(1200, 'swim', { alpha: 1 })
    mum.go(xs[1], 12, 'swim').wait(r.range(1200, 2000), 'swim').wait(2800, 'dabble').wait(r.range(1000, 1600), 'swim')
    mum.go(xs[2], 12, 'swim').wait(r.range(1500, 2500), r.pick(['preen', 'look']))
    mum.go(xs[3], 12, 'swim', { alpha: 0 })
    const n = int(r, 2, 4)
    const ducklings = Array.from({ length: n }, (_, i) => {
      // they follow mum's path a little behind, sometimes scooting to catch up
      const lag = (i + 1) * 900
      const b: Beat[] = [{ to: [xs[0] - dir * 6, onWater(xs[0])], ms: 0, pose: 'swim', alpha: 0 }, { ms: lag, pose: 'swim' }]
      for (const m of mum.beats.slice(1)) {
        const to = m.to ? ([m.to[0] - dir * (14 + i * 11), m.to[1] + 1] as P) : undefined
        b.push({ ...m, to, pose: m.pose === 'dabble' ? (i % 2 ? 'hover' : 'swim') : m.pose, fx: undefined })
      }
      b[b.length - 1].end = true
      return b
    })
    return { mum: mum.end(), ducklings }
  }, [seed])
  const g = useGroup(plan.ducklings.length + 1, onDone)
  const s = ctx.pal.shade
  const ink = ctx.pal.c.ink
  return (
    <g>
      <Actor beats={plan.mum} k={1.6} hit={[-9, -10, 19, 12]} head={[4, -8]} still={ctx.still} onDone={g.done}
        tap={() => [{ ms: 900, pose: 'nod', fx: 'ripple' }]} onTap={g.poke} art={() => <Duck s={s} ink={ink} />} />
      {plan.ducklings.map((b, i) => (
        <Actor key={i} beats={b} k={1} hit={[-9, -9, 19, 11]} still={ctx.still} cue={g.cue} onDone={g.done} vars={{ ['--flap' as string]: '.1s' }}
          tap={(at) => [{ ms: 400, pose: 'hover' }, { to: [at.pos[0] + at.face * 10, at.pos[1]], ms: 300, pose: 'swim' }]} art={() => <Duck s={s} ink={ink} baby />} />
      ))}
    </g>
  )
}

// ---------- swan ----------
const swan = simple({
  k: 1.6,
  hit: [-15, -22, 30, 23],
  head: [10, -20],
  draw: (a) => <Swan ink={a.ink} pose={a.pose} />,
  story: (r) => {
    const dir = r.sign()
    const x0 = dir > 0 ? 170 : 348
    const s = story([x0, onWater(x0)], onWater, 'swim')
    s.beats[0].alpha = 0
    s.wait(1500, 'swim', { alpha: 1 }).go(PCX - dir * 30, 9, 'swim').wait(2600, 'preen').wait(r.range(1200, 2000), 'swim')
    if (chance(r, 0.6)) s.wait(2200, 'wings').wait(900, 'swim')
    return s.go(dir > 0 ? 352 : 166, 9, 'swim', { alpha: 0 }).end()
  },
  tap: () => [{ ms: 1800, pose: 'wings', sc: 1.08 }, { ms: 500, pose: 'swim', sc: 1 }],
})

// ---------- heron ----------
const heron = simple({
  k: 1.6,
  hit: [-12, -40, 26, 42],
  head: [14, -36],
  vars: { ['--flap' as string]: '.42s' },
  draw: (a) => <Heron ink={a.ink} pose={a.pose} />,
  story: (r) => {
    const spotX = r.range(318, 344)
    const s = story([560, 380], undefined, 'fly')
    s.xy(spotX + 30, 520, 2200, 'fly', { ease: EASE.lin, face: -1 }).xy(spotX, onWater(spotX), 900, 'glide', { ease: EASE.stop, face: -1 })
    s.wait(r.range(3500, 5000), 'idle').xy(spotX - 8, onWater(spotX - 8), 1600, 'walk').wait(r.range(2500, 4000), 'idle')
    s.wait(900, 'strike', { fx: 'splash' }).wait(r.range(900, 1400), chance(r, 0.6) ? 'gulp' : 'shake').wait(r.range(2000, 3000), 'idle')
    return s.xy(spotX - 120, 470, 1600, 'fly', { ease: EASE.start }).xy(-60, 360, 3000, 'fly').end()
  },
  tap: (at) => [
    { ms: 300, pose: 'alert' },
    { to: [at.pos[0] + 40, at.pos[1] - 60], ms: 1400, pose: 'fly', ease: EASE.start },
    { to: [W + 60, 340], ms: 3200, pose: 'fly', end: true },
  ],
})

// ---------- kingfisher ----------
function kingfisherArt(a: { ink: string; look: { i: number } }) {
  return <Kingfisher ink={a.ink} fish={a.look.i >= 6 && a.look.i <= 8} />
}
const kingfisher = simple({
  k: 1.7,
  hit: [-8, -13, 18, 14],
  head: [4, -10],
  vars: { ['--flap' as string]: '.08s' },
  draw: kingfisherArt,
  story: (r) => {
    const reed = reedTop(int(r, 0, 7))
    const s = story([-40, 520], undefined, 'fly')
    s.xy(reed[0], reed[1], 900, 'fly', { ease: EASE.dart, face: 1 }).wait(r.range(1500, 2500), 'nod').wait(1200, 'look')
    s.xy(reed[0] + 26, WATER, 320, 'fly', { ease: EASE.start, rot: 60 }).wait(160, 'fly', { fx: 'splash', rot: 0 })
    s.xy(reed[0], reed[1], 500, 'fly', { ease: EASE.stop, face: 1 }).wait(r.range(1500, 2200), 'nod').wait(800, 'idle')
    return s.xy(W + 60, 520, 1200, 'fly', { ease: EASE.start }).end()
  },
  tap: (at) => [
    { to: [at.pos[0] + 20, WATER], ms: 300, pose: 'fly', rot: 50, ease: EASE.start },
    { ms: 120, pose: 'fly', rot: 0, fx: 'splash' },
    { to: [W + 60, WATER - 14], ms: 1300, pose: 'fly', ease: EASE.dart, end: true },
  ],
})

// ---------- turtle ----------
const LOG: P = [214, 560]
const turtle = simple({
  k: 1.5,
  hit: [-8, -8, 20, 10],
  head: [8, -4],
  draw: (a) => <Turtle s={a.s} ink={a.ink} />,
  under: (u, c) => <g transform={`translate(${LOG[0]},${LOG[1]}) scale(1.4)`} className="st-fadein" style={{ opacity: u.i >= u.beats.length - 1 ? 0 : 1, transition: 'opacity 2s' }}><Log s={c.pal.shade} ink={c.pal.c.ink} /></g>,
  story: (r) => {
    const s = story([290, WATER + 2], undefined, 'swim')
    s.beats[0].alpha = 0
    s.wait(1200, 'swim', { alpha: 1, fx: 'ripple' }).xy(LOG[0] + 18, WATER + 1, 4000, 'swim', { ease: EASE.move })
    s.xy(LOG[0], LOG[1] - 4, 900, 'walk', { ease: EASE.stop }).wait(r.range(5000, 8000), 'idle').wait(1600, 'stretch').wait(r.range(3000, 5000), 'idle')
    return s.xy(LOG[0] + 24, WATER + 3, 700, 'swim', { fx: 'splash', alpha: 0 }).wait(1600, 'swim').end()
  },
  tap: (at) => [{ to: [at.pos[0] + 14, WATER + 3], ms: 300, pose: 'swim', alpha: 0, fx: 'splash' }, { ms: 1600, pose: 'swim', end: true }],
})

// ---------- fish ----------
function leap(s: ReturnType<typeof story>, x: number, r: Rng, h = 30) {
  s.xy(x, WATER + 2, 50, 'idle', { rot: -55, alpha: 0 }).wait(900, 'idle', { fx: 'ripple' })
  s.xy(x + 30, WATER + 2, r.range(800, 1000), 'idle', { hop: h + r.range(0, 12), rot: 55, alpha: 1, ease: EASE.lin })
  return s.wait(250, 'idle', { alpha: 0, fx: 'splash' })
}
const fish = simple({
  k: 1.6,
  hit: [-12, -8, 26, 12],
  head: [0, 0],
  draw: (a) => <Fish ink={a.ink} />,
  story: (r) => {
    const s = story([r.range(190, 280), WATER + 2], undefined, 'idle')
    s.beats[0].alpha = 0
    leap(s, s.x, r).wait(r.range(3000, 6000), 'idle')
    if (chance(r, 0.7)) leap(s, r.range(190, 300), r).wait(2000, 'idle')
    return s.end()
  },
  tap: (at, r) => {
    const s = story(at.pos, undefined, 'idle')
    leap(s, at.pos[0] - 30, r, 46)
    return s.beats.slice(1)
  },
})

// ---------- the frog and its fly (silent) ----------
const FROG: P = [302, 540]
function FrogFly({ seed, ctx, onDone }: VisitProps) {
  const beats = useMemo(() => {
    const r = rng(seed)
    const s = story([FROG[0] + 120, FROG[1] - 80], undefined, 'fly')
    for (let i = 0; i < int(r, 5, 7); i++) s.xy(FROG[0] + r.range(-30, 60), FROG[1] - r.range(10, 50), r.range(500, 900), 'fly', { ease: EASE.move })
    s.xy(FROG[0] + 16, FROG[1] - 12, 400, 'fly', { ease: EASE.stop }).wait(500, 'rest', { call: 'snap' })
    return s.wait(200, 'rest', { alpha: 0 }).wait(900, 'rest').end()
  }, [seed])
  const [snap, setSnap] = useState(0)
  return (
    <g>
      <Actor beats={beats} k={2.4} hit={[-5, -5, 10, 8]} still={ctx.still} onDone={onDone} onCall={(n) => n === 'snap' && setSnap(Date.now())}
        tap={(at) => [{ to: [at.pos[0] + 60, at.pos[1] - 120], ms: 700, pose: 'fly', ease: EASE.dart, alpha: 0, end: true }]} art={() => <Fly ink={ctx.pal.c.ink} />} />
      {snap > 0 && (
        <g key={snap} transform={`translate(${FROG[0]},${FROG[1] + 8})`}>
          <path d="M0,-1 Q8,-12 16,-20" pathLength={1} className="st-draw" style={{ ['--d' as string]: '.18s' }} stroke="#e8788a" strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

// ---------- dragonfly and damselfly ----------
const dragonfly = simple({
  k: 1.5,
  hit: [-12, -8, 24, 12],
  head: [8, -4],
  draw: (a) => <Dragonfly s={a.s} ink={a.ink} />,
  story: (r) => {
    const dir = r.sign()
    const s = story([dir > 0 ? -40 : 460, 500], undefined, 'fly')
    for (let i = 0; i < int(r, 4, 6); i++) s.xy(PCX + r.range(-90, 90), WATER - r.range(14, 50), r.range(300, 450), 'fly', { ease: EASE.dart }).wait(r.range(600, 1600), 'hover')
    const reed = reedTop(int(r, 0, 7))
    s.xy(reed[0], reed[1] - 2, 500, 'fly', { ease: EASE.stop }).wait(r.range(2500, 4000), 'rest')
    for (let i = 0; i < 2; i++) s.xy(PCX + r.range(-90, 90), WATER - r.range(14, 50), r.range(300, 450), 'fly', { ease: EASE.dart }).wait(r.range(600, 1200), 'hover')
    return s.xy(dir > 0 ? 520 : -60, 470, 700, 'fly', { ease: EASE.start }).end()
  },
  tap: (at) => [{ to: [at.pos[0], at.pos[1] - 260], ms: 500, pose: 'fly', ease: EASE.start, end: true }],
})
const damselfly = simple({
  k: 2.2,
  hit: [-12, -6, 18, 8],
  head: [5, -3],
  draw: (a) => <Damselfly ink={a.ink} color={a.s('#3aa0d8')} />,
  story: (r) => {
    const s = story([r.next() < 0.5 ? 120 : 400, 500], undefined, 'fly')
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < 3; i++) s.xy(PCX + r.range(-110, 60), WATER - r.range(20, 60), r.range(1000, 1500), 'fly', { ease: EASE.move })
      const reed = reedTop(int(r, 0, 7))
      s.xy(reed[0], reed[1], 900, 'fly', { ease: EASE.stop }).wait(r.range(2400, 3600), 'rest').wait(700, 'nod')
    }
    return s.xy(-60, 470, 2400, 'fly').end()
  },
  tap: (at) => ring(at.pos[0], at.pos[1] - 18, 18, 14, 5, Math.PI / 2, 1).map((p) => ({ to: p, ms: 260, pose: 'fly' } as Beat)).concat([{ to: at.pos, ms: 400, pose: 'rest' }]),
})

// ---------- sky ----------
function Swallows({ seed, ctx, onDone }: VisitProps) {
  const birds = useMemo(() => {
    const r = rng(seed)
    const dir = r.sign()
    const n = int(r, 3, 4)
    return Array.from({ length: n }, (_, i) => {
      const s = story([dir > 0 ? -40 - i * 50 : W + 40 + i * 50, r.range(140, 240)], undefined, 'fly')
      s.beats[0].ms = i * 400
      // swoops: high, low over the meadow catching insects, a tight turn, and away
      const steps = int(r, 6, 8)
      for (let k = 1; k <= steps; k++) {
        const x = (dir > 0 ? 0 : W) + dir * (W * k) / (steps + 1) + r.range(-40, 40)
        const low = k % 2 === 0
        s.xy(x, low ? r.range(400, 450) : r.range(160, 260), r.range(700, 1000), low ? 'glide' : 'fly', { ease: EASE.move })
      }
      return s.xy(dir > 0 ? W + 60 : -60, r.range(120, 200), 900, 'fly').end()
    })
  }, [seed])
  const g = useGroup(birds.length, onDone)
  return (
    <g>
      {birds.map((b, i) => (
        <Actor key={i} beats={b} k={1.3} hit={[-11, -6, 22, 10]} still={ctx.still} cue={g.cue} onTap={g.poke} onDone={g.done} vars={{ ['--flap' as string]: '.16s' }}
          tap={(at) => [{ to: [at.pos[0] + (i - 1.5) * 80, -60], ms: 1400, pose: 'fly', ease: EASE.start, end: true }]} art={() => <Swallow ink={ctx.pal.c.ink} />} />
      ))}
    </g>
  )
}

function Geese({ seed, ctx, onDone }: VisitProps) {
  const flock = useMemo(() => {
    const r = rng(seed)
    const dir = r.sign()
    const y = r.range(120, 180)
    const lagger = int(r, 1, 4)
    const segs = 5
    const T = r.range(32000, 42000)
    return Array.from({ length: 5 }, (_, i) => {
      const row = Math.ceil(i / 2)
      const side = i % 2 ? -1 : 1
      const b: Beat[] = []
      for (let k = 0; k <= segs; k++) {
        const lag = i === lagger ? Math.max(0, 1 - k / 3) * 40 : 0
        const x = (dir > 0 ? -80 : W + 80) + (dir * (W + 160) * k) / segs - dir * (row * 16 + lag)
        b.push({ to: [x, y + side * row * 9 - k * 6], ms: k === 0 ? 0 : T / segs, pose: lag > 10 ? 'fly' : k % 2 ? 'glide' : 'fly', ease: EASE.lin })
      }
      b[b.length - 1].end = true
      return b
    })
  }, [seed])
  const g = useGroup(5, onDone)
  return (
    <g>
      {flock.map((b, i) => (
        <Actor key={i} beats={b} k={1.4} hit={[-6, -6, 12, 12]} still={ctx.still} cue={g.cue} onTap={g.poke} onDone={g.done} vars={{ ['--flap' as string]: '.3s' }}
          tap={(at) => [{ to: [at.pos[0], at.pos[1] - 20], ms: 900, pose: 'fly' }, { to: [at.pos[0] + at.face * 40, at.pos[1]], ms: 1400, pose: 'glide' }]} art={() => <Goose ink={ctx.pal.c.ink} />} />
      ))}
    </g>
  )
}

const eagle = simple({
  k: 1.4,
  hit: [-18, -6, 36, 10],
  head: [0, -4],
  vars: { ['--flap' as string]: '.5s' },
  draw: (a) => <Eagle ink={a.ink} />,
  story: (r) => {
    const dir = r.sign()
    const cx = r.range(350, 650)
    const cy = r.range(110, 160)
    const s = story([dir > 0 ? -60 : W + 60, cy + 40], undefined, 'glide')
    s.xy(cx - 120 * dir, cy, 5000, 'glide', { ease: EASE.lin })
    for (const p of ring(cx, cy, 120, 36, 10, dir > 0 ? Math.PI : 0, 2)) s.xy(p[0], p[1], 1400, 'glide', { ease: EASE.lin })
    s.wait(1, 'fly').xy(cx + 200 * dir, cy - 20, 2400, 'fly')
    return s.xy(dir > 0 ? W + 60 : -60, cy - 40, 5000, 'glide', { ease: EASE.lin }).end()
  },
  tap: (at) => [
    { to: [at.pos[0] + at.face * 60, at.pos[1] + 120], ms: 900, pose: 'glide', ease: EASE.start },
    { to: [at.pos[0] + at.face * 140, at.pos[1] + 10], ms: 1200, pose: 'fly', ease: EASE.stop },
  ],
})

const bat = simple({
  k: 1.5,
  hit: [-10, -5, 20, 8],
  head: [0, -3],
  vars: { ['--flap' as string]: '.12s' },
  draw: (a) => <Bat ink={a.ink} />,
  story: (r) => {
    const dir = r.sign()
    const s = story([dir > 0 ? -40 : W + 40, r.range(200, 300)], undefined, 'fly')
    const n = int(r, 10, 14)
    for (let i = 1; i <= n; i++) {
      const x = (dir > 0 ? 0 : W) + (dir * W * i) / (n + 1)
      s.xy(x + r.range(-50, 50), r.range(170, 340), r.range(300, 500), 'fly', { ease: EASE.dart })
      if (i === Math.floor(n / 2)) for (const p of ring(s.x, s.y - 30, 30, 30, 5, Math.PI / 2, 1)) s.xy(p[0], p[1], 220, 'fly', { ease: EASE.lin })
    }
    return s.xy(dir > 0 ? W + 40 : -40, r.range(180, 260), 500, 'fly').end()
  },
  tap: (at) => ring(at.pos[0], at.pos[1] - 30, 28, 30, 6, Math.PI / 2, 1).map((p) => ({ to: p, ms: 200, pose: 'fly' } as Beat)),
})

// ---------- far hills ----------
const farY = (x: number) => yAt(LINES.far, x) + 2
const midY = (x: number) => yAt(LINES.mid, x) + 6

/** A small herd grazing on the far hill. */
function Herd({ seed, ctx, onDone, kinds, x0, react }: VisitProps & { kinds: Herd[]; x0: [number, number]; react: (at: TapAt, i: number) => Beat[] }) {
  const herd = useMemo(() => {
    const r = rng(seed)
    const x = r.range(x0[0], x0[1])
    const dir = r.sign()
    const T = r.range(38000, 52000)
    return kinds.map((kind, i) => {
      const hx = x + i * r.range(14, 20) - kinds.length * 8
      const s = story([hx - dir * 30, farY(hx - dir * 30)], farY, 'walk')
      s.beats[0].alpha = 0
      s.go(hx, 8, 'walk', { alpha: 1 })
      while (dur(s.beats) < T - 9000) {
        s.wait(r.range(3000, 7000), 'eat')
        if (kind === 'lamb' && chance(r, 0.6)) s.hops(s.x + r.sign() * 12, 3, 320, 4)
        else if (kind === 'cow' && chance(r, 0.3)) s.wait(1500, 'idle', { sy: 0.62 }).wait(r.range(4000, 7000), 'idle').wait(1500, 'idle', { sy: 1 })
        else if (kind === 'donkey' && chance(r, 0.4)) s.wait(900, 'idle', { sy: 0.6 }).wait(1200, 'idle', { rot: 170, fx: 'dust' }).wait(1200, 'idle', { rot: 0 }).wait(900, 'shake', { sy: 1 })
        else s.wait(r.range(1200, 2400), r.pick(['look', 'swish', 'ears', 'idle']))
        s.go(s.x + r.sign() * r.range(6, 16), 6, 'walk')
      }
      return [...padTo(s.beats, T), { to: [s.x + dir * 60, farY(s.x + dir * 60)] as P, ms: 7000, pose: 'walk', alpha: 0, end: true } as Beat]
    })
  }, [seed]) // eslint-disable-line react-hooks/exhaustive-deps
  const g = useGroup(herd.length, onDone)
  return (
    <g>
      {herd.map((b, i) => (
        <Actor key={i} beats={b} k={0.95} hit={[-8, -10, 18, 12]} still={ctx.still} cue={g.cue} onTap={g.poke} onDone={g.done} vars={{ ['--walk' as string]: '.6s', ['--eat' as string]: '40deg' }}
          tap={(at) => react(at, i)} art={() => <FarHerdAnimal kind={kinds[i]} ink={ctx.pal.c.ink} />} />
      ))}
    </g>
  )
}
const Sheep = (p: VisitProps) => <Herd {...p} kinds={['sheep', 'sheep', 'lamb', 'sheep']} x0={[120, 240]} react={(_at, i) => (i === 2 ? [{ ms: 900, pose: 'hop', hop: 8, hops: 2 }] : [{ ms: 1400, pose: 'alert' }])} />
const Goats = (p: VisitProps) => <Herd {...p} kinds={['goat', 'goat']} x0={[290, 340]} react={(at, i) => [{ ms: 300, pose: 'crouch' }, { to: [at.pos[0] + (i ? -6 : 6), at.pos[1]], ms: 500, pose: 'hop', hop: 10 }, { ms: 800, pose: 'idle' }]} />
const Cows = (p: VisitProps) => <Herd {...p} kinds={['cow', 'cow']} x0={[800, 850]} react={() => [{ ms: 900, pose: 'alert' }, { ms: 1800, pose: 'swish' }]} />
const Donkey = (p: VisitProps) => <Herd {...p} kinds={['donkey']} x0={[880, 930]} react={() => [{ ms: 300, pose: 'crouch' }, { ms: 1400, pose: 'buck', fx: 'dust' }, { ms: 600, pose: 'ears' }]} />

function Camels({ seed, ctx, onDone }: VisitProps) {
  const line = useMemo(() => {
    const r = rng(seed)
    const dir = r.sign()
    const y = (x: number) => yAt(LINES.farBack, x) + 1
    const [a, b] = dir > 0 ? [360, 680] : [680, 360]
    const stop = a + (b - a) * r.range(0.4, 0.6)
    const n = int(r, 2, 3)
    return Array.from({ length: n }, (_, i) => {
      const s = story([a - dir * i * 20, y(a - dir * i * 20)], y, 'plod')
      s.beats[0].alpha = 0
      s.wait(2500, 'plod', { alpha: 1 }).go(stop - dir * i * 20, 9, 'plod')
      s.wait(r.range(2500, 3500), 'idle')
      if (i === n - 1) s.wait(1500, 'idle', { sy: 0.6 }).wait(r.range(4000, 6000), 'idle').wait(1500, 'idle', { sy: 1 })
      else s.wait(8500, 'look')
      return s.go(b - dir * i * 20, 9, 'plod').wait(2500, 'plod', { alpha: 0 }).end()
    })
  }, [seed])
  const g = useGroup(line.length, onDone)
  return (
    <g>
      {line.map((b, i) => (
        <Actor key={i} beats={b} k={0.8} hit={[-10, -14, 22, 16]} still={ctx.still} cue={g.cue} onTap={g.poke} onDone={g.done} vars={{ ['--plod' as string]: '1.1s' }}
          tap={() => [{ ms: 1500, pose: 'look' }]} art={() => <FarHerdAnimal kind="camel" ink={ctx.pal.c.ink} />} />
      ))}
    </g>
  )
}

function Horses({ seed, ctx, onDone }: VisitProps) {
  const pair = useMemo(() => {
    const r = rng(seed)
    const dir = r.sign()
    const graze = W * (dir > 0 ? r.range(0.3, 0.45) : r.range(0.55, 0.7))
    return [0, 1].map((i) => {
      const off = i ? -dir * 34 : 0
      const s = story([(dir > 0 ? -90 : W + 90) + off, midY((dir > 0 ? -90 : W + 90) + off)], midY, 'run')
      // gallop in, slow to a trot and a walk, graze; the foal frisks about; then canter away
      s.go(graze - dir * 160 + off, 170, 'run').go(graze - dir * 50 + off, 80, 'trot').go(graze + off, 30, 'walk')
      for (let k = 0; k < 3; k++) {
        s.wait(r.range(3000, 5000), 'eat')
        if (i === 1 && k !== 1) s.wait(1400, 'buck').hops(s.x + r.sign() * 24, 3, 300, 8)
        else s.wait(r.range(1200, 2000), r.pick(['swish', 'look', 'idle']))
      }
      return s.go((dir > 0 ? W + 100 : -100) + off, 150, 'run').end()
    })
  }, [seed])
  const g = useGroup(2, onDone)
  return (
    <g>
      {pair.map((b, i) => (
        <Actor key={i} beats={b} k={i ? 0.27 : 0.42} hit={[-60, -110, 130, 112]} shadow={30} still={ctx.still} onDone={g.done}
          vars={{ ['--walk' as string]: '.7s', ['--trot' as string]: '.36s', ['--run' as string]: '.2s', ['--eat' as string]: '80deg' }}
          tap={() => (i ? [{ ms: 1400, pose: 'buck' }] : [{ ms: 1600, pose: 'rear' }, { ms: 500, pose: 'idle' }])}
          art={(l) => <Horse s={ctx.pal.shade} ink={ctx.pal.c.ink} coat={i ? '#b98a5e' : '#8a5a36'} pose={l.pose} />} />
      ))}
    </g>
  )
}

function Elephants({ seed, ctx, onDone }: VisitProps) {
  const fam = useMemo(() => {
    const r = rng(seed)
    const dir = r.sign()
    const stop = W * r.range(0.35, 0.65)
    const members = [0.3, 0.17, 0.28]
    return members.map((_, i) => {
      const off = -dir * [0, 34, 70][i]
      const start = (dir > 0 ? -120 : W + 120) + off
      const s = story([start, farY(start) + 2], (x) => farY(x) + 2, 'plod')
      s.go(stop + off, 18, 'plod')
      if (i === 0) s.wait(2600, 'spray').wait(r.range(1500, 2500), 'eat').wait(2400, 'trumpet')
      else if (i === 1) s.hops(stop + off + dir * 26, 3, 500, 4).wait(2000, 'eat').go(stop + off, 20, 'trot').wait(3500, 'idle')
      else s.wait(r.range(6500, 8000), 'eat')
      return s.go((dir > 0 ? W + 140 : -140) + off, 18, 'plod').end()
    })
  }, [seed])
  const g = useGroup(3, onDone)
  return (
    <g>
      {fam.map((b, i) => (
        <Actor key={i} beats={b} k={[0.3, 0.17, 0.28][i]} hit={[-60, -95, 140, 96]} shadow={40} still={ctx.still} cue={g.cue} onTap={g.poke} onDone={g.done}
          vars={{ ['--plod' as string]: '1.2s', ['--trot' as string]: '.5s', ['--eat' as string]: '12deg' }}
          tap={() => [{ ms: 2200, pose: 'trumpet' }]} art={(l) => <Elephant s={ctx.pal.shade} ink={ctx.pal.c.ink} pose={l.pose} />} />
      ))}
    </g>
  )
}

function Chase({ seed, ctx, onDone }: VisitProps) {
  const pair = useMemo(() => {
    const r = rng(seed)
    const dir = r.sign()
    const start = dir > 0 ? -60 : W + 60
    const hide = W * (dir > 0 ? r.range(0.55, 0.7) : r.range(0.3, 0.45))
    const rab = story([start, midY(start)], midY, 'hop')
    let x = start
    while ((hide - x) * dir > 30) {
      x += dir * r.range(40, 70)
      rab.xy(x, midY(x) + (chance(r, 0.5) ? 4 : -4), 260, 'hop', { hop: 9, ease: EASE.lin })
    }
    rab.wait(300, 'hop', { alpha: 0, sc: 0.5 })
    const fox = story([start - dir * 50, midY(start - dir * 50)], midY, 'run')
    fox.wait(700, 'run').go(hide - dir * 20, 220, 'run').wait(900, 'sniff').wait(1800, 'sit', { fx: 'question' }).wait(900, 'look')
    fox.go(start, 110, 'trot')
    return [rab.end(), fox.end()]
  }, [seed])
  const g = useGroup(2, onDone)
  return (
    <g>
      <Actor beats={pair[0]} k={0.5} hit={[-18, -48, 42, 50]} still={ctx.still} onDone={g.done} tap={() => [{ ms: 400, pose: 'hop', hop: 20 }]}
        art={(l) => <Rabbit s={ctx.pal.shade} ink={ctx.pal.c.ink} pose={l.pose} />} />
      <Actor beats={pair[1]} k={0.5} hit={[-40, -46, 88, 48]} head={[38, -44]} still={ctx.still} onDone={g.done} vars={{ ['--run' as string]: '.16s', ['--trot' as string]: '.3s' }}
        tap={() => [{ ms: 600, pose: 'alert', hop: 14 }]} art={(l) => <Fox s={ctx.pal.shade} ink={ctx.pal.c.ink} pose={l.pose} />} />
    </g>
  )
}

/** Monkeys come to play in the grove: one swings from the vine and flips, one scratches on a treetop and leaps across. */
function Monkeys({ seed, ctx, onDone }: VisitProps) {
  const troupe = useMemo(() => {
    const r = rng(seed)
    const [t1, t2, t3] = GROVE
    const top2: P = [t2.x + 6, t2.base - t2.h - 14]
    const top3: P = [t3.x, t3.base - t3.h - 10]
    const swinger = story([VINE[0], VINE[1] + 6], undefined, 'swing')
    swinger.beats[0].alpha = 0
    swinger.wait(1500, 'swing', { alpha: 1 }).wait(r.range(5000, 8000), 'swing')
    if (chance(r, 0.6)) swinger.wait(1200, 'flip').wait(r.range(3000, 5000), 'swing')
    swinger.xy(t1.x, t1.base - t1.h + 4, 900, 'hop', { hop: 14 }).wait(r.range(2500, 4000), 'scratch').wait(1500, 'look')
    swinger.xy(t1.x - 10, t1.base - t1.h + 20, 900, 'idle', { alpha: 0 })
    const sitter = story(top2, undefined, 'scratch')
    sitter.beats[0].alpha = 0
    sitter.wait(1500, 'scratch', { alpha: 1 }).wait(r.range(4000, 6000), 'scratch').wait(1600, 'look')
    sitter.xy(top3[0], top3[1], 900, 'hop', { hop: 20 }).wait(r.range(3000, 5000), 'scratch')
    sitter.xy(top2[0], top2[1], 900, 'hop', { hop: 20, face: -1 }).wait(r.range(3000, 4000), 'look').wait(1000, 'idle', { alpha: 0 })
    const T = Math.max(dur(swinger.beats), dur(sitter.beats))
    return [padTo(swinger.beats, T), padTo(sitter.beats, T)].map((b) => [...b, { ms: 50, end: true } as Beat])
  }, [seed])
  const g = useGroup(2, onDone)
  return (
    <g>
      {troupe.map((b, i) => (
        <Actor key={i} beats={b} k={i ? 0.9 : 1} hit={[-10, -18, 20, 36]} still={ctx.still} cue={g.cue} onTap={g.poke} onDone={g.done}
          tap={(at) => (i ? [{ ms: 600, pose: 'hop', hop: 12 }, { ms: 800, pose: 'scratch' }] : at.pose === 'swing' ? [{ ms: 1200, pose: 'flip' }] : [{ ms: 600, pose: 'hop', hop: 10 }])}
          art={(l) => <Monkey s={ctx.pal.shade} ink={ctx.pal.c.ink} pose={l.pose} />} />
      ))}
    </g>
  )
}

export const WILD: Record<string, Species> = {
  duck: { name: 'duck', icon: '🦆', slot: 'pond', layer: 'pond', min: 0.55, when: 'day', weight: 1.3, Comp: Ducks, tale: 'A mother duck paddles out of the reeds with her ducklings in a line; she dabbles tail-up and they hurry after. Tap her: she nods and the ducklings flap.' },
  duckling: { name: 'duckling', icon: '🐥', slot: 'pond', layer: 'pond', min: 0.55, when: 'day', weight: 0.01, Comp: Ducks, tale: 'Ducklings follow their mother in a wobbly line, flapping their tiny wings. Tap one: it scoots to catch up.' },
  swan: { name: 'swan', icon: '🦢', slot: 'pond', layer: 'pond', min: 0.75, when: 'day', Comp: swan, tale: 'Glides slowly across, preens, sometimes lifts its wings. Tap: arches its wings grandly.' },
  heron: { name: 'heron', icon: '🪶', slot: 'pond', layer: 'pond', min: 0.75, when: 'day', Comp: heron, tale: 'Flies in on slow wings, stands perfectly still, takes one careful step, strikes at a fish. Tap: lifts off slowly and leaves.' },
  kingfisher: { name: 'kingfisher', icon: '🔵', slot: 'pond', layer: 'pond', min: 0.55, when: 'day', Comp: kingfisher, tale: 'Darts onto a reed, bobs, dives with a splash and comes back with a fish. Tap: dives and streaks off low over the water.' },
  turtle: { name: 'turtle', icon: '🐢', slot: 'pond', layer: 'pond', min: 0.75, when: 'day', Comp: turtle, tale: 'Surfaces, paddles to a log, climbs out to bask and stretch, slides back in. Tap: plops into the water.' },
  fish: { name: 'fish', icon: '🐟', slot: 'pond', layer: 'pond', min: 0.55, when: 'day', Comp: fish, tale: 'A ripple, then a fish leaps out in an arc and splashes back, maybe twice. Tap: a higher leap.' },
  frog: { name: 'frog', icon: '🐸', slot: 'pond', layer: 'pond', min: 0.4, when: 'day', Comp: FrogFly, tale: 'A (silent) fly loops round the frog on the bank until its tongue flicks out and snaps it up. Tap the fly: it escapes. Tap the frog: it jumps in.' },
  dragonfly: { name: 'dragonfly', icon: '🪽', slot: 'pond', layer: 'pond', min: 0.6, when: 'day', Comp: dragonfly, tale: 'Darts in straight dashes and hovers over the water, perches on a reed tip, darts off. Tap: zips straight up and away.' },
  damselfly: { name: 'damselfly', icon: '💠', slot: 'pond', layer: 'pond', min: 0.65, when: 'day', Comp: damselfly, tale: 'Flutters daintily between the reeds and rests with its wings folded. Tap: a little loop and back to its reed.' },
  swallow: { name: 'swallow', icon: '🐦', slot: 'sky', layer: 'sky', min: 0.5, when: 'day', weight: 1.4, Comp: Swallows, tale: 'A few swallows sweep in, swooping low over the meadow and up again, then away. Tap: they scatter up into the sky.' },
  goose: { name: 'goose', icon: '🪿', slot: 'sky', layer: 'sky', min: 0.7, when: 'day', Comp: Geese, tale: 'A V of geese crosses the sky; one lags behind and catches up. Tap: they lift and shuffle the V.' },
  eagle: { name: 'eagle', icon: '🦅', slot: 'sky', layer: 'sky', min: 0.85, when: 'day', Comp: eagle, tale: 'Soars in, circles twice on still wings, a few flaps, glides away. Tap: a steep dive and swoop back up.' },
  bat: { name: 'bat', icon: '🦇', slot: 'sky', layer: 'sky', min: 0.3, when: 'night', Comp: bat, tale: 'Flits across the night sky in zig-zags, with one loop after a moth. Tap: a loop-the-loop.' },
  sheep: { name: 'sheep', icon: '🐑', slot: 'far', layer: 'far', min: 0.6, when: 'day', Comp: Sheep, tale: 'A few sheep and a lamb come over the far hill to graze; the lamb skips about. Tap: heads up all together, the lamb bounces.' },
  goat: { name: 'goat', icon: '🐐', slot: 'far', layer: 'far', min: 0.6, when: 'day', Comp: Goats, tale: 'Two goats graze and wander on the hill. Tap: they crouch and hop at each other.' },
  cow: { name: 'cow', icon: '🐄', slot: 'far', layer: 'far', min: 0.8, when: 'day', Comp: Cows, tale: 'Two cows graze, swish their tails, and one lies down for a rest. Tap: they look up, tails swishing.' },
  donkey: { name: 'donkey', icon: '🫏', slot: 'far', layer: 'far', min: 0.8, when: 'day', Comp: Donkey, tale: 'A donkey grazes, flicks its long ears and rolls in the dust. Tap: kicks up its heels.' },
  camel: { name: 'camel', icon: '🐪', slot: 'far', layer: 'far', min: 0.8, when: 'day', Comp: Camels, tale: 'A little caravan plods along the farthest hill; one kneels for a rest. Tap: they stop and look.' },
  horse: { name: 'horse', icon: '🐎', slot: 'far', layer: 'far', min: 0.85, when: 'day', Comp: Horses, tale: 'A mare and foal gallop in, slow to a walk and graze, the foal bucks and frisks, then they canter off. Tap: the mare rears.' },
  elephant: { name: 'elephant', icon: '🐘', slot: 'far', layer: 'far', min: 0.85, when: 'day', Comp: Elephants, tale: 'An elephant family plods by; the mother sprays water and trumpets, the calf trots ahead and back. Tap: a trumpet.' },
  chase: { name: 'a chase', icon: '🏃', slot: 'far', layer: 'far', min: 0.85, when: 'day', Comp: Chase, tale: 'Far away a rabbit zig-zags with a fox behind; the rabbit vanishes into the grass and the fox sits, puzzled.' },
  monkey: { name: 'monkey', icon: '🐒', slot: 'far', layer: 'far', min: 0.8, when: 'day', Comp: Monkeys, tale: 'Monkeys arrive in the grove: one swings by its tail and flips, one scratches on a treetop and leaps across. Tap: a flip or a hop.' },
}

