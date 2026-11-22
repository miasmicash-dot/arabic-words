// Stories for the animals that come along the path (one at a time): each has its own beats and its own tap reaction.
import { useState } from 'react'
import { EASE, onPath, story, type Beat } from './actor'
import { Badger, Deer, Ferret, Fox, Hedgehog, Horse, NovaWalk, Rabbit, Skunk, Squirrel } from './Creatures'
import { APPLES_AT, Nova } from './Critters'
import { BURROW_X, SquirrelAct } from './Eggs'
import { LINES, yAt } from './Landscape'
import { chance, int, offEdge, simple, type Species, type VisitProps } from './kit'

const burrowAt = (): [number, number] => [BURROW_X, yAt(LINES.near, BURROW_X) + 16]

// ---------- rabbit ----------
const rabbit = simple({
  k: 0.95,
  hit: [-18, -48, 42, 50],
  head: [18, -46],
  shadow: 16,
  draw: (a) => <Rabbit s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const fromBurrow = c.burrow && chance(r, 0.4)
    const [bx, by] = burrowAt()
    const s = fromBurrow ? story([bx, by], onPath, 'alert') : story([offEdge(c, dir), onPath(offEdge(c, dir))], onPath, 'hop')
    if (fromBurrow) {
      // pops up out of the burrow, has a careful look, then hops down to the path
      s.beats[0] = { to: [bx, by], ms: 0, pose: 'alert', sc: 0.3, alpha: 0 }
      s.wait(900, 'alert', { sc: 1, alpha: 1, ease: EASE.stop }).wait(1300, 'ears').wait(1500, 'look')
      s.xy(bx + dir * 24, by + 14, 420, 'hop', { hop: 12 }).xy(bx + dir * 50, onPath(bx + dir * 50), 420, 'hop', { hop: 12 })
    }
    // a few bursts of hopping with pauses between
    const bursts = int(r, 2, 3)
    for (let b = 0; b < bursts; b++) {
      const reach = b === 0 && !fromBurrow ? (c.view.x1 - c.view.x0) * r.range(0.25, 0.4) : r.range(70, 150)
      const nx = Math.max(c.view.x0 + 60, Math.min(c.view.x1 - 60, s.x + dir * reach))
      s.hops(nx, int(r, 2, 4), r.range(330, 420), r.range(10, 16))
      s.wait(r.range(500, 1400), r.pick(['sniff', 'alert', 'ears', 'look']))
    }
    // finds clover and nibbles; ears twitch; sometimes sits up or thumps
    s.wait(r.range(1800, 2600), 'eat').wait(900, 'ears')
    if (chance(r, 0.6)) s.wait(r.range(1000, 1800), 'sit')
    s.wait(r.range(1400, 2200), 'eat')
    if (chance(r, 0.4)) s.wait(1300, 'thump', { fx: 'dust' }).wait(700, 'alert')
    if (c.burrow && chance(r, 0.5)) {
      // home to the burrow and ducks inside
      s.xy(bx - dir * 40, by + 10, 900, 'hop', { hop: 14, hops: 2, ease: EASE.lin })
      s.xy(bx, by, 450, 'hop', { hop: 10 })
      return s.wait(500, 'ears').wait(500, 'hop', { sc: 0.3, alpha: 0, ease: EASE.start }).end()
    }
    return s.hops(offEdge(c, chance(r, 0.75) ? -dir : dir), int(r, 5, 7), 300, 22).end()
  },
  tap: (at, r, c) => {
    const [bx, by] = burrowAt()
    const out: Beat[] = [{ ms: 500, pose: 'alert', fx: 'alarm' }, { ms: 1200, pose: 'thump', fx: 'dust' }]
    if (c.burrow && Math.abs(at.pos[0] - bx) < 220) {
      out.push({ to: [bx, by], ms: 700, pose: 'hop', hop: 18, ease: EASE.lin }, { ms: 300, pose: 'hop', sc: 0.3, alpha: 0, end: true })
      return out
    }
    // bounds away in big zig-zag leaps
    const dir = at.face
    let x = at.pos[0]
    for (let i = 0; i < 6; i++) {
      x += dir * r.range(70, 100)
      out.push({ to: [x, onPath(x) + (i % 2 ? 6 : -6)], ms: 280, pose: 'hop', hop: 26, ease: EASE.lin })
    }
    out[out.length - 1].end = true
    return out
  },
})

// ---------- hedgehog ----------
const hedgehog = simple({
  k: 0.9,
  hit: [-20, -26, 48, 28],
  head: [22, -14],
  shadow: 16,
  vars: { ['--walk' as string]: '.26s' },
  draw: (a) => <Hedgehog s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir), onPath(offEdge(c, dir))], onPath, 'walk')
    // snuffles along in short stretches, nose to the ground
    const stops = int(r, 3, 4)
    const span = c.view.x1 - c.view.x0
    for (let i = 0; i < stops; i++) {
      s.go(s.x + dir * (i === 0 ? r.range(0.28, 0.36) : r.range(0.12, 0.18)) * span, r.range(28, 40))
      s.wait(r.range(900, 1700), 'sniff')
      if (i === 1) s.wait(600, 'dig', { fx: 'dirt' }).wait(2600, 'eat').wait(800, 'sniff') // a beetle under the leaves
      else if (chance(r, 0.35)) s.wait(1400, 'look')
    }
    return s.go(offEdge(c, -dir), 40).end()
  },
  tap: () => [
    { ms: 350, pose: 'curl', sc: 0.95, ease: EASE.dart },
    { ms: 700, pose: 'curl', rot: -9 },
    { ms: 700, pose: 'curl', rot: 7 },
    { ms: 600, pose: 'curl', rot: 0 },
    { ms: 1000, pose: 'ball' },
    { ms: 500, pose: 'sniff', sc: 1 },
  ],
})

// ---------- Nova (the user's own cat, a dilute calico) ----------
const SITS = new Set(['sit', 'groom', 'look', 'blink'])
const nova = simple({
  k: 0.85,
  hit: [-24, -48, 56, 50],
  head: [24, -40],
  shadow: 18,
  vars: { ['--walk' as string]: '.55s' },
  draw: (a) => (SITS.has(a.pose) ? <g transform="scale(0.95)"><Nova s={a.s} ink={a.ink} pose={a.pose} /></g> : <NovaWalk s={a.s} ink={a.ink} pose={a.pose} />),
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir), onPath(offEdge(c, dir))], onPath, 'walk')
    const span = c.view.x1 - c.view.x0
    const acts = ['groom', 'chase', 'sit', 'stretch'].sort(() => r.next() - 0.5).slice(0, int(r, 2, 3))
    acts.forEach((a, i) => {
      s.go(s.x + dir * (i === 0 ? r.range(0.3, 0.42) : r.range(0.14, 0.22)) * span, r.range(40, 55))
      if (a === 'groom') s.wait(700, 'sit').wait(r.range(2800, 4200), 'groom').wait(900, 'blink').wait(1200, 'look')
      if (a === 'sit') s.wait(r.range(2000, 3000), 'sit').wait(2600, 'look').wait(1100, 'blink')
      if (a === 'stretch') s.wait(1700, 'stretch').wait(600, 'idle')
      if (a === 'chase') {
        // a butterfly flits past: she crouches, wiggles, pounces... and misses
        s.wait(900, 'crouch', { fx: 'butterfly' }).wait(r.range(700, 1100), 'wiggle')
        s.xy(s.x + dir * r.range(45, 70), onPath(s.x + dir * 55), 560, 'hop', { hop: r.range(22, 34) })
        s.wait(900, 'sit', { fx: chance(r, 0.5) ? 'question' : undefined }).wait(1600, 'look')
      }
    })
    return s.go(offEdge(c, -dir), 50).end()
  },
  tap: (at) =>
    at.n % 2
      ? [{ ms: 500, pose: 'sit' }, { ms: 1100, pose: 'blink', fx: 'hearts' }, { ms: 2600, pose: 'groom' }, { ms: 800, pose: 'look' }]
      : [{ ms: 1700, pose: 'stretch', fx: 'heart' }, { ms: 500, pose: 'sit' }, { ms: 1300, pose: 'blink', fx: 'hearts' }],
})

// ---------- fox ----------
const fox = simple({
  k: 0.95,
  hit: [-40, -46, 88, 48],
  head: [38, -44],
  shadow: 26,
  vars: { ['--trot' as string]: '.3s', ['--run' as string]: '.16s', ['--eat' as string]: '40deg' },
  draw: (a) => <Fox s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir), onPath(offEdge(c, dir))], onPath, 'trot')
    const span = c.view.x1 - c.view.x0
    s.go(c.view.x0 + span * (dir > 0 ? r.range(0.25, 0.4) : r.range(0.6, 0.75)), r.range(110, 140), 'trot')
    // freezes, ears forward: something in the grass
    s.wait(r.range(900, 1400), 'alert').wait(800, 'sniff')
    const pounces = int(r, 1, 2)
    for (let i = 0; i < pounces; i++) {
      s.wait(500, 'crouch').wait(r.range(600, 1000), 'wiggle')
      s.xy(s.x + dir * r.range(40, 65), onPath(s.x + dir * 50), 620, 'hop', { hop: r.range(34, 46) })
      s.wait(800, 'dig', { fx: 'dirt' })
      s.wait(900, i === pounces - 1 && chance(r, 0.5) ? 'shake' : 'alert', { fx: i === pounces - 1 ? 'question' : undefined })
      if (i < pounces - 1) s.go(s.x + dir * 40, 60, 'walk')
    }
    if (chance(r, 0.5)) s.wait(2400, 'scratch').wait(800, 'sit')
    return s.go(offEdge(c, -dir), r.range(110, 140), 'trot').end()
  },
  tap: (at) => [
    { ms: 520, pose: 'alert', hop: 38, fx: 'alarm' },
    { to: [at.pos[0] + at.face * 10, at.pos[1]], ms: 200, pose: 'crouch' },
    { to: [at.face > 0 ? 1150 : -150, onPath(at.face > 0 ? 1000 : 0)], ms: 2000, pose: 'run', ease: EASE.start, end: true },
  ],
})

// ---------- squirrel (and its once-a-day nut burying) ----------
const squirrelWander = simple({
  k: 1,
  hit: [-22, -40, 44, 42],
  head: [12, -32],
  shadow: 12,
  draw: (a) => <Squirrel s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir), onPath(offEdge(c, dir))], onPath, 'hop')
    // scampers in quick bursts, freezing with a flick of the tail
    for (let i = 0; i < int(r, 2, 3); i++) {
      s.hops(s.x + dir * r.range(90, 150), int(r, 3, 5), 230, 10)
      s.wait(r.range(500, 900), r.pick(['alert', 'swish']))
    }
    s.wait(r.range(1800, 2600), 'eat').wait(1300, 'dig', { fx: 'dirt' }).wait(700, 'dig', { fx: 'dirt' }).wait(500, 'idle')
    s.wait(600, 'look', { face: (-dir) as 1 | -1 }).wait(600, 'look', { face: dir as 1 | -1 }).wait(400, 'alert')
    if (c.plant.tree) {
      // darts over to the tree and up the trunk into the leaves
      const { x, y, h } = c.plant
      s.hops(x - dir * 14, int(r, 3, 4), 220, 9)
      s.xy(x - dir * 6, y - 20, 250, 'run', { rot: -80 })
      s.xy(x - dir * 6, y - Math.min(220, h * 0.6), 1300, 'run', { rot: -80, ease: EASE.start })
      return s.wait(400, 'run', { alpha: 0 }).end()
    }
    return s.hops(offEdge(c, -dir), int(r, 5, 7), 220, 11).end()
  },
  tap: (at) => [
    { ms: 400, pose: 'alert', fx: 'angry' },
    { ms: 1300, pose: 'swish', fx: 'alarm' },
    { to: [at.face > 0 ? 1100 : -100, onPath(at.face > 0 ? 1000 : 0)], ms: 1500, pose: 'hop', hop: 12, hops: 7, ease: EASE.lin, end: true },
  ],
})
const SquirrelWander = squirrelWander
function SquirrelVisit(p: VisitProps) {
  const [daily] = useState(() => (p.ctx.still ? null : p.ctx.daily))
  if (daily) return <SquirrelAct pal={p.ctx.pal} today={daily.today} memory={daily.memory} onBury={daily.onBury} onDone={p.onDone} />
  return <SquirrelWander {...p} />
}

// ---------- deer ----------
const deerGround = (x: number) => Math.min(552, yAt(LINES.near, x) + 14 + Math.max(0, 1 - Math.abs(x - 200) / 60) * 24)
const deer = simple({
  k: 0.6,
  hit: [-36, -110, 96, 112],
  head: [39, -18],
  shadow: 30,
  vars: { ['--walk' as string]: '.8s', ['--drink' as string]: '100deg', ['--eat' as string]: '60deg' },
  draw: (a) => <Deer s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const s = story([c.view.x0 - 70, deerGround(c.view.x0 - 70)], deerGround, 'walk')
    // steps out cautiously, stopping to listen
    s.go(c.view.x0 + r.range(30, 70), 32).wait(r.range(1200, 1800), 'alert').wait(900, 'ears')
    s.go(150, 30).wait(r.range(700, 1100), 'look')
    s.go(r.range(190, 205), 26).wait(400, 'idle')
    // drinks at the pond, lifting its head now and then
    s.wait(1200, 'drink').wait(r.range(2400, 3400), 'lap', { fx: 'ripple' }).wait(900, 'lift').wait(r.range(1000, 1600), 'alert')
    if (chance(r, 0.6)) s.wait(1200, 'drink').wait(2200, 'lap', { fx: 'ripple' }).wait(900, 'lift')
    s.wait(1200, 'eat')
    return chance(r, 0.5) ? s.go(c.view.x0 - 90, 34).end() : s.go(330, 30).wait(900, 'look').go(470, 30, 'walk', { alpha: 0 }).end()
  },
  tap: (at, r, c) => {
    const out: Beat[] = [{ ms: 350, pose: 'flag', fx: 'alarm' }]
    let x = at.pos[0]
    for (let i = 0; i < 4; i++) {
      x -= r.range(80, 110)
      out.push({ to: [x, deerGround(x)], ms: 480, pose: 'flag', hop: 26, face: -1, ease: EASE.lin })
    }
    out.push({ to: [c.view.x0 - 120, deerGround(c.view.x0 - 120)], ms: 600, pose: 'flag', hop: 20, face: -1, end: true })
    return out
  },
})

// ---------- ferret ----------
const ferret = simple({
  k: 0.9,
  hit: [-40, -30, 86, 32],
  head: [34, -24],
  shadow: 22,
  vars: { ['--run' as string]: '.14s' },
  draw: (a) => <Ferret s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir), onPath(offEdge(c, dir))], onPath, 'run')
    // zig-zags in quick dashes, popping up on its hind legs to look around
    for (let i = 0; i < int(r, 4, 6); i++) {
      const nx = s.x + dir * r.range(50, 90)
      s.xy(nx, onPath(nx) + (i % 2 ? 7 : -5), r.range(280, 420), 'run', { ease: EASE.dart })
      s.wait(r.range(250, 700), r.pick(['alert', 'sniff', 'stand']))
    }
    s.wait(1800, 'dance', { fx: 'sparkle' }).wait(500, 'stand').wait(900, 'sniff')
    if (chance(r, 0.5)) s.wait(1000, 'dig', { fx: 'dirt' })
    return s.go(offEdge(c, -dir), 200, 'run').end()
  },
  tap: (at) => [
    { ms: 1800, pose: 'dance', fx: 'alarm' },
    { to: [at.pos[0] - at.face * 30, at.pos[1]], ms: 350, pose: 'hop', hop: 14, face: at.face },
    { to: at.pos, ms: 350, pose: 'hop', hop: 14, face: at.face },
    { ms: 700, pose: 'stand' },
  ],
})

// ---------- skunk ----------
const skunk = simple({
  k: 0.95,
  hit: [-38, -52, 74, 54],
  head: [30, -22],
  shadow: 20,
  vars: { ['--walk' as string]: '.32s' },
  draw: (a) => <Skunk s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir), onPath(offEdge(c, dir))], onPath, 'walk')
    const span = c.view.x1 - c.view.x0
    // waddles along, digs for grubs, sniffs, shows off its tail
    s.go(s.x + dir * span * r.range(0.3, 0.4), r.range(36, 46)).wait(800, 'sniff')
    s.wait(r.range(1600, 2400), 'dig', { fx: 'dirt' }).wait(900, 'eat')
    s.go(s.x + dir * span * r.range(0.15, 0.22), 40).wait(1400, 'tailup').wait(900, 'look')
    return s.go(offEdge(c, -dir), 44).end()
  },
  tap: (at) => [
    { ms: 1300, pose: 'stomp', fx: 'angry' },
    { ms: 400, pose: 'stomp', fx: 'dust' },
    { ms: 2000, pose: 'spray', fx: 'stink', face: (-at.face) as 1 | -1 },
    { to: [at.face > 0 ? 1100 : -100, onPath(at.face > 0 ? 1000 : 0)], ms: 6000, pose: 'walk', face: at.face, end: true },
  ],
})

// ---------- badger (night) ----------
const badger = simple({
  k: 0.9,
  hit: [-32, -30, 76, 32],
  head: [38, -16],
  shadow: 24,
  vars: { ['--walk' as string]: '.42s', ['--eat' as string]: '28deg' },
  draw: (a) => <Badger s={a.s} ink={a.ink} />,
  story: (r, c) => {
    const dir = r.sign()
    const s = story([offEdge(c, dir), onPath(offEdge(c, dir))], onPath, 'walk')
    const span = c.view.x1 - c.view.x0
    for (let i = 0; i < 2; i++) {
      s.go(s.x + dir * span * r.range(0.2, 0.3), r.range(34, 44)).wait(r.range(900, 1500), 'sniff')
      s.wait(r.range(1800, 2600), 'dig', { fx: 'dirt' }).wait(1600, 'eat')
    }
    return s.go(offEdge(c, -dir), 44).end()
  },
  tap: (at) => [
    { ms: 1400, pose: 'puff' },
    { to: [at.pos[0] - at.face * 30, at.pos[1]], ms: 900, pose: 'walk', face: at.face },
    { ms: 900, pose: 'sniff' },
  ],
})

// ---------- a horse at the fallen apples (full-grown tree) ----------
const appleGround = APPLES_AT[1] + 6
const apples = simple({
  k: 0.62,
  hit: [-50, -110, 130, 112],
  head: [56, -26],
  shadow: 34,
  vars: { ['--walk' as string]: '.75s', ['--eat' as string]: '80deg' },
  draw: (a) => <Horse s={a.s} ink={a.ink} pose={a.pose} />,
  story: (r, c) => {
    const s = story([c.view.x1 + 90, appleGround], undefined, 'walk')
    // wanders over from the meadow, eats the apples one by one, swishing its tail
    s.xy(APPLES_AT[0] + 70, appleGround, r.range(7000, 9000), 'walk', { ease: EASE.stop })
    s.wait(800, 'look')
    for (let i = 0; i < 3; i++) {
      s.wait(r.range(2600, 3400), 'eat', { call: 'apple' })
      s.wait(r.range(900, 1500), chance(r, 0.5) ? 'swish' : 'idle')
      if (i === 1) s.xy(APPLES_AT[0] + 45, appleGround, 1600, 'walk', { face: -1 })
    }
    return s.wait(900, 'lift').xy(c.view.x1 + 110, appleGround, 9000, 'walk', { ease: EASE.start }).end()
  },
  tap: () => [
    { ms: 700, pose: 'alert' },
    { ms: 1100, pose: 'nod', fx: 'heart' },
    { ms: 900, pose: 'swish' },
  ],
})

export const WALKERS: Record<string, Species> = {
  rabbit: { name: 'rabbit', icon: '🐇', slot: 'walker', layer: 'front', min: 0.35, when: 'day', weight: 1.3, Comp: rabbit, tale: 'Hops in (or pops out of its burrow), sniffs, nibbles clover, ears twitch, maybe thumps, then bounds off or ducks home. Tap: thump and a zig-zag escape.' },
  hedgehog: { name: 'hedgehog', icon: '🦔', slot: 'walker', layer: 'front', min: 0.35, when: 'any', Comp: hedgehog, tale: 'Snuffles along in short stretches, digs up a beetle and munches it. Tap: curls into a spiky ball, rocks, peeks, uncurls.' },
  nova: { name: 'cat (Nova)', icon: '🐈', slot: 'walker', layer: 'front', min: 0.45, when: 'day', weight: 1.6, Comp: nova, tale: 'Wanders by, sits to groom, stretches, crouches and pounces at a butterfly (and misses). Tap: a slow cat blink with hearts.' },
  fox: { name: 'fox', icon: '🦊', slot: 'walker', layer: 'front', min: 0.6, when: 'day', Comp: fox, tale: 'Trots in, freezes with ears forward, wiggles and mouse-pounces, sometimes sits to scratch, trots off. Tap: leaps straight up and bolts.' },
  squirrel: { name: 'squirrel', icon: '🐿️', slot: 'walker', layer: 'front', min: 0.5, when: 'day', need: (e) => !e.wet, Comp: SquirrelVisit, tale: 'Scampers in bursts, nibbles a nut, digs and buries it, looks round, darts up the tree. Once a day it buries a nut it later forgets. Tap: scolds and dashes.' },
  deer: { name: 'deer', icon: '🦌', slot: 'walker', layer: 'pond', min: 0.7, when: 'day', Comp: deer, tale: 'Steps out cautiously, listens, wades to the pond and drinks, lifting its head, then leaves. Tap: white tail up and away in bounds.' },
  ferret: { name: 'ferret', icon: '🐾', slot: 'walker', layer: 'front', min: 0.7, when: 'day', Comp: ferret, tale: 'Zig-zags in dashes, pops up on its hind legs, does a happy war-dance. Tap: another war-dance and a hop back and forth.' },
  skunk: { name: 'skunk', icon: '🦨', slot: 'walker', layer: 'front', min: 0.75, when: 'any', Comp: skunk, tale: 'Waddles along, digs for grubs, raises its tail to show off. Tap: angry stomp, then the spray, and it waddles off.' },
  badger: { name: 'badger', icon: '🦡', slot: 'walker', layer: 'front', min: 0.3, when: 'night', Comp: badger, tale: 'Trundles through at night, sniffing and digging for worms. Tap: huffs up big and backs off.' },
  apples: { name: 'horse at the apples', icon: '🍎', slot: 'walker', layer: 'front', min: 0.6, when: 'day', need: (e) => e.stage >= 10, Comp: apples, tale: 'A horse ambles over to the fallen apples and eats them one by one, swishing its tail. Tap: it nods at you.' },
}
