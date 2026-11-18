// The small life of the garden: insects and little animals in the foreground, birds and waterfowl, grazing herds on
// the far hills, night creatures, Nova the cat, and the farmer's hat on his fence post (he is never seen).
// Everything is gated by `life` (0..1, from health only) so a neglected garden empties out and a thriving one is busy.
// Flies make no sound and there are no crickets.
import { useEffect, useState, type ReactNode } from 'react'
import { mix } from './ink'
import { LINES, yAt } from './Landscape'
import type { Palette } from './palette'
import './critters.css'

type S = (c: string) => string
interface Art { s: S; ink: string }

const At = ({ x, y, k = 1, flip, children, cls, style }: { x: number; y: number; k?: number; flip?: boolean; children: ReactNode; cls?: string; style?: React.CSSProperties }) => (
  <g transform={`translate(${x},${y}) scale(${flip ? -k : k},${k})`}>
    <g className={cls} style={style}>{children}</g>
  </g>
)

// ---------- insects and tiny things (foreground) ----------

function Ladybird({ s, ink }: Art) {
  return (
    <g>
      <path d="M-4,0 C-4,-6 4,-6 4,0Z" fill={s('#d7322b')} stroke={ink} strokeWidth={0.7} />
      <path d="M0,-4.4 L0,0" stroke={ink} strokeWidth={0.6} />
      <circle cx={-2} cy={-2} r={0.8} fill={ink} /><circle cx={2} cy={-2.4} r={0.8} fill={ink} /><circle cx={1.8} cy={-0.8} r={0.6} fill={ink} />
      <path d="M3.4,-1.2 C5,-2.6 6,-1.6 5.6,-0.4Z" fill={ink} />
    </g>
  )
}

function Ant({ ink }: { ink: string }) {
  return (
    <g>
      <circle cx={-2.6} cy={-1.4} r={1.4} fill={ink} /><circle cx={0} cy={-1.4} r={0.9} fill={ink} /><circle cx={2.1} cy={-1.7} r={1.1} fill={ink} />
      <path d="M-1,-1 l-1,1.6 M0,-1 l0,1.6 M1,-1 l1,1.6 M2.6,-2.6 l1.2,-1.4" stroke={ink} strokeWidth={0.4} />
    </g>
  )
}

function AntTrail({ s, ink }: Art) {
  return (
    <g>
      <ellipse cx={46} cy={0} rx={8} ry={2.6} fill={s('#a07850')} stroke={ink} strokeWidth={0.6} />
      <path d="M42,-1 q4,-4 8,0" stroke={s('#6e5034')} strokeWidth={1} fill="none" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} className="cr-ant" style={{ animationDelay: `${-i * 0.9}s` }}><Ant ink={ink} /></g>
      ))}
    </g>
  )
}

function Worm({ s, ink }: Art) {
  return (
    <g>
      <ellipse cx={0} cy={1} rx={7} ry={1.6} fill={s('#7a5236')} />
      <path className="cr-worm" d="M-4,0 C-4,-5 0,-7 2,-4 C3,-2 3,0 3,0" stroke={s('#d98b84')} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <circle cx={2.2} cy={-4.6} r={0.4} fill={ink} />
    </g>
  )
}

function Caterpillar({ s, ink }: Art) {
  return (
    <g>
      <path d="M-14,0 C-8,-10 8,-10 14,0 C8,-3 -8,-3 -14,0Z" fill={s('#7bbf55')} stroke={ink} strokeWidth={0.7} />
      <g className="cr-inch">
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={-6 + i * 3} cy={-5 - (i === 2 ? 1.6 : i % 2) * 1} r={1.9} fill={s(i === 4 ? '#3f8a3a' : '#5aa845')} stroke={ink} strokeWidth={0.45} />)}
        <circle cx={6.6} cy={-6.6} r={0.45} fill={ink} />
      </g>
    </g>
  )
}

function Beetle({ s, ink }: Art) {
  return (
    <g className="cr-scuttle">
      <ellipse cx={0} cy={-2.6} rx={4.4} ry={2.8} fill={s('#2f4f3a')} stroke={ink} strokeWidth={0.6} />
      <path d="M0,-5.2 L0,-0.2" stroke={mix('#2f4f3a', '#9fe0b2', 0.5)} strokeWidth={0.5} />
      <circle cx={4.6} cy={-2.6} r={1.5} fill={ink} />
      <path d="M5.6,-3.4 l2,-1.6 M5.6,-2 l2,1 M-2,-0.4 l-1,1.6 M1,-0.4 l1,1.6" stroke={ink} strokeWidth={0.5} />
      <path d="M-3,-4 q2,-1 3,0" stroke="#fff" strokeWidth={0.5} opacity={0.5} fill="none" />
    </g>
  )
}

function Grasshopper({ s, ink }: Art) {
  const g = s('#86b84a')
  return (
    <g className="cr-grasshop">
      <path d="M-8,-3 C-4,-6 4,-6 7,-4 C6,-2 -4,-1 -8,-3Z" fill={g} stroke={ink} strokeWidth={0.6} />
      <path d="M-2,-4 L-8,-10 L-11,-1" stroke={mix(g, '#2a3a1a', 0.3)} strokeWidth={1.1} fill="none" strokeLinejoin="round" />
      <circle cx={6.6} cy={-4.4} r={1.1} fill={ink} />
      <path d="M7,-5 q5,-6 9,-5 M7,-5 q4,-7 7,-8" stroke={ink} strokeWidth={0.4} fill="none" />
      <path d="M2,-2 l1,2 M4,-2 l1.4,2" stroke={ink} strokeWidth={0.5} />
    </g>
  )
}

function Spider({ ink }: { ink: string }) {
  return (
    <g>
      <g stroke="#ffffff" strokeWidth={0.4} opacity={0.65} fill="none">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M0,0 L${(Math.cos((i * Math.PI) / 4) * 16).toFixed(1)},${(Math.sin((i * Math.PI) / 4) * 16).toFixed(1)}`} />)}
        {[4, 8, 12].map((r) => <polygon key={r} points={[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `${(Math.cos((i * Math.PI) / 4) * r).toFixed(1)},${(Math.sin((i * Math.PI) / 4) * r).toFixed(1)}`).join(' ')} />)}
      </g>
      <g className="cr-dangle">
        <path d="M0,-16 L0,-2" stroke="#ffffff" strokeWidth={0.3} opacity={0.6} />
        <circle cx={0} cy={0} r={1.8} fill={ink} /><circle cx={0} cy={-2.4} r={1.1} fill={ink} />
        <path d="M-1,0 l-3,-2 M-1,0.6 l-3,1 M1,0 l3,-2 M1,0.6 l3,1 M-1,1 l-2,3 M1,1 l2,3" stroke={ink} strokeWidth={0.4} />
      </g>
    </g>
  )
}

function Bumblebee({ ink }: { ink: string }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={4.4} ry={3.4} fill="#f1c232" stroke={ink} strokeWidth={0.6} />
      <path d="M-1.2,-3.2 L-1.2,3.2 M1.4,-3 L1.4,3" stroke={ink} strokeWidth={1.2} />
      <ellipse cx={-1} cy={-4.2} rx={2.6} ry={1.6} fill="#ffffff" opacity={0.75} className="cr-buzzwing" />
    </g>
  )
}

function Fly({ ink }: { ink: string }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={1.6} ry={1.1} fill={ink} />
      <ellipse cx={-0.6} cy={-1.3} rx={1.4} ry={0.8} fill="#dfe8ef" opacity={0.8} className="cr-buzzwing" />
    </g>
  )
}

function Damselfly({ ink }: { ink: string }) {
  return (
    <g>
      <path d="M-12,0 L4,0" stroke="#3aa0d8" strokeWidth={1.3} strokeLinecap="round" />
      <circle cx={5} cy={0} r={1.4} fill="#2b7fb0" />
      <g className="cr-buzzwing" opacity={0.6}>
        <ellipse cx={0} cy={-2.6} rx={5} ry={1.1} fill="#e9f6ff" stroke={ink} strokeWidth={0.2} />
        <ellipse cx={-1} cy={2.4} rx={4.4} ry={1} fill="#e9f6ff" stroke={ink} strokeWidth={0.2} />
      </g>
    </g>
  )
}

function Moth({ ink }: { ink: string }) {
  return (
    <g className="cr-flutter">
      <path d="M0,0 C-6,-6 -9,-2 -7,2 C-5,4 -2,2 0,0 C2,2 5,4 7,2 C9,-2 6,-6 0,0Z" fill="#d9d0bd" stroke={ink} strokeWidth={0.4} />
      <path d="M0,-2 L0,3" stroke={ink} strokeWidth={0.9} />
    </g>
  )
}

function ButterflySp({ wing, spot, ink }: { wing: string; spot: string; ink: string }) {
  return (
    <g className="cr-flutter">
      <path d="M0,0 C-8,-10 -12,-4 -9,0 C-12,4 -6,8 0,2 C6,8 12,4 9,0 C12,-4 8,-10 0,0Z" fill={wing} stroke={ink} strokeWidth={0.5} />
      <circle cx={-6} cy={-3} r={1.2} fill={spot} /><circle cx={6} cy={-3} r={1.2} fill={spot} />
      <path d="M0,-3 L0,4" stroke={ink} strokeWidth={1} strokeLinecap="round" />
    </g>
  )
}

// ---------- small animals ----------

function Mouse({ s, ink }: Art) {
  return (
    <g className="cr-sniff">
      <path d="M-7,0 C-8,-6 -2,-8 3,-6 C6,-5 8,-3 8,-1 C6,0 -4,1 -7,0Z" fill={s('#9a8d80')} stroke={ink} strokeWidth={0.6} />
      <circle cx={2} cy={-6.4} r={2} fill={s('#b8aa9c')} stroke={ink} strokeWidth={0.5} />
      <circle cx={5.6} cy={-3} r={0.5} fill={ink} /><circle cx={8.2} cy={-1.3} r={0.6} fill={s('#e8a0a0')} />
      <path d="M-7,-1 C-12,-1 -14,2 -18,1" stroke={s('#c4a49a')} strokeWidth={0.7} fill="none" />
    </g>
  )
}

function Tortoise({ s, ink }: Art) {
  return (
    <g className="cr-plod">
      <path d="M8,-3 C11,-6 15,-6 16,-3 C15,-1 11,-1 8,-2Z" fill={s('#a3a06a')} stroke={ink} strokeWidth={0.6} />
      <path d="M-10,-1 C-10,-11 8,-11 9,-1Z" fill={s('#7a6b3e')} stroke={ink} strokeWidth={0.8} />
      <path d="M-6,-2 L-3,-8 L3,-8 L6,-2 M-3,-8 L-1,-2 M3,-8 L1,-2" stroke={mix('#7a6b3e', '#f2deaa', 0.4)} strokeWidth={0.6} fill="none" />
      <path d="M-8,-1 l-1,2 M6,-1 l1,2" stroke={s('#8b8858')} strokeWidth={2} strokeLinecap="round" />
      <circle cx={13.6} cy={-4} r={0.5} fill={ink} />
    </g>
  )
}

function Lizard({ s, ink }: Art) {
  const c = s('#7da35a')
  return (
    <g>
      <path d="M-14,-9 C-2,-15 12,-14 18,-9 C10,-5 -6,-5 -14,-9Z" fill={s('#a59f94')} stroke={ink} strokeWidth={0.7} />
      <g className="cr-sniff">
        <path d="M-12,-10 C-6,-12 4,-13 10,-11 C12,-10.6 12,-9.4 10,-9 C4,-8.6 -6,-9 -12,-10Z" fill={c} stroke={ink} strokeWidth={0.5} />
        <path d="M-12,-10 C-16,-9 -19,-7 -21,-9" stroke={c} strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <circle cx={8.6} cy={-10.6} r={0.45} fill={ink} />
        <path d="M-4,-9.4 l-2,2 M3,-9.4 l2,2" stroke={c} strokeWidth={0.8} />
      </g>
    </g>
  )
}

function Toad({ s, ink }: Art) {
  return (
    <g className="cr-breathe">
      <path d="M-7,0 C-8,-6 -4,-9 0,-9 C5,-9 8,-6 7,0Z" fill={s('#8a7a4a')} stroke={ink} strokeWidth={0.7} />
      <circle cx={-3} cy={-5} r={0.8} fill={s('#6e5e36')} /><circle cx={2} cy={-3} r={0.9} fill={s('#6e5e36')} />
      <circle cx={4} cy={-8.4} r={1.6} fill={s('#8a7a4a')} stroke={ink} strokeWidth={0.5} /><circle cx={4.3} cy={-8.6} r={0.7} fill="#c48a16" />
    </g>
  )
}

function Chipmunk({ s, ink }: Art) {
  return (
    <g className="cr-nibble">
      <path d="M-6,-2 C-12,-4 -13,-12 -9,-14 C-6,-15 -6,-11 -7,-8" fill="none" stroke={s('#8a5a32')} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M-6,0 C-7,-7 -2,-10 3,-9 C6,-8 6,-3 4,0Z" fill={s('#b07a48')} stroke={ink} strokeWidth={0.6} />
      <path d="M-4,-7 C-2,-8 1,-8 3,-7" stroke={s('#f2e2c4')} strokeWidth={0.9} fill="none" />
      <circle cx={4} cy={-10} r={3} fill={s('#b07a48')} stroke={ink} strokeWidth={0.5} />
      <circle cx={5.4} cy={-10.6} r={0.55} fill={ink} />
      <circle cx={6.6} cy={-6.6} r={1.2} fill={s('#7a4a24')} />
    </g>
  )
}

function Mole({ s, ink }: Art) {
  return (
    <g>
      <path d="M-12,0 C-8,-8 8,-8 12,0Z" fill={s('#7b5a3c')} stroke={ink} strokeWidth={0.6} />
      <g className="cr-peek">
        <path d="M-4,-4 C-4,-10 4,-10 4,-4Z" fill={s('#3b3436')} stroke={ink} strokeWidth={0.5} />
        <ellipse cx={0} cy={-9.6} rx={1.4} ry={1} fill={s('#e8a0a8')} />
        <path d="M-5,-5 l-2,1 M5,-5 l2,1" stroke={s('#e8c0c0')} strokeWidth={1.2} strokeLinecap="round" />
      </g>
    </g>
  )
}

function Badger({ s, ink }: Art) {
  return (
    <g className="cr-plod">
      <path d="M-14,-1 C-15,-9 -4,-12 6,-11 C12,-10 15,-6 14,-2 C10,0 -10,1 -14,-1Z" fill={s('#7e7a76')} stroke={ink} strokeWidth={0.7} />
      <path d="M10,-10 C16,-11 21,-7 22,-3 C19,-2 14,-2 11,-4Z" fill="#f4f2ec" stroke={ink} strokeWidth={0.6} />
      <path d="M11,-9 C15,-8 18,-6 21,-4" stroke="#222" strokeWidth={1.5} fill="none" />
      <path d="M-10,-1 l0,2 M8,-1 l0,2" stroke="#222" strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

// ---------- birds ----------

function Songbird({ body, belly, ink, peck = true }: { body: string; belly: string; ink: string; peck?: boolean }) {
  return (
    <g className={peck ? 'cr-peck' : 'cr-perch'}>
      <path d="M-6,-6 L-11,-4 L-6,-4Z" fill={body} stroke={ink} strokeWidth={0.5} />
      <ellipse cx={-1} cy={-6} rx={6} ry={4.4} fill={body} stroke={ink} strokeWidth={0.6} />
      <path d="M1,-5 C3,-3 5,-4 5,-6 C4,-8 2,-8 1,-5Z" fill={belly} />
      <circle cx={4} cy={-9} r={3} fill={body} stroke={ink} strokeWidth={0.6} />
      <path d="M6.8,-9.4 L9.4,-8.6 L6.8,-8Z" fill="#e2a33a" />
      <circle cx={4.8} cy={-9.6} r={0.6} fill={ink} />
      <path d="M-1,-1.6 l-1,2 M1,-1.6 l1,2" stroke={ink} strokeWidth={0.5} />
    </g>
  )
}

function Hummingbird({ ink }: { ink: string }) {
  return (
    <g className="cr-hover">
      <path d="M-5,0 C-3,-3 3,-3 4,-1 C3,1 -3,1 -5,0Z" fill="#3fa36b" stroke={ink} strokeWidth={0.4} />
      <path d="M-5,0 L-9,2 L-8,-1Z" fill="#2c7a50" />
      <circle cx={4} cy={-1.4} r={1.6} fill="#c43b6a" />
      <path d="M5.4,-1.6 L11,-2" stroke={ink} strokeWidth={0.5} />
      <ellipse cx={-1} cy={-3.6} rx={1.6} ry={4} fill="#e9f6ff" opacity={0.6} className="cr-buzzwing" />
    </g>
  )
}

function Woodpecker({ ink }: { ink: string }) {
  return (
    <g className="cr-tap">
      <path d="M-2,4 C-5,0 -5,-8 -2,-11 C1,-12 3,-9 3,-6 C3,-1 1,3 -2,4Z" fill="#2d2d2d" stroke={ink} strokeWidth={0.5} />
      <path d="M-1,-3 l2,1 M-1,-6 l2,1" stroke="#f4f2ec" strokeWidth={0.8} />
      <circle cx={1} cy={-11} r={2.4} fill="#f4f2ec" stroke={ink} strokeWidth={0.4} />
      <path d="M-1,-13.6 C0,-14.6 2,-14.4 2.6,-13" fill="#d23b2b" />
      <path d="M3.2,-11 L6.8,-10.6" stroke={ink} strokeWidth={0.8} />
    </g>
  )
}

function Duck({ s, ink, baby }: Art & { baby?: boolean }) {
  const body = baby ? '#f3d65a' : '#9a7a52'
  return (
    <g className="cr-bobwater">
      <path d="M-8,0 C-9,-5 -2,-6 4,-4 C7,-3 7,0 5,0Z" fill={s(body)} stroke={ink} strokeWidth={0.6} />
      <circle cx={4} cy={-6} r={2.8} fill={s(baby ? body : '#2f7a4a')} stroke={ink} strokeWidth={0.5} />
      <path d="M6.6,-6 L9.4,-5.4 L6.6,-4.8Z" fill="#e6a032" />
      <circle cx={4.6} cy={-6.6} r={0.5} fill={ink} />
      {!baby && <path d="M2,-3.4 L4.6,-3.6" stroke="#f4f2ec" strokeWidth={0.7} />}
    </g>
  )
}

function Swan({ ink }: { ink: string }) {
  return (
    <g className="cr-bobwater">
      <path d="M-14,0 C-16,-8 -6,-10 4,-6 C8,-4 8,0 6,0Z" fill="#fbfbf6" stroke={ink} strokeWidth={0.7} />
      <path d="M-10,-6 C-6,-12 0,-10 2,-7" stroke="#e6e6de" strokeWidth={1.2} fill="none" />
      <path d="M4,-5 C8,-10 6,-18 9,-20 C11,-21 13,-20 12,-18" stroke="#fbfbf6" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M4,-5 C8,-10 6,-18 9,-20" stroke={ink} strokeWidth={0.4} fill="none" transform="translate(1.2,0)" />
      <path d="M12,-19 L15.4,-17.6 L12.4,-17Z" fill="#e2732e" />
      <circle cx={10.4} cy={-19.4} r={0.5} fill={ink} />
    </g>
  )
}

function Heron({ ink }: { ink: string }) {
  return (
    <g>
      <path d="M-1,0 L-1,-14 M2,0 L1,-14" stroke="#7a7a72" strokeWidth={0.8} />
      <path d="M-8,-16 C-8,-24 4,-26 6,-20 C6,-16 2,-14 -3,-14 Z" fill="#b8c2c8" stroke={ink} strokeWidth={0.6} />
      <path d="M-8,-17 L-12,-14" stroke="#8a969c" strokeWidth={1.2} />
      <g className="cr-strike">
        <path d="M4,-21 C8,-26 4,-32 7,-36" stroke="#d6dde0" strokeWidth={2} fill="none" strokeLinecap="round" />
        <circle cx={7.4} cy={-36.4} r={2} fill="#eef1f2" stroke={ink} strokeWidth={0.4} />
        <path d="M6,-37.6 L1,-38" stroke="#222" strokeWidth={0.8} />
        <path d="M9,-36.6 L16,-35.4" stroke="#d9a33a" strokeWidth={0.9} />
        <circle cx={8} cy={-37} r={0.4} fill={ink} />
      </g>
    </g>
  )
}

function Kingfisher({ ink }: { ink: string }) {
  return (
    <g className="cr-perch">
      <path d="M-4,-2 C-6,-8 0,-11 3,-9 C5,-7 4,-3 2,-1Z" fill="#2a8fc9" stroke={ink} strokeWidth={0.5} />
      <path d="M0,-3 C2,-3 3,-5 3,-7" stroke="#e8823a" strokeWidth={2} fill="none" />
      <circle cx={2} cy={-10} r={2.4} fill="#2a8fc9" stroke={ink} strokeWidth={0.4} />
      <path d="M4,-10.6 L9,-10 L4,-9.4Z" fill="#222" />
      <circle cx={2.6} cy={-10.4} r={0.45} fill={ink} />
    </g>
  )
}

function Turtle({ s, ink }: Art) {
  return (
    <g className="cr-bobwater">
      <path d="M-14,1 C-10,-3 10,-3 14,1Z" fill={s('#7a5e3e')} stroke={ink} strokeWidth={0.6} />
      <path d="M-6,-1 C-6,-7 6,-7 6,-1Z" fill={s('#4f6a3a')} stroke={ink} strokeWidth={0.6} />
      <path d="M-3,-2 L0,-5.6 L3,-2" stroke={mix('#4f6a3a', '#e8e0b0', 0.4)} strokeWidth={0.5} fill="none" />
      <path d="M6,-2 C8,-3 10,-3 10,-1.6" stroke={s('#7a9a4a')} strokeWidth={1.6} fill="none" strokeLinecap="round" className="cr-sniff" />
    </g>
  )
}

function Fish({ ink }: { ink: string }) {
  return (
    <g className="cr-fishjump">
      <path d="M-6,0 C-3,-4 3,-4 6,0 C3,4 -3,4 -6,0Z M-6,0 L-10,-3 L-10,3Z" fill="#e8873a" stroke={ink} strokeWidth={0.5} />
      <circle cx={3} cy={-0.6} r={0.5} fill={ink} />
    </g>
  )
}

function Dove({ ink }: { ink: string }) {
  return <Songbird body="#e7e4df" belly="#f3e9e6" ink={ink} peck={false} />
}

function Crow({ ink }: { ink: string }) {
  return <Songbird body="#2c2d33" belly="#3d3f47" ink={ink} peck={false} />
}

function FarHerdAnimal({ kind, ink }: { kind: 'sheep' | 'goat' | 'cow' | 'camel' | 'donkey'; ink: string }) {
  // tiny distant silhouettes, simple and readable from far away
  if (kind === 'sheep')
    return (
      <g className="cr-graze">
        <path d="M-6,-3 C-7,-8 -1,-10 3,-8 C7,-8 8,-4 5,-2 C2,-1 -4,-1 -6,-3Z" fill="#f6f3ea" stroke={ink} strokeWidth={0.5} />
        <ellipse cx={6} cy={-4} rx={1.8} ry={1.3} fill="#3a3330" />
        <path d="M-3,-2 l0,2 M3,-2 l0,2" stroke="#3a3330" strokeWidth={0.8} />
      </g>
    )
  if (kind === 'goat')
    return (
      <g className="cr-graze">
        <path d="M-6,-4 C-6,-8 4,-8 5,-5 C5,-3 -4,-2 -6,-4Z" fill="#d9cdb8" stroke={ink} strokeWidth={0.5} />
        <path d="M4,-6 L7,-9 L8,-6Z" fill="#d9cdb8" stroke={ink} strokeWidth={0.4} />
        <path d="M7,-9 q-2,-3 -3,-3 M8,-6 l0,2" stroke={ink} strokeWidth={0.5} fill="none" />
        <path d="M-4,-3 l0,3 M3,-3 l0,3" stroke={ink} strokeWidth={0.7} />
      </g>
    )
  if (kind === 'cow')
    return (
      <g className="cr-graze">
        <path d="M-8,-5 C-8,-10 6,-10 7,-6 C7,-3 -6,-2 -8,-5Z" fill="#f4f0e6" stroke={ink} strokeWidth={0.5} />
        <ellipse cx={-3} cy={-7} rx={2.4} ry={1.6} fill="#3a3330" /><ellipse cx={3} cy={-6} rx={1.6} ry={1.2} fill="#3a3330" />
        <path d="M7,-7 C9,-8 11,-6 10,-4 L7,-4Z" fill="#f4f0e6" stroke={ink} strokeWidth={0.4} />
        <path d="M-6,-3 l0,3 M5,-3 l0,3" stroke={ink} strokeWidth={0.9} />
      </g>
    )
  if (kind === 'camel')
    return (
      <g className="cr-plod">
        <path d="M-8,-8 C-8,-12 -4,-14 -2,-11 C0,-14 4,-13 5,-9 C6,-7 4,-6 -6,-6Z" fill="#c9a26a" stroke={ink} strokeWidth={0.5} />
        <path d="M5,-9 C7,-10 8,-14 10,-14 L11,-13" stroke="#c9a26a" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <path d="M-6,-6 l0,6 M3,-6 l0,6" stroke={ink} strokeWidth={0.7} />
      </g>
    )
  return (
    <g className="cr-graze">
      <path d="M-6,-4 C-6,-8 4,-8 5,-5 C5,-3 -4,-2 -6,-4Z" fill="#8f8780" stroke={ink} strokeWidth={0.5} />
      <path d="M4,-6 L8,-8 L9,-5 L6,-4Z" fill="#8f8780" stroke={ink} strokeWidth={0.4} />
      <path d="M6,-8 l-1,-3 M7,-8 l0,-3" stroke="#8f8780" strokeWidth={0.8} />
      <path d="M-4,-3 l0,3 M3,-3 l0,3" stroke={ink} strokeWidth={0.7} />
    </g>
  )
}

function Eagle({ ink }: { ink: string }) {
  return (
    <g className="cr-soar">
      <path d="M0,0 C-6,-3 -12,-3 -18,0 C-12,-1 -6,1 0,2 C6,1 12,-1 18,0 C12,-3 6,-3 0,0Z" fill="#5a4030" stroke={ink} strokeWidth={0.4} />
      <circle cx={0} cy={-0.6} r={1.2} fill="#f4f2ec" />
    </g>
  )
}

function Geese({ ink }: { ink: string }) {
  return (
    <g className="cr-geese">
      {[[0, 0], [-8, -5], [-8, 5], [-16, -10], [-16, 10]].map(([x, y], i) => (
        <path key={i} d={`M${x - 4},${y - 2} L${x},${y} L${x - 4},${y + 2}`} stroke={ink} strokeWidth={0.9} fill="none" className="cr-flap" style={{ animationDelay: `${-i * 0.15}s` }} />
      ))}
    </g>
  )
}

function Bat({ ink }: { ink: string }) {
  return (
    <g className="cr-bat">
      <path className="cr-flap" d="M0,0 C-3,-3 -6,-4 -10,-2 C-8,-1 -7,1 -8,2 C-5,0 -3,1 0,2 C3,1 5,0 8,2 C7,1 8,-1 10,-2 C6,-4 3,-3 0,0Z" fill="#2a2632" stroke={ink} strokeWidth={0.3} />
    </g>
  )
}

// ---------- Nova the cat ----------

/** Nova's coat. Change these to match her. */
const NOVA = { coat: '#8f8a86', stripe: '#5d5854', light: '#efe9e2', eye: '#9cc46a' }

function Nova({ s, ink, groom }: Art & { groom: boolean }) {
  const c = s(NOVA.coat)
  const d = s(NOVA.stripe)
  const l = s(NOVA.light)
  return (
    <g>
      <ellipse cx={0} cy={1} rx={17} ry={3} fill="#000" opacity={0.15} />
      {/* tail wrapped round her feet; the tip flicks */}
      <path className="cr-tailflick" d="M-11,-2 C-21,-4 -21,5 -8,3.4 C2,2.4 9,3 14,1" stroke={c} strokeWidth={4.2} fill="none" strokeLinecap="round" />
      <path d="M-11,-2 C-21,-4 -21,5 -8,3.4 C2,2.4 9,3 14,1" stroke={ink} strokeWidth={0.5} fill="none" opacity={0.5} transform="translate(0,2.1)" />
      {/* body, haunch and white chest */}
      <path d="M-13,0 C-16,-10 -12,-22 -2,-26 C6,-28 12,-22 12,-12 C12,-6 11,-2 9,0Z" fill={c} stroke={ink} strokeWidth={1} />
      <path d="M-14,0 C-16,-8 -10,-13 -4,-12 C1,-11 2,-5 0,0Z" fill={c} stroke={ink} strokeWidth={0.9} />
      <path d="M-11,-8 q3,-1.5 5,0.4 M-12,-4 q3,-1.5 5,0.4 M-6,-20 q3,-2 6,-1" stroke={d} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <path d="M4,-22 C9,-18 10,-8 8,0 L2,0 C3.5,-8 3,-16 4,-22Z" fill={l} />
      {/* front legs; while grooming one paw comes up to her mouth */}
      <path d="M4,-11 L3.6,-0.6" stroke={c} strokeWidth={3.4} strokeLinecap="round" />
      <ellipse cx={3.8} cy={-0.4} rx={2.2} ry={1.2} fill={l} stroke={ink} strokeWidth={0.5} />
      <g className={groom ? 'cr-pawlift' : undefined}>
        <path d="M8.4,-11 L8.6,-0.6" stroke={c} strokeWidth={3.4} strokeLinecap="round" />
        <ellipse cx={8.8} cy={-0.4} rx={2.2} ry={1.2} fill={l} stroke={ink} strokeWidth={0.5} />
      </g>
      {/* head: dips to lick the paw, or looks about */}
      <g className={groom ? 'cr-lick' : 'cr-look'}>
        <path d="M-1,-38 L0.5,-46 L5,-40Z M10,-40 L14.6,-46 L15,-37.6Z" fill={c} stroke={ink} strokeWidth={0.9} strokeLinejoin="round" />
        <path d="M0.8,-39.6 L1.4,-43.6 L3.6,-40.6Z M11.4,-40.4 L13.8,-43.4 L14,-39Z" fill={s('#e9b4b4')} />
        <path d="M-2.4,-32 C-2.4,-38 2,-41.4 7,-41.4 C12.4,-41.4 16.4,-37.6 16.4,-32 C16.4,-26.6 12.4,-23.4 7,-23.4 C1.8,-23.4 -2.4,-26.6 -2.4,-32Z" fill={c} stroke={ink} strokeWidth={1} />
        <path d="M5,-40.6 l0.6,3.4 M8,-41 l0,3.6 M11,-40.4 l-0.6,3.2" stroke={d} strokeWidth={1.1} strokeLinecap="round" />
        <ellipse cx={7.2} cy={-27} rx={4.2} ry={2.8} fill={l} />
        {groom ? (
          <path d="M2.4,-31.6 q1.6,1.2 3.2,0 M9,-31.6 q1.6,1.2 3.2,0" stroke={ink} strokeWidth={0.9} fill="none" strokeLinecap="round" />
        ) : (
          <>
            <path d="M1.6,-31.6 C2.4,-33.6 5,-33.6 5.8,-31.6 C5,-29.6 2.4,-29.6 1.6,-31.6Z M8.6,-31.6 C9.4,-33.6 12,-33.6 12.8,-31.6 C12,-29.6 9.4,-29.6 8.6,-31.6Z" fill={NOVA.eye} stroke={ink} strokeWidth={0.5} />
            <path d="M3.7,-33 L3.7,-30.2 M10.7,-33 L10.7,-30.2" stroke="#141414" strokeWidth={1} strokeLinecap="round" />
            <circle cx={4.3} cy={-32.2} r={0.4} fill="#fff" /><circle cx={11.3} cy={-32.2} r={0.4} fill="#fff" />
          </>
        )}
        <path d="M6.2,-28.6 L8.2,-28.6 L7.2,-27.4Z" fill={s('#d98a92')} />
        <path d="M7.2,-27.4 q-1,1.4 -2.2,0.8 M7.2,-27.4 q1,1.4 2.2,0.8" stroke={ink} strokeWidth={0.5} fill="none" />
        <path d="M3,-27 l-6,-1 M3,-26 l-6,1.2 M11.4,-27 l6,-1 M11.4,-26 l6,1.2" stroke={ink} strokeWidth={0.3} opacity={0.7} />
        {groom && <path className="cr-tongue" d="M6.4,-25.8 q0.8,1.8 1.6,0Z" fill={s('#e98a9a')} />}
      </g>
    </g>
  )
}

// ---------- the farmer's fence post (he is never seen) ----------

function FarmPost({ s, ink, onTap, spin }: Art & { onTap: () => void; spin: number }) {
  const wood = s('#8b6a4c')
  const straw = s('#e9c66b')
  return (
    <g>
      <path d="M-40,-22 L40,-26 M-40,-10 L40,-14" stroke={wood} strokeWidth={3} strokeLinecap="round" />
      <path d="M-40,-22 L40,-26 M-40,-10 L40,-14" stroke={ink} strokeWidth={0.5} opacity={0.5} />
      {[-36, 36].map((x) => <path key={x} d={`M${x - 2.5},2 L${x - 2.5},-30 L${x + 2.5},-31 L${x + 2.5},2Z`} fill={wood} stroke={ink} strokeWidth={0.8} />)}
      {/* pitchfork leaning on the rail */}
      <path d="M20,2 L30,-46" stroke={s('#a07c58')} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M27,-44 L33,-58 M29,-45 L35,-58 M31,-46 L37,-57 M26.6,-45 L32,-47" stroke="#8a8f94" strokeWidth={0.9} />
      {/* his straw hat on the middle post, a stalk of hay tucked in the band */}
      <path d="M-2,2 L-2,-34 L3,-35 L3,2Z" fill={wood} stroke={ink} strokeWidth={0.8} />
      <g className="gs-tap" onClick={(e) => { e.stopPropagation(); onTap() }}>
        <rect x={-18} y={-52} width={38} height={24} fill="transparent" />
        <g key={spin} className={spin ? 'cr-hatspin' : 'cr-hatsway'}>
          <ellipse cx={0.5} cy={-35} rx={15} ry={3.6} fill={straw} stroke={ink} strokeWidth={0.8} />
          <path d="M-7,-35 C-7,-44 8,-44 8,-35Z" fill={straw} stroke={ink} strokeWidth={0.8} />
          <path d="M-7,-37 C-2,-38.4 3,-38.4 8,-37" stroke={s('#b0472e')} strokeWidth={2} fill="none" />
          <path d="M-12,-36 l3,0.4 M-5,-41 l2,1 M3,-41.6 l2,1.2 M10,-36.4 l3,-0.4" stroke={mix(straw, '#7a5a20', 0.5)} strokeWidth={0.5} />
          <path d="M6,-38 C10,-44 14,-47 18,-52" stroke={s('#d9b24a')} strokeWidth={0.9} fill="none" strokeLinecap="round" />
          <path d="M16,-50 l2,-1 M17,-48 l2,0" stroke={s('#d9b24a')} strokeWidth={0.6} />
        </g>
      </g>
    </g>
  )
}

// ---------- horses at the fallen apples ----------

function GrazingHorse({ s, ink }: Art) {
  const fur = s('#8a5a36')
  const dark = s('#3e2616')
  return (
    <g>
      <ellipse cx={0} cy={1} rx={34} ry={4} fill="#000" opacity={0.13} />
      <path d="M-30,-44 L-32,0 M22,-42 L24,0" stroke={dark} strokeWidth={4} strokeLinecap="round" />
      <path d="M-40,-58 C-52,-58 -58,-46 -60,-28 C-54,-36 -48,-44 -44,-50Z" fill={dark} stroke={ink} strokeWidth={1.2} className="gs-tail" />
      <path d="M-42,-58 C-32,-71 22,-71 34,-61 C41,-55 41,-45 33,-41 C14,-36 -26,-36 -38,-42 C-46,-46 -47,-53 -42,-58Z" fill={fur} stroke={ink} strokeWidth={1.6} />
      <path d="M-36,-44 L-38,0 M28,-42 L30,0" stroke={fur} strokeWidth={4.4} strokeLinecap="round" />
      {/* neck down to the grass, jaw chewing */}
      <g className="cr-munch">
        <path d="M24,-60 C34,-56 44,-36 50,-14 C52,-8 50,-4 46,-4 L38,-6 C36,-20 30,-36 22,-46Z" fill={fur} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M24,-60 C32,-58 40,-44 44,-30" stroke={dark} strokeWidth={4} fill="none" strokeLinecap="round" />
        <path d="M38,-24 L42,-30 L44,-22Z" fill={fur} stroke={ink} strokeWidth={1} />
        <circle cx={46} cy={-16} r={1.4} fill={ink} />
      </g>
    </g>
  )
}

function Apples({ n, s, ink }: Art & { n: number }) {
  const spots = [[-22, 0], [-6, 3], [10, -1], [26, 2], [38, 0], [-34, 2]]
  return (
    <g>
      {spots.slice(0, n).map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle cx={0} cy={-3} r={3.6} fill={s(i % 3 === 1 ? '#e5a23a' : '#cf3a2c')} stroke={ink} strokeWidth={0.6} />
          <path d="M0,-6.4 l0.6,-1.8" stroke={s('#5a3e2a')} strokeWidth={0.6} />
          <circle cx={-1.2} cy={-4.2} r={0.9} fill="#fff" opacity={0.5} />
        </g>
      ))}
    </g>
  )
}

/** Once the apple tree is fully grown, apples fall and now and then a horse wanders over to eat them. */
function AppleVisit({ pal, on }: { pal: Palette; on: boolean }) {
  const [apples, setApples] = useState(5)
  const [horse, setHorse] = useState(false)
  useEffect(() => {
    if (!on) return
    let t: ReturnType<typeof setTimeout>
    const cycle = () => {
      setHorse(true)
      let eaten = 0
      const eat = setInterval(() => {
        eaten++
        setApples((a) => Math.max(0, a - 1))
        if (eaten >= 3) clearInterval(eat)
      }, 3500)
      t = setTimeout(() => {
        setHorse(false)
        // a few more apples fall while the horse is away
        setTimeout(() => setApples(5), 15000)
        t = setTimeout(cycle, 45000 + Math.random() * 30000)
      }, 14000)
    }
    t = setTimeout(cycle, 8000)
    return () => clearTimeout(t)
  }, [on])
  const art = { s: pal.shade, ink: pal.c.ink }
  return (
    <g>
      <g transform="translate(600,584)"><Apples n={apples} {...art} /></g>
      {horse && (
        <g transform="translate(770,590) scale(-0.62,0.62)" className="cr-arrive">
          <GrazingHorse {...art} />
        </g>
      )}
    </g>
  )
}

// ---------- the frog and its flies (silent) ----------

/** A fly loops by the pond; every so often the frog's tongue flicks out and catches it. Frog sits at (302, 554). */
export function FrogFlies({ ink }: { ink: string }) {
  return (
    <g transform="translate(302,548)">
      <g className="cr-flyloop"><Fly ink={ink} /></g>
      <path className="cr-tongueflick" d="M0,-1 Q8,-12 16,-14" stroke="#e8788a" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </g>
  )
}

/** Herds on the far hills, drawn behind the plant and trees. */
export function FarLife({ pal, life, night, reduced }: { pal: Palette; life: number; night: number; reduced: boolean }) {
  if (reduced || night > 0.6) return null
  const ink = pal.c.ink
  const far = (x: number, line: typeof LINES.far) => yAt(line, x)
  return (
    <g>
      {/* far hills: herds grazing */}
      {life >= 0.6 && (
        <g>
          {[[150, 'sheep'], [168, 'sheep'], [186, 'sheep'], [300, 'goat'], [316, 'goat']].map(([x, k], i) => (
            <At key={i} x={x as number} y={far(x as number, LINES.far) + 2} k={0.9}><FarHerdAnimal kind={k as 'sheep'} ink={ink} /></At>
          ))}
        </g>
      )}
      {life >= 0.8 && (
        <g>
          {[[820, 'cow'], [848, 'cow'], [905, 'donkey']].map(([x, k], i) => (
            <At key={i} x={x as number} y={far(x as number, LINES.far) + 2} k={1} flip={i === 1}><FarHerdAnimal kind={k as 'cow'} ink={ink} /></At>
          ))}
          <g className="cr-caravan"><At x={0} y={far(500, LINES.farBack) + 1} k={0.8}><FarHerdAnimal kind="camel" ink={ink} /></At><At x={-18} y={far(500, LINES.farBack) + 1} k={0.8}><FarHerdAnimal kind="camel" ink={ink} /></At></g>
        </g>
      )}
    </g>
  )
}

// ---------- the whole cast ----------

export function Critters({ pal, life, night, stage, dead, reduced, onEgg }: { pal: Palette; life: number; night: number; stage: number; dead: boolean; reduced: boolean; onEgg: (name: string) => void }) {
  const art = { s: pal.shade, ink: pal.c.ink }
  const ink = pal.c.ink
  const nightOut = night > 0.6
  const [hat, setHat] = useState(0)
  const [groom, setGroom] = useState(true)
  // Nova grooms for a while, then looks around, then grooms again
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setGroom((g) => !g), 7000)
    return () => clearInterval(t)
  }, [reduced])
  if (reduced) return null
  return (
    <g>
      {/* sky */}
      {!nightOut && life >= 0.85 && <At x={0} y={120} k={1.3}><Eagle ink={ink} /></At>}
      {!nightOut && life >= 0.7 && <At x={0} y={170} k={1.2}><Geese ink={ink} /></At>}
      {nightOut && life >= 0.3 && (
        <>
          <At x={0} y={210} k={1.4}><Bat ink={ink} /></At>
          <g style={{ animationDelay: '-6s' }}><At x={0} y={250} k={1.1} cls="cr-bat-late"><Bat ink={ink} /></At></g>
          <At x={480} y={520} k={1.3}><g className="cr-mothloop"><Moth ink={ink} /></g></At>
          <At x={92} y={600} k={1.2}><Badger {...art} /></At>
        </>
      )}

      {/* the farmer's fence on the right, with his hat */}
      <At x={912} y={yAt(LINES.near, 912) + 10} k={1.7}>
        <FarmPost {...art} spin={hat} onTap={() => { setHat(Date.now()); onEgg('hat') }} />
        {!nightOut && life >= 0.5 && <At x={-24} y={-27} k={1}><Songbird body={pal.shade('#8a5a3a')} belly={pal.shade('#e2683a')} ink={ink} peck={false} /></At>}
        {!nightOut && life >= 0.75 && <At x={22} y={-29} k={0.95} flip><Dove ink={ink} /></At>}
        {!nightOut && life >= 0.85 && <At x={36} y={-32} k={0.95}><Crow ink={ink} /></At>}
        {!nightOut && life >= 0.7 && <At x={-36} y={-18} k={0.9}><Woodpecker ink={ink} /></At>}
      </At>

      {/* pond life */}
      {!nightOut && life >= 0.55 && (
        <>
          <g className="cr-swim"><At x={0} y={0}><g transform="translate(232,560)"><Duck {...art} /><g transform="translate(-14,1) scale(0.6)"><Duck {...art} baby /></g><g transform="translate(-24,1) scale(0.6)"><Duck {...art} baby /></g></g></At></g>
          <At x={192} y={548} k={1.5}><Kingfisher ink={ink} /></At>
          <At x={258} y={558} k={1.5}><Fish ink={ink} /></At>
        </>
      )}
      {!nightOut && life >= 0.75 && (
        <>
          <g className="cr-swim cr-swim-slow"><At x={0} y={0}><g transform="translate(300,562) scale(-1,1)"><Swan ink={ink} /></g></At></g>
          <At x={348} y={560} k={1.65}><Heron ink={ink} /></At>
          <At x={210} y={562} k={1.35}><Turtle {...art} /></At>
        </>
      )}
      {life >= 0.4 && !nightOut && <FrogFlies ink={ink} />}
      {life >= 0.5 && <At x={150} y={572} k={2.1}><Toad {...art} /></At>}

      {/* around the plant */}
      {stage >= 10 && !dead && <AppleVisit pal={pal} on={life >= 0.6 && !nightOut} />}
      {!dead && life >= 0.2 && (
        <At x={540} y={590} k={1.99}>
          <g className="gs-tap" onClick={(e) => { e.stopPropagation(); setGroom((g) => !g); onEgg('nova') }}>
            <rect x={-16} y={-42} width={34} height={44} fill="transparent" />
            <Nova {...art} groom={groom} />
          </g>
        </At>
      )}
      {!nightOut && life >= 0.6 && <At x={690} y={520} k={2.47}><Hummingbird ink={ink} /></At>}

      {/* foreground */}
      {!nightOut && life >= 0.3 && <At x={430} y={640} k={2.88}><AntTrail {...art} /></At>}
      {life >= 0.3 && <At x={760} y={652} k={2.88}><Ladybird {...art} /></At>}
      {life >= 0.35 && <At x={360} y={676} k={2.7}><Worm {...art} /></At>}
      {!nightOut && life >= 0.45 && <At x={840} y={630} k={2.7}><Caterpillar {...art} /></At>}
      {!nightOut && life >= 0.5 && <g className="cr-walkacross"><At x={0} y={668} k={2.7}><Beetle {...art} /></At></g>}
      {!nightOut && life >= 0.55 && <At x={250} y={650} k={2.7}><Grasshopper {...art} /></At>}
      {life >= 0.5 && <At x={60} y={470} k={2.34}><Spider ink={ink} /></At>}
      {!nightOut && life >= 0.6 && <At x={520} y={662} k={2.52}><Mouse {...art} /></At>}
      {!nightOut && life >= 0.6 && <g className="cr-tortoise"><At x={0} y={612} k={2.52}><Tortoise {...art} /></At></g>}
      {!nightOut && life >= 0.65 && <At x={950} y={600} k={2.34}><Lizard {...art} /></At>}
      {!nightOut && life >= 0.7 && <At x={700} y={660} k={2.52}><Chipmunk {...art} /></At>}
      {life >= 0.7 && <At x={120} y={652} k={2.52}><Mole {...art} /></At>}
      {!nightOut && life >= 0.55 && <At x={790} y={600} k={2.34}><Songbird body={pal.shade('#a88b6a')} belly={pal.shade('#efe0c8')} ink={ink} /></At>}
      {!nightOut && life >= 0.8 && <At x={470} y={605} k={2.34} flip><Songbird body={pal.shade('#4f7fc4')} belly={pal.shade('#e9a066')} ink={ink} /></At>}
      {!nightOut && life >= 0.6 && <At x={600} y={520} k={2.52}><g className="cr-beeloop"><Bumblebee ink={ink} /></g></At>}
      {!nightOut && life >= 0.65 && <At x={300} y={530} k={2.52}><g className="cr-damsel"><Damselfly ink={ink} /></g></At>}
      {!nightOut && life >= 0.7 && <At x={380} y={560} k={2.7}><g className="cr-flyabout"><ButterflySp wing={pal.shade('#f5f1e6')} spot="#333" ink={ink} /></g></At>}
      {!nightOut && life >= 0.85 && <At x={880} y={560} k={2.88}><g className="cr-flyabout cr-flyabout-2"><ButterflySp wing={pal.shade('#f2d24a')} spot="#1f2a44" ink={ink} /></g></At>}
    </g>
  )
}

/** Species drawn in the garden, for the count (and the playground). */
export const SPECIES = [
  'fox', 'rabbit', 'deer', 'squirrel', 'hedgehog', 'horse', 'elephant', 'skunk', 'ferret', 'monkey', 'owl', 'frog', 'dragonfly', 'snail', 'swallow', 'firefly', 'honeybee', 'painted butterfly',
  'ladybird', 'ant', 'earthworm', 'caterpillar', 'beetle', 'grasshopper', 'garden spider', 'bumblebee', 'fly', 'damselfly', 'moth', 'cabbage white', 'swallowtail',
  'mouse', 'tortoise', 'lizard', 'toad', 'chipmunk', 'mole', 'badger', 'robin', 'bluebird', 'sparrow', 'hummingbird', 'woodpecker', 'dove', 'crow', 'duck', 'duckling',
  'swan', 'heron', 'kingfisher', 'turtle', 'fish', 'sheep', 'goat', 'cow', 'donkey', 'camel', 'eagle', 'goose', 'bat', 'cat (Nova)',
] as const

// ---------- hidden secrets ----------

/** A four-leaf clover hidden in the long grass. */
export function Clover({ onTap, found }: { onTap: () => void; found: boolean }) {
  return (
    <g transform="translate(964,684) scale(1.5)" className="gs-tap" onClick={(e) => { e.stopPropagation(); onTap() }}>
      <rect x={-8} y={-14} width={16} height={18} fill="transparent" />
      <path d="M0,0 C0,-4 1,-6 0,-8" stroke="#3f7a35" strokeWidth={0.8} fill="none" />
      <g transform="translate(0,-9)" className={found ? 'cr-cloverglow' : undefined}>
        {[0, 90, 180, 270].map((a) => <path key={a} transform={`rotate(${a + 45})`} d="M0,0 C-2.4,-1 -3,-4 -1.2,-4.4 C-0.4,-4.6 0,-4 0,-3.4 C0,-4 0.4,-4.6 1.2,-4.4 C3,-4 2.4,-1 0,0Z" fill="#4f9a3f" stroke="#2c5a26" strokeWidth={0.35} />)}
      </g>
    </g>
  )
}

export type EggFx = { kind: 'rainbow' | 'hearts' | 'hay' | 'clover'; id: number }

export function EggEffects({ fx }: { fx: EggFx | null }) {
  if (!fx) return null
  if (fx.kind === 'rainbow')
    return (
      <g key={fx.id} className="cr-rainbow" style={{ mixBlendMode: 'screen' }}>
        {['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#9775fa'].map((c, i) => (
          <path key={c} d={`M${80 + i * 9},470 A${420 - i * 9},${330 - i * 9} 0 0 1 ${920 - i * 9},470`} stroke={c} strokeWidth={9} fill="none" opacity={0.42} />
        ))}
      </g>
    )
  if (fx.kind === 'hearts')
    return (
      <g key={fx.id} transform="translate(550,520)">
        {[0, 1, 2, 3].map((i) => (
          <path key={i} className="cr-heart" style={{ animationDelay: `${i * 0.25}s` }} transform={`translate(${(i - 1.5) * 8},0)`} d="M0,3 C-6,-2 -4,-7 0,-4 C4,-7 6,-2 0,3Z" fill="#ff7a9a" stroke="#c2405f" strokeWidth={0.5} />
        ))}
      </g>
    )
  if (fx.kind === 'hay')
    return (
      <g key={fx.id} transform="translate(905,440)">
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} className="cr-hay" style={{ animationDelay: `${(i % 7) * 0.12}s`, ['--dx' as string]: `${(i - 7) * 9}px` }} d="M0,0 l7,-3" stroke="#e2bd55" strokeWidth={1.4} strokeLinecap="round" />
        ))}
      </g>
    )
  return (
    <g key={fx.id} transform="translate(964,660)">
      <text className="cr-heart" textAnchor="middle" fontSize={16} fill="#2c5a26" style={{ fontFamily: '"Dancing Script", cursive', fontWeight: 600 }}>Lucky you!</text>
    </g>
  )
}
