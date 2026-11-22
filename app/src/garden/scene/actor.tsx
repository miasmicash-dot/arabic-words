// Story actors. An animal follows a list of beats (move, pause, hop, change pose), each with its own timing and
// easing, so a visit is a little story rather than a looping walk cycle. Tapping it plays its own reaction, after
// which it carries on with the rest of its story (or leaves, if the reaction says so).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { LINES, W, yAt } from './Landscape'
import './stories.css'

export type P = [number, number]

export interface Beat {
  /** where to be at the end of this beat (scene units); omitted = stay */
  to?: P
  ms: number
  /** CSS easing for the move */
  ease?: string
  /** pose class for the body (see stories.css); omitted = keep the last one */
  pose?: string
  /** 1 = facing right, -1 = left; omitted = face the way it moves */
  face?: 1 | -1
  /** arc height of a hop (scene units) and how many hops fit in this beat */
  hop?: number
  hops?: number
  /** body rotation (deg), size and vertical squash, opacity: all eased over the beat */
  rot?: number
  sc?: number
  sy?: number
  alpha?: number
  /** a little effect at the animal (hearts, alarm, dirt, splash...) */
  fx?: string
  /** something for the scene to do now (a sound, an apple eaten) */
  call?: string
  /** the story ends after this beat */
  end?: boolean
}

export interface Look {
  pose: string
  fx?: string
  face: 1 | -1
  /** index of the current beat and how many times it has been tapped */
  i: number
  n: number
}

export interface TapAt {
  pos: P
  face: 1 | -1
  n: number
  pose: string
  rot: number
}

export interface UnderProps {
  pos: P
  start: P
  ms: number
  ease: string
  i: number
  beat: Beat
  beats: Beat[]
}

export interface ActorProps {
  beats: Beat[]
  /** drawing scale (art units to scene units) */
  k: number
  art: (l: Look) => ReactNode
  /** tap target in art units: x, y, w, h */
  hit?: [number, number, number, number]
  /** where effects appear, in art units (facing right) */
  head?: P
  tap?: (at: TapAt) => Beat[] | null
  /** change this to make it react as if tapped (for groups that react together) */
  cue?: number
  onTap?: () => void
  onDone?: () => void
  onCall?: (name: string) => void
  /** shadow half-width in art units (0 = none) */
  shadow?: number
  cls?: string
  vars?: CSSProperties
  /** extra drawing in scene coordinates under the animal (a trail, a silk thread, a molehill) */
  under?: (u: UnderProps) => ReactNode
  /** reduced motion: stand still in a calm pose */
  still?: boolean
}

interface Run {
  beats: Beat[]
  i: number
  pos: P
  face: 1 | -1
  pose: string
  sc: number
  sy: number
  rot: number
  alpha: number
  n: number
  /** reactions finish at this beat; taps before then are ignored */
  lock: number
  gen: number
}

function step(run: Run, i: number, beats = run.beats): Run {
  const b = beats[i]
  const pos = b.to ?? run.pos
  const dx = pos[0] - run.pos[0]
  const face = b.face ?? (dx > 1.5 ? 1 : dx < -1.5 ? -1 : run.face)
  return { ...run, beats, i, pos, face, pose: b.pose ?? run.pose, sc: b.sc ?? run.sc, sy: b.sy ?? run.sy, rot: b.rot ?? run.rot, alpha: b.alpha ?? run.alpha }
}

function livePos(el: SVGGElement | null): P | null {
  if (!el || typeof getComputedStyle === 'undefined') return null
  const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform)
  if (!m) return null
  const a = m[1].split(',').map(Number)
  return Number.isFinite(a[4]) && Number.isFinite(a[5]) ? [a[4], a[5]] : null
}

/** Pick a calm beat to show as a still picture (reduced motion). */
function stillIndex(beats: Beat[]): number {
  const moving = /walk|trot|run|plod|fly|hop|glide|crawl|inch/
  let pos: P = beats[0].to ?? [0, 0]
  const good: number[] = []
  beats.forEach((b, i) => {
    pos = b.to ?? pos
    if (!moving.test(b.pose ?? '') && (b.alpha ?? 1) > 0.5 && pos[0] > 40 && pos[0] < W - 40) good.push(i)
  })
  return good.length ? good[Math.floor(good.length / 2)] : Math.floor(beats.length / 2)
}

export const EASE = {
  move: 'cubic-bezier(.45,.05,.55,.95)',
  start: 'cubic-bezier(.5,0,.75,.6)',
  stop: 'cubic-bezier(.25,.6,.4,1)',
  dart: 'cubic-bezier(.2,.8,.3,1)',
  lin: 'linear',
}

export function Actor(p: ActorProps) {
  const ref = useRef<SVGGElement>(null)
  const [run, setRun] = useState<Run>(() => {
    const first: Run = { beats: p.beats, i: 0, pos: p.beats[0].to ?? [0, 0], face: p.beats[0].face ?? 1, pose: 'idle', sc: 1, sy: 1, rot: 0, alpha: 1, n: 0, lock: -1, gen: 0 }
    if (!p.still) return step(first, 0)
    // a still picture: replay the beats up to a calm moment without timing
    let r = step(first, 0)
    const at = stillIndex(p.beats)
    for (let i = 1; i <= at; i++) r = step(r, i)
    return r
  })
  const done = useRef(p.onDone)
  const call = useRef(p.onCall)
  done.current = p.onDone
  call.current = p.onCall
  const called = useRef('')

  useEffect(() => {
    if (p.still) return
    const b = run.beats[run.i]
    const key = `${run.gen}:${run.i}`
    if (b.call && called.current !== key) {
      called.current = key
      call.current?.(b.call)
    }
    const t = setTimeout(
      () => {
        if (b.end || run.i + 1 >= run.beats.length) done.current?.()
        else setRun((r) => step(r, r.i + 1))
      },
      Math.max(b.ms, run.i === 0 ? 60 : 16),
    )
    return () => clearTimeout(t)
  }, [run.beats, run.i, run.gen, p.still])

  const react = (n: number) => {
    if (!p.tap || p.still) return
    if (run.lock >= 0 && run.i <= run.lock) return
    const live = livePos(ref.current) ?? run.pos
    const reaction = p.tap({ pos: live, face: run.face, n, pose: run.pose, rot: run.rot })
    if (!reaction?.length) return
    const ends = reaction.some((b) => b.end)
    const cur = run.beats[run.i]
    const rest = ends || cur.end ? [] : run.beats.slice(run.i + 1)
    const beats: Beat[] = [{ to: live, ms: 0, pose: run.pose }, ...reaction, ...rest]
    if (!ends && !rest.length) beats[beats.length - 1] = { ...beats[beats.length - 1], end: true }
    setRun((r) => step({ ...r, n, lock: reaction.length, gen: r.gen + 1 }, 0, beats))
  }
  const cueSeen = useRef(p.cue)
  useEffect(() => {
    if (p.cue && p.cue !== cueSeen.current) react(run.n + 1)
    cueSeen.current = p.cue
  }, [p.cue]) // eslint-disable-line react-hooks/exhaustive-deps

  const b = run.beats[run.i]
  const k = p.k
  const ease = b.ease ?? EASE.move
  const dur = run.i === 0 || p.still ? 0 : b.ms
  const hit = p.hit ?? [-12, -16, 24, 18]
  const min = 56 / k
  const hw = Math.max(hit[2], min)
  const hh = Math.max(hit[3], min)
  const head = p.head ?? [hit[0] + hit[2] * 0.75, hit[1]]
  const shaping = b.sc !== undefined || b.sy !== undefined || b.rot !== undefined
  const hop = b.hop && !p.still ? b.hop : 0
  return (
    <g>
      {p.under?.({ pos: run.pos, start: run.beats[0].to ?? run.pos, ms: dur, ease, i: run.i, beat: b, beats: run.beats })}
      <g
        ref={ref}
        style={{
          transform: `translate(${run.pos[0].toFixed(1)}px,${run.pos[1].toFixed(1)}px)`,
          transition: `transform ${dur}ms ${ease}, opacity ${b.alpha !== undefined ? Math.max(dur, 200) : 300}ms ease`,
          opacity: run.alpha,
        }}
      >
        {p.shadow ? <ellipse cx={0} cy={1} rx={p.shadow * k} ry={Math.max(1.5, p.shadow * k * 0.16)} fill="#000" opacity={0.12} /> : null}
        <g
          style={{
            transform: `scale(${(run.face * k * run.sc).toFixed(3)},${(k * run.sc * run.sy).toFixed(3)}) rotate(${run.rot}deg)`,
            transition: `transform ${shaping ? Math.max(dur, 140) : 280}ms ${shaping ? ease : 'ease-in-out'}`,
          }}
        >
          <g
            key={hop ? `h${run.gen}-${run.i}` : 'g'}
            className={hop ? 'st-arc' : undefined}
            style={hop ? { ['--h' as string]: `${(-hop / (k * run.sc)).toFixed(1)}px`, animationDuration: `${Math.round(b.ms / (b.hops ?? 1))}ms`, animationIterationCount: b.hops ?? 1 } : undefined}
          >
            <g
              className={`sp ${p.cls ?? ''} pose-${run.pose}${p.tap ? ' gs-tap' : ''}`}
              style={p.vars}
              onClick={
                p.tap
                  ? (e) => {
                      e.stopPropagation()
                      p.onTap?.()
                      react(run.n + 1)
                    }
                  : undefined
              }
            >
              {p.tap && <rect x={hit[0] - (hw - hit[2]) / 2} y={hit[1] - (hh - hit[3]) / 2} width={hw} height={hh} fill="transparent" />}
              {p.art({ pose: run.pose, fx: b.fx, face: run.face, i: run.i, n: run.n })}
            </g>
          </g>
        </g>
        {b.fx && !p.still && (
          <g key={`fx${run.gen}-${run.i}`} transform={`translate(${(head[0] * k * run.face).toFixed(1)},${(head[1] * k).toFixed(1)})`}>
            <Fx name={b.fx} ground={-head[1] * k} />
          </g>
        )}
      </g>
    </g>
  )
}

// ---------- effects ----------

const HEART = 'M0,3 C-6,-2 -4,-7 0,-4 C4,-7 6,-2 0,3Z'

/** Little one-shot effects. Drawn in scene units at the animal's head; `ground` is how far down its feet are. */
export function Fx({ name, ground }: { name: string; ground: number }) {
  const specks = (color: string, n: number, dx: number, dy: number, y = ground) =>
    Array.from({ length: n }, (_, i) => (
      <circle key={i} cx={0} cy={y} r={1.3 + (i % 2) * 0.6} fill={color} className="st-fly" style={{ animationDelay: `${i * 0.12}s`, ['--dx' as string]: `${dx * (0.6 + (i % 3) * 0.3)}px`, ['--dy' as string]: `${dy * (0.7 + (i % 2) * 0.5)}px` }} />
    ))
  let body: ReactNode = null
  switch (name) {
    case 'hearts':
      body = [0, 1, 2].map((i) => <path key={i} d={HEART} transform={`translate(${(i - 1) * 8},-6)`} fill="#ff7a9a" stroke="#c2405f" strokeWidth={0.5} className="st-rise" style={{ animationDelay: `${i * 0.3}s` }} />)
      break
    case 'heart':
      body = <path d={HEART} transform="translate(0,-6) scale(1.2)" fill="#ff7a9a" stroke="#c2405f" strokeWidth={0.5} className="st-rise" />
      break
    case 'alarm':
      body = (
        <g transform="translate(4,-10)" className="st-pop">
          <path d="M0,-9 L0,-2 M0,2 L0,2.4" stroke="#2c2a26" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M-7,-6 l-3,-2 M7,-6 l3,-2" stroke="#2c2a26" strokeWidth={1.2} strokeLinecap="round" />
        </g>
      )
      break
    case 'question':
      body = (
        <g transform="translate(2,-14)" className="st-pop">
          <ellipse rx={8} ry={7.5} fill="#fff" stroke="#2c2a26" strokeWidth={0.9} />
          <text y={4.5} textAnchor="middle" fontSize={11} fontWeight={700} fill="#2c2a26" fontFamily="Georgia, serif">?</text>
        </g>
      )
      break
    case 'angry':
      body = (
        <g transform="translate(6,-8)" className="st-pop">
          <path d="M-4,-4 q2,2 0,4 M4,-4 q-2,2 0,4 M-4,-4 q2,-2 4,0 M-4,4 q2,2 4,0" stroke="#d9342b" strokeWidth={1.8} fill="none" strokeLinecap="round" transform="rotate(45)" />
        </g>
      )
      break
    case 'dirt':
      body = specks('#7a5a3c', 6, -22, -14)
      break
    case 'dust':
      body = (
        <g>
          {[-8, 0, 8].map((x, i) => <circle key={i} cx={x} cy={ground - 2} r={4} fill="#d9c49a" opacity={0.7} className="st-puffout" style={{ animationDelay: `${i * 0.1}s` }} />)}
        </g>
      )
      break
    case 'splash':
      body = (
        <g>
          <ellipse cx={0} cy={ground} rx={9} ry={2.6} fill="none" stroke="#e6f6ff" strokeWidth={1.3} className="st-ring" />
          {specks('#d6f0fb', 5, 8, -14)}
        </g>
      )
      break
    case 'ripple':
      body = [0, 1].map((i) => <ellipse key={i} cx={0} cy={ground} rx={8} ry={2} fill="none" stroke="#e6f6ff" strokeWidth={1} className="st-ring" style={{ animationDelay: `${i * 0.45}s` }} />)
      break
    case 'sparkle':
      body = [0, 1, 2].map((i) => <path key={i} transform={`translate(${(i - 1) * 9},${-4 - (i % 2) * 6})`} d="M0,-4 l1,3 l3,1 l-3,1 l-1,3 l-1,-3 l-3,-1 l3,-1Z" fill="#fff4b0" className="st-pop" style={{ animationDelay: `${i * 0.15}s` }} />)
      break
    case 'chips':
      body = specks('#c9a272', 5, -14, -10, 0)
      break
    case 'pollen':
      body = specks('#f4cf3a', 4, 6, 10, 0)
      break
    case 'stink':
      body = (
        <g transform="translate(-34,0)">
          <path d="M-8,-4 c-6,-6 2,-14 8,-10 c2,-8 14,-6 12,2 c8,0 8,10 0,11 c-2,7 -14,7 -15,1 c-7,2 -11,-3 -5,-4Z" fill="#c9d77a" opacity={0.6} stroke="#8a9a3a" strokeWidth={0.8} className="st-puffout" />
          <path d="M-12,-22 q3,-4 0,-8 q-3,-4 0,-8 M0,-24 q3,-4 0,-8 q-3,-4 0,-8" stroke="#8a9a3a" strokeWidth={1.3} fill="none" strokeLinecap="round" className="st-rise" />
        </g>
      )
      break
    case 'water':
      body = specks('#bfe6f5', 7, 16, -26, 0)
      break
    case 'zz':
      body = (
        <text x={6} y={-6} fontSize={9} fontWeight={700} fill="#3a3a5a" fontFamily="Georgia, serif" className="st-rise">z</text>
      )
      break
    case 'butterfly':
      body = (
        <g className="st-flee">
          <path d="M0,0 C-3,-6 -8,-6 -7,-1 C-6,2 -2,1 0,0 C2,1 6,2 7,-1 C8,-6 3,-6 0,0Z" fill="#f2a541" stroke="#2c2a26" strokeWidth={0.5} className="st-bfly" />
        </g>
      )
      break
    case 'gulp':
      body = <circle cx={0} cy={0} r={2.2} fill="#2c2a26" className="st-pop" />
      break
    default:
      body = null
  }
  return <g className="st-fx">{body}</g>
}

// ---------- writing stories ----------

/** The ground along the path, and the grassy band in front of it (f = 0 path .. 1 front edge). */
export const onPath = (x: number) => yAt(LINES.path, x) + 3
export const band = (f: number) => (x: number) => onPath(x) + (yAt(LINES.front, x) - onPath(x)) * f

/**
 * A small helper for writing a story: it remembers where the animal is so each step can say just where to go next.
 * Long walks are split into short legs so the animal follows the curve of the ground.
 */
export function story(start: P, ground?: (x: number) => number, pose = 'idle') {
  const beats: Beat[] = [{ to: start, ms: 0, pose }]
  let x = start[0]
  let y = start[1]
  const self = {
    beats,
    get x() {
      return x
    },
    get y() {
      return y
    },
    /** walk (or run...) to x along the ground at `speed` units a second */
    go(nx: number, speed: number, pose = 'walk', o: Partial<Beat> = {}) {
      const total = Math.abs(nx - x)
      const legs = Math.max(1, Math.ceil(total / 110))
      const x0 = x
      for (let i = 1; i <= legs; i++) {
        const lx = x0 + ((nx - x0) * i) / legs
        const ease = legs === 1 ? (o.ease ?? EASE.move) : i === 1 ? EASE.start : i === legs ? EASE.stop : EASE.lin
        self.xy(lx, ground ? ground(lx) : y, ((total / legs) / speed) * 1000 * (legs > 1 && (i === 1 || i === legs) ? 1.25 : 1), pose, { ...o, ease })
      }
      return self
    },
    /** move straight to a point */
    xy(nx: number, ny: number, ms: number, pose?: string, o: Partial<Beat> = {}) {
      x = nx
      y = ny
      beats.push({ ms: Math.round(ms), pose, ...o, to: [nx, ny] })
      return self
    },
    /** a run of n hops to x */
    hops(nx: number, n: number, msEach: number, height: number, o: Partial<Beat> = {}) {
      const x0 = x
      for (let i = 1; i <= n; i++) {
        const hx = x0 + ((nx - x0) * i) / n
        self.xy(hx, ground ? ground(hx) : y, msEach, 'hop', { hop: height, ease: EASE.lin, ...o })
      }
      return self
    },
    /** stay put for a while in a pose */
    wait(ms: number, pose?: string, o: Partial<Beat> = {}) {
      beats.push({ ms: Math.round(ms), pose, ...o })
      return self
    },
    end(o: Partial<Beat> = {}) {
      beats[beats.length - 1] = { ...beats[beats.length - 1], ...o, end: true }
      return beats
    },
  }
  return self
}
