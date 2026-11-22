// Easter eggs: the forgetful squirrel, its sprouting nuts, a bird family in the tree and the rabbit burrow.
import { useEffect, useState } from 'react'
import { mix } from './ink'
import { LINES, yAt } from './Landscape'
import { Acorn, Squirrel } from './Creatures'
import type { Palette } from './palette'
import { ageDays, nutSpot, type EggMemory } from './eggMemory'

const groundY = (x: number) => yAt(LINES.near, x) + 20

// ---------- the squirrel's daily visit ----------

type Mode = 'run' | 'dig' | 'think' | 'pat'
interface Pose {
  x: number
  y: number
  flip: boolean
  mode: Mode
  dur: number
  bubble: boolean
  carrying: boolean
}

export function SquirrelAct({ pal, today, memory, onBury, onDone }: { pal: Palette; today: string; memory: EggMemory; onBury: (x: number) => void; onDone: () => void }) {
  const [pose, setPose] = useState<Pose | null>(null)
  const [mound, setMound] = useState<number | null>(null)
  const [dug, setDug] = useState<number | null>(null)

  useEffect(() => {
    const cancelled = { current: false }
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    let cur = 0
    const go = async (x: number, extra: Partial<Pose> = {}) => {
      const dur = Math.abs(x - cur) / 170 + 0.25
      const flip = x < cur
      cur = x
      setPose((p) => ({ ...(p as Pose), x, y: groundY(x), flip, mode: 'run', dur, bubble: false, ...extra }))
      await sleep(dur * 1000 + 60)
    }
    ;(async () => {
      const prev = [...memory.nuts].filter((n) => n.day < today).pop()
      const target = nutSpot(today)
      const fromLeft = target < 500
      cur = fromLeft ? -50 : 1050
      setPose({ x: cur, y: groundY(cur), flip: !fromLeft, mode: 'run', dur: 0, bubble: false, carrying: true })
      await sleep(80)
      if (prev) {
        // it remembers roughly where yesterday's nut is... but not quite
        const guess = Math.max(120, Math.min(900, prev.x + (prev.x < 500 ? 38 : -38)))
        await go(guess)
        if (cancelled.current) return
        setPose((p) => ({ ...(p as Pose), mode: 'dig', dur: 0 }))
        await sleep(1700)
        setDug(guess)
        setPose((p) => ({ ...(p as Pose), mode: 'think', bubble: true }))
        await sleep(900)
        setPose((p) => ({ ...(p as Pose), flip: !(p as Pose).flip }))
        await sleep(700)
        setPose((p) => ({ ...(p as Pose), flip: !(p as Pose).flip }))
        await sleep(700)
      }
      if (cancelled.current) return
      await go(target)
      if (cancelled.current) return
      setPose((p) => ({ ...(p as Pose), mode: 'dig', dur: 0 }))
      await sleep(1500)
      if (cancelled.current) return
      setPose((p) => ({ ...(p as Pose), carrying: false }))
      setMound(target)
      setPose((p) => ({ ...(p as Pose), mode: 'pat' }))
      await sleep(700)
      if (cancelled.current) return
      onBury(target)
      await go(target < 500 ? -60 : 1060)
      onDone()
    })()
    return () => {
      cancelled.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!pose) return null
  const ink = pal.c.ink
  return (
    <g>
      {dug !== null && <ellipse cx={dug} cy={groundY(dug) + 1} rx={7} ry={2} fill={mix(pal.c.soil, '#000', 0.2)} className="gs-fadeout" />}
      {mound !== null && <ellipse cx={mound} cy={groundY(mound) + 1} rx={8} ry={2.6} fill={pal.c.soil} />}
      <g style={{ transform: `translate(${pose.x.toFixed(1)}px,${pose.y.toFixed(1)}px)`, transition: `transform ${pose.dur.toFixed(2)}s cubic-bezier(.45,.05,.4,1)` }}>
        <g transform={`scale(${pose.flip ? -0.8 : 0.8},0.8)`}>
          <g className={pose.mode === 'dig' ? 'gs-dig' : pose.mode === 'pat' ? 'gs-pat' : pose.mode === 'run' ? 'gs-hop gs-hop-fast' : undefined}>
            <g className={`sp pose-${pose.mode === 'think' ? 'look' : pose.mode === 'run' ? 'hop' : 'idle'}`}>
              <Squirrel s={pal.shade} ink={ink} pose={pose.mode === 'think' ? 'sit' : undefined} />
            </g>
          </g>
          {pose.carrying && (
            <g transform="translate(16,-14)">
              <Acorn ink={ink} />
            </g>
          )}
          {pose.mode === 'dig' &&
            [0, 1, 2, 3].map((i) => <circle key={i} cx={8} cy={-1} r={1.6} fill={pal.c.soil} className={`gs-dirt gs-dirt-${i}`} />)}
        </g>
        {pose.bubble && (
          <g transform="translate(0,-46)">
           <g className="gs-bubble">
            <ellipse rx={10} ry={9} fill="#ffffff" stroke={ink} strokeWidth={1} />
            <path d="M-3,8 l-2,6 l6,-5" fill="#ffffff" stroke={ink} strokeWidth={1} />
            <text x={0} y={5} textAnchor="middle" fontSize={14} fontWeight={700} fill={ink} fontFamily="Georgia, serif">?</text>
           </g>
          </g>
        )}
      </g>
    </g>
  )
}

// ---------- forgotten nuts become oaks ----------

export function NutSprouts({ pal, memory, today }: { pal: Palette; memory: EggMemory; today: string }) {
  const ink = pal.c.ink
  const leaf = pal.shade('#6fae4c')
  const leafD = pal.shade('#4f8a3a')
  return (
    <g>
      {memory.nuts.map((n, i) => {
        const age = ageDays(n.day, today)
        if (age < 0) return null
        const x = n.x
        const y = groundY(x)
        if (age < 4) {
          return <ellipse key={i} cx={x} cy={y + 1} rx={8} ry={2.6} fill={mix(pal.c.soil, pal.c.near2, Math.min(0.7, age * 0.22))} />
        }
        if (age < 10) {
          const h = 6 + (age - 4) * 1.4
          return (
            <g key={i} transform={`translate(${x},${y})`}>
              <path d={`M0,0 q-1,${-h / 2} 0,${-h}`} stroke={leaf} strokeWidth={1.6} fill="none" />
              <path d={`M0,${-h} c-5,-1 -7,-5 -6,-7 c3,0 6,3 6,7Z M0,${-h} c5,-1 7,-5 6,-7 c-3,0 -6,3 -6,7Z`} fill={leaf} stroke={ink} strokeWidth={0.6} />
            </g>
          )
        }
        // a little oak sapling with lobed leaves, growing slowly
        const h = Math.min(34, 16 + (age - 10) * 0.9)
        const leaves = [
          [-0.95, -1, -40],
          [-0.7, 1, 35],
          [-0.5, -1, -55],
          [-0.32, 1, 50],
          [-1, 1, 10],
        ]
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <path d={`M0,0 q2,${-h / 2} 0,${-h}`} stroke={pal.shade('#8b6a4c')} strokeWidth={2.2} fill="none" strokeLinecap="round" />
            {leaves.slice(0, age > 18 ? 5 : 3).map(([t, side, a], k) => (
              <g key={k} transform={`translate(0,${(t * h).toFixed(1)}) rotate(${a}) scale(${side},1)`}>
                <path d="M0,0 c2,-3 5,-2 6,-4 c1,2 3,2 4,1 c0,3 -2,4 -1,6 c-3,1 -6,0 -9,-3Z" fill={k % 2 ? leafD : leaf} stroke={ink} strokeWidth={0.6} />
              </g>
            ))}
          </g>
        )
      })}
    </g>
  )
}

// ---------- a bird family in the tree ----------

function Robin({ pal, s = 1 }: { pal: Palette; s?: number }) {
  const ink = pal.c.ink
  return (
    <g transform={`scale(${s})`}>
      <path d="M-8,-2 l-6,3 l1,-5Z" fill={pal.shade('#6b5644')} stroke={ink} strokeWidth={0.6} />
      <ellipse cx={0} cy={-4} rx={8} ry={6} fill={pal.shade('#7a6450')} stroke={ink} strokeWidth={0.8} />
      <path d="M1,-8 C6,-8 8,-4 6,0 C3,1 0,-1 0,-4Z" fill={pal.shade('#e8743b')} />
      <circle cx={5} cy={-10} r={4.2} fill={pal.shade('#7a6450')} stroke={ink} strokeWidth={0.8} />
      <circle cx={6.4} cy={-10.6} r={0.9} fill="#111" />
      <path d="M9,-10 l3,0.8 l-3,0.8Z" fill={pal.shade('#3a2a1a')} />
      <path d="M-1,1.5 l-1,3 M2,1.5 l0,3" stroke={pal.shade('#3a2a1a')} strokeWidth={0.8} />
    </g>
  )
}

export function Nest({ pal, age, daytime, sunny }: { pal: Palette; age: number; daytime: boolean; sunny: boolean }) {
  const ink = pal.c.ink
  const twig = pal.shade('#8a6a45')
  const twigD = pal.shade('#5f4630')
  const a = age % 36
  const bowl = (
    <g>
      <path d="M-15,-4 C-14,6 14,6 15,-4 C9,-1 -9,-1 -15,-4Z" fill={twig} stroke={ink} strokeWidth={0.9} />
      <path d="M-14,-3 l9,4 M-8,1 l12,-3 M2,2 l11,-5 M-11,-1 l20,2 M-5,4 l10,-1" stroke={twigD} strokeWidth={0.8} />
    </g>
  )
  if (a <= 1) return <path d="M-9,0 l16,-2 M-7,-2 l12,3 M-3,1 l9,-4 M-8,1 l5,-3" stroke={twig} strokeWidth={1.3} strokeLinecap="round" />
  return (
    <g>
      {a >= 5 && a <= 10 && (
        <g>
          {[-6, 0, 6].map((x) => (
            <ellipse key={x} cx={x} cy={-4} rx={3} ry={3.6} fill={pal.shade('#a9d8e8')} stroke={ink} strokeWidth={0.6} />
          ))}
        </g>
      )}
      {a >= 11 && a <= 18 && (
        <g>
          {[-6, 0, 6].map((x, i) => (
            <g key={x} transform={`translate(${x},-3)`}>
              <g className="gs-chirp" style={{ animationDelay: `${-i * 0.37}s` }}>
                <circle cy={-3} r={3.6} fill={pal.shade('#8d7a68')} stroke={ink} strokeWidth={0.6} />
                <path d="M-2.4,-6.5 l2.4,-4 l2.4,4Z" fill={pal.shade('#f4c542')} stroke={ink} strokeWidth={0.5} />
              </g>
            </g>
          ))}
        </g>
      )}
      {bowl}
      {/* a parent keeps the eggs warm, and later brings food */}
      {a >= 5 && a <= 10 && daytime && (
        <g transform="translate(0,-3)">
          <Robin pal={pal} />
        </g>
      )}
      {a >= 11 && a <= 18 && daytime && sunny && (
        <g className="gs-parentvisit">
          <g transform="translate(14,-10)">
            <Robin pal={pal} s={0.9} />
          </g>
        </g>
      )}
      {a >= 19 && a <= 24 && daytime && (
        <g transform="translate(26,-6)">
          <Robin pal={pal} s={0.75} />
        </g>
      )}
    </g>
  )
}

// ---------- the rabbit burrow ----------

export const BURROW_X = 438

/** The rabbit's burrow (dug on the first sunny day). The rabbit itself comes and goes in its own story. */
export function Burrow({ pal, age }: { pal: Palette; age: number }) {
  const ink = pal.c.ink
  const y = groundY(BURROW_X) - 4
  return (
    <g transform={`translate(${BURROW_X},${y})`}>
      <path d="M-22,4 C-18,-4 -8,-6 -2,-5 C-12,-2 -16,2 -14,5Z" fill={mix(pal.c.soil, pal.c.near2, age > 3 ? 0.5 : 0.1)} />
      <ellipse cx={0} cy={1} rx={11} ry={5.5} fill={mix(pal.c.soil, '#000', 0.55)} stroke={ink} strokeWidth={1} />
      <path d="M-11,1 C-8,-4 8,-4 11,1" stroke={mix(pal.c.near2, '#1f3a14', 0.3)} strokeWidth={2} fill="none" />
    </g>
  )
}
