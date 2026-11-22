// The small life of the garden, drawn with named parts (pt-*) so their stories (species*.tsx) can pose them:
// insects, little animals, birds, pond life, far herds, night creatures and Nova the cat. Also the farmer's fence
// with his hat (he is never seen) and the hidden secrets. Flies make no sound and there are no crickets.
import { useState } from 'react'
import { mix } from './ink'
import { useSid } from './ids'
import { LINES, yAt } from './Landscape'
import type { Palette } from './palette'
import './critters.css'

type S = (c: string) => string
export interface Art { s: S; ink: string; pose?: string }

// ---------- insects and tiny things ----------

export function Ladybird({ s, ink }: Art) {
  return (
    <g className="pt-body">
      <path className="pt-legs" d="M-3,0 l-1.4,1.4 M0,0 l0,1.6 M3,0 l1.4,1.4" stroke={ink} strokeWidth={0.5} />
      <g className="pt-buzz"><ellipse cx={-1} cy={-5.5} rx={4.2} ry={1.6} fill="#eef6ff" opacity={0.7} /></g>
      <g className="pt-shell-l"><path d="M0,-4.4 C-3,-4.4 -4,-2 -4,0 L0,0Z" fill={s('#d7322b')} stroke={ink} strokeWidth={0.6} /><circle cx={-2} cy={-2} r={0.8} fill={ink} /></g>
      <g className="pt-shell-r"><path d="M0,-4.4 C3,-4.4 4,-2 4,0 L0,0Z" fill={s('#d7322b')} stroke={ink} strokeWidth={0.6} /><circle cx={2} cy={-2.4} r={0.8} fill={ink} /><circle cx={1.8} cy={-0.8} r={0.6} fill={ink} /></g>
      <path d="M3.4,-1.2 C5,-2.6 6,-1.6 5.6,-0.4Z" fill={ink} />
    </g>
  )
}

export function Ant({ ink, crumb }: { ink: string; crumb?: boolean }) {
  return (
    <g className="pt-body">
      <circle cx={-2.6} cy={-1.4} r={1.4} fill={ink} /><circle cx={0} cy={-1.4} r={0.9} fill={ink} /><circle cx={2.1} cy={-1.7} r={1.1} fill={ink} />
      <path className="pt-legs" d="M-1,-1 l-1,1.6 M0,-1 l0,1.6 M1,-1 l1,1.6" stroke={ink} strokeWidth={0.4} />
      <path d="M2.6,-2.6 l1.2,-1.4" stroke={ink} strokeWidth={0.4} />
      {crumb && <circle cx={4.4} cy={-3.2} r={1.4} fill="#f2e2b8" stroke={ink} strokeWidth={0.3} />}
    </g>
  )
}

export function Worm({ s, ink }: Art) {
  return (
    <g>
      <ellipse cx={0} cy={1} rx={7} ry={1.6} fill={s('#7a5236')} />
      <g className="pt-worm" style={{ transformBox: 'view-box', transformOrigin: '0px 0px' }}>
        <path d="M-1,0 C-2,-5 0,-8 2,-9 C3,-9.5 4,-9 4,-8" stroke={s('#d98b84')} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <circle cx={3.2} cy={-8.6} r={0.4} fill={ink} />
      </g>
    </g>
  )
}

export function Caterpillar({ s, ink, pose }: Art) {
  if (pose === 'curl')
    return (
      <g className="pt-body">
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2
          return <circle key={i} cx={Math.cos(a) * 3} cy={-3.4 + Math.sin(a) * 3} r={1.9} fill={s(i === 4 ? '#3f8a3a' : '#5aa845')} stroke={ink} strokeWidth={0.45} />
        })}
      </g>
    )
  const rear = pose === 'eat' || pose === 'alert'
  return (
    <g className="pt-body">
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={-6 + i * 3} cy={-1.9 - (i === 2 ? 0.8 : 0)} r={1.9} fill={s('#5aa845')} stroke={ink} strokeWidth={0.45} />)}
      <g className="pt-head" transform={rear ? 'translate(-1,-3) rotate(-25 6 -2)' : undefined}>
        <circle cx={6.2} cy={-2.2} r={2.1} fill={s('#3f8a3a')} stroke={ink} strokeWidth={0.45} />
        <circle cx={7} cy={-2.8} r={0.45} fill={ink} />
        <path d="M6,-4 l-0.6,-1.6 M7,-4 l0.6,-1.6" stroke={ink} strokeWidth={0.35} />
      </g>
    </g>
  )
}

export function Leaf({ s, ink, bitten }: Art & { bitten?: number }) {
  const b = bitten ?? 0
  return (
    <g>
      <path d="M-14,0 C-8,-10 8,-10 14,0 C8,-3 -8,-3 -14,0Z" fill={s('#7bbf55')} stroke={ink} strokeWidth={0.7} />
      {b > 0 && <circle cx={9} cy={-4} r={1.8 + b} fill={s('#93c25f')} />}
    </g>
  )
}

export function Beetle({ s, ink }: Art) {
  const sh = s('#2f4f3a')
  return (
    <g className="pt-body">
      <path className="pt-legs" d="M-2,-0.4 l-1,1.6 M1,-0.4 l1,1.6 M3,-0.6 l1.4,1.4" stroke={ink} strokeWidth={0.5} />
      <g className="pt-buzz"><ellipse cx={-1} cy={-5.5} rx={4.6} ry={1.8} fill="#eef6ff" opacity={0.7} /></g>
      <g className="pt-shell-l"><path d="M0,-5.4 C-3,-5.4 -4.4,-4 -4.4,-2.6 C-4.4,-1 -2.5,0 0,0Z" fill={sh} stroke={ink} strokeWidth={0.6} /></g>
      <g className="pt-shell-r"><path d="M0,-5.4 C3,-5.4 4.4,-4 4.4,-2.6 C4.4,-1 2.5,0 0,0Z" fill={sh} stroke={ink} strokeWidth={0.6} /><path d="M1,-4.4 q2,-.6 3,1" stroke="#fff" strokeWidth={0.5} opacity={0.5} fill="none" /></g>
      <g className="pt-head">
        <circle cx={4.6} cy={-2.6} r={1.5} fill={ink} />
        <path d="M5.6,-3.4 l2,-1.6 M5.6,-2 l2,1" stroke={ink} strokeWidth={0.5} />
      </g>
    </g>
  )
}

export function Grasshopper({ s, ink, pose }: Art) {
  const g = s('#86b84a')
  return (
    <g className="pt-body">
      <path d="M-8,-3 C-4,-6 4,-6 7,-4 C6,-2 -4,-1 -8,-3Z" fill={g} stroke={ink} strokeWidth={0.6} />
      <g className="pt-leg-b" style={{ transformBox: 'view-box', transformOrigin: '-2px -4px' }}>
        <path d={pose === 'hop' ? 'M-2,-4 L-9,-6 L-15,-2' : 'M-2,-4 L-8,-10 L-11,-1'} stroke={mix(g, '#2a3a1a', 0.3)} strokeWidth={1.1} fill="none" strokeLinejoin="round" />
      </g>
      <g className="pt-head">
        <circle cx={6.6} cy={-4.4} r={1.1} fill={ink} />
        <path d="M7,-5 q5,-6 9,-5 M7,-5 q4,-7 7,-8" stroke={ink} strokeWidth={0.4} fill="none" />
      </g>
      <path className="pt-legs" d="M2,-2 l1,2 M4,-2 l1.4,2" stroke={ink} strokeWidth={0.5} />
    </g>
  )
}

export function Spider({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <circle cx={0} cy={0} r={1.8} fill={ink} /><circle cx={0} cy={-2.4} r={1.1} fill={ink} />
      <path className="pt-legs" d="M-1,0 l-3,-2 M-1,0.6 l-3,1 M1,0 l3,-2 M1,0.6 l3,1 M-1,1 l-2,3 M1,1 l2,3" stroke={ink} strokeWidth={0.4} />
    </g>
  )
}

export function Web({ grow }: { grow: boolean }) {
  return (
    <g stroke="#ffffff" strokeWidth={0.5} opacity={0.7} fill="none">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} pathLength={1} className={grow ? 'st-draw' : undefined} style={{ ['--d' as string]: '1.2s', animationDelay: `${i * 0.25}s` }} d={`M0,0 L${(Math.cos((i * Math.PI) / 4) * 16).toFixed(1)},${(Math.sin((i * Math.PI) / 4) * 16).toFixed(1)}`} />
      ))}
      {[4, 8, 12].map((r, j) => (
        <polygon key={r} pathLength={1} className={grow ? 'st-draw' : undefined} style={{ ['--d' as string]: '1.6s', animationDelay: `${2.2 + j * 1.2}s` }} points={[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `${(Math.cos((i * Math.PI) / 4) * r).toFixed(1)},${(Math.sin((i * Math.PI) / 4) * r).toFixed(1)}`).join(' ')} />
      ))}
    </g>
  )
}

export function Bumblebee({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <ellipse cx={0} cy={0} rx={4.4} ry={3.4} fill="#f1c232" stroke={ink} strokeWidth={0.6} />
      <path d="M-1.2,-3.2 L-1.2,3.2 M1.4,-3 L1.4,3" stroke={ink} strokeWidth={1.2} />
      <g className="pt-buzz"><ellipse cx={-1} cy={-4.2} rx={2.6} ry={1.6} fill="#ffffff" opacity={0.75} /></g>
    </g>
  )
}

export function Fly({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <ellipse cx={0} cy={0} rx={1.6} ry={1.1} fill={ink} />
      <g className="pt-buzz"><ellipse cx={-0.6} cy={-1.3} rx={1.4} ry={0.8} fill="#dfe8ef" opacity={0.8} /></g>
      <path className="pt-legs" d="M1,0.6 l1,1 M-1,0.6 l-0.6,1.2" stroke={ink} strokeWidth={0.3} />
    </g>
  )
}

export function Damselfly({ ink, color = '#3aa0d8' }: { ink: string; color?: string }) {
  return (
    <g className="pt-body">
      <path d="M-12,0 L4,0" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      <circle cx={5} cy={0} r={1.4} fill={mix(color, '#000', 0.25)} />
      <g className="pt-buzz" opacity={0.65}>
        <ellipse cx={0} cy={-2.6} rx={5} ry={1.1} fill="#e9f6ff" stroke={ink} strokeWidth={0.2} />
        <ellipse cx={-1} cy={-2.2} rx={4.4} ry={1} fill="#e9f6ff" stroke={ink} strokeWidth={0.2} transform="rotate(-14 -1 -2.2)" />
      </g>
    </g>
  )
}

export function Dragonfly({ s, ink }: Art) {
  const c = s('#2f7f9a')
  return (
    <g className="pt-body">
      <path d="M-11,0 L9,0" stroke={c} strokeWidth={2} strokeLinecap="round" />
      <circle cx={9} cy={0} r={1.9} fill={c} />
      <g className="pt-buzz">
        <ellipse cx={4} cy={-4} rx={2} ry={6.5} transform="rotate(-62 4 -4)" fill="#e9f6ff" opacity={0.75} stroke={ink} strokeWidth={0.3} />
        <ellipse cx={1} cy={-4} rx={2} ry={6.5} transform="rotate(62 1 -4)" fill="#e9f6ff" opacity={0.75} stroke={ink} strokeWidth={0.3} />
      </g>
    </g>
  )
}

export function Moth({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <g className="pt-bw-l"><path d="M0,0 C-6,-6 -9,-2 -7,2 C-5,4 -2,2 0,0Z" fill="#d9d0bd" stroke={ink} strokeWidth={0.4} /></g>
      <g className="pt-bw-r"><path d="M0,0 C6,-6 9,-2 7,2 C5,4 2,2 0,0Z" fill="#d9d0bd" stroke={ink} strokeWidth={0.4} /></g>
      <path d="M0,-2 L0,3" stroke={ink} strokeWidth={0.9} />
    </g>
  )
}

export function Firefly() {
  return (
    <g className="pt-body">
      <g className="pt-glow">
        <circle r={12} fill="#f6ff9a" opacity={0.22} />
        <circle r={5} fill="#e8ff8a" opacity={0.45} />
        <circle r={1.8} fill="#fdffc8" />
      </g>
    </g>
  )
}

// ---------- small animals ----------

export function Mouse({ s, ink, pose }: Art) {
  const up = pose === 'sit' || pose === 'eat'
  return (
    <g className="pt-body">
      <g className="pt-tail"><path d="M-7,-1 C-12,-1 -14,2 -18,1" stroke={s('#c4a49a')} strokeWidth={0.7} fill="none" /></g>
      <g transform={up ? 'rotate(-40 -6 0)' : undefined}>
        <path d="M-7,0 C-8,-6 -2,-8 3,-6 C6,-5 8,-3 8,-1 C6,0 -4,1 -7,0Z" fill={s('#9a8d80')} stroke={ink} strokeWidth={0.6} />
        <g className="pt-head">
          <circle cx={2} cy={-6.4} r={2} fill={s('#b8aa9c')} stroke={ink} strokeWidth={0.5} />
          <circle cx={5.6} cy={-3} r={0.5} fill={ink} /><circle cx={8.2} cy={-1.3} r={0.6} fill={s('#e8a0a0')} className="pt-nose" />
          <path d="M8,-1.4 l3,-1 M8,-1.2 l3,0.6" stroke={ink} strokeWidth={0.2} />
        </g>
        {up && <ellipse cx={7.5} cy={-0.5} rx={1.2} ry={0.8} fill="#e8d6a0" stroke={ink} strokeWidth={0.3} />}
      </g>
    </g>
  )
}

export function Tortoise({ s, ink, pose }: Art) {
  const hide = pose === 'hide'
  return (
    <g className="pt-body">
      <g className="pt-head" style={{ transition: 'transform .5s', transform: hide ? 'translateX(-6px) scale(.5)' : undefined }}>
        <path d="M8,-3 C11,-6 15,-6 16,-3 C15,-1 11,-1 8,-2Z" fill={s('#a3a06a')} stroke={ink} strokeWidth={0.6} />
        <circle cx={13.6} cy={-4} r={0.5} fill={ink} />
      </g>
      <path className="pt-leg-a" d="M-8,-1 l-1,2" stroke={s('#8b8858')} strokeWidth={2} strokeLinecap="round" style={hide ? { opacity: 0 } : undefined} />
      <path className="pt-leg-b" d="M6,-1 l1,2" stroke={s('#8b8858')} strokeWidth={2} strokeLinecap="round" style={hide ? { opacity: 0 } : undefined} />
      <path d="M-10,-1 C-10,-11 8,-11 9,-1Z" fill={s('#7a6b3e')} stroke={ink} strokeWidth={0.8} />
      <path d="M-6,-2 L-3,-8 L3,-8 L6,-2 M-3,-8 L-1,-2 M3,-8 L1,-2" stroke={mix('#7a6b3e', '#f2deaa', 0.4)} strokeWidth={0.6} fill="none" />
    </g>
  )
}

export function Lizard({ s, ink }: Art) {
  const c = s('#7da35a')
  return (
    <g className="pt-body">
      <g className="pt-tail"><path d="M-6,-1 C-12,0 -16,2 -21,1" stroke={c} strokeWidth={1.2} fill="none" strokeLinecap="round" /></g>
      <path d="M-6,-1 C0,-3 8,-4 12,-2 C12,-1 6,0 -6,0Z" fill={c} stroke={ink} strokeWidth={0.5} />
      <path className="pt-legs" d="M-3,-0.6 l-2,1.6 M5,-1 l2,1.6" stroke={c} strokeWidth={0.8} />
      <g className="pt-head"><path d="M10,-2.6 C12,-3.6 15,-3 16,-1.8 C15,-1 12,-0.8 10,-1.2Z" fill={c} stroke={ink} strokeWidth={0.4} /><circle cx={13} cy={-2.4} r={0.45} fill={ink} /></g>
    </g>
  )
}

export function Toad({ s, ink }: Art) {
  return (
    <g className="pt-body">
      <ellipse cx={3} cy={-2.2} rx={2.6} ry={1.6} fill={s('#f2e6b0')} className="pt-throat" />
      <path d="M-7,0 C-8,-6 -4,-9 0,-9 C5,-9 8,-6 7,0Z" fill={s('#8a7a4a')} stroke={ink} strokeWidth={0.7} />
      <circle cx={-3} cy={-5} r={0.8} fill={s('#6e5e36')} /><circle cx={2} cy={-3} r={0.9} fill={s('#6e5e36')} />
      <g className="pt-head"><circle cx={4} cy={-8.4} r={1.6} fill={s('#8a7a4a')} stroke={ink} strokeWidth={0.5} /><circle cx={4.3} cy={-8.6} r={0.7} fill="#c48a16" /></g>
    </g>
  )
}

export function Chipmunk({ s, ink, pose }: Art) {
  const up = pose === 'sit' || pose === 'stuff' || pose === 'alert'
  return (
    <g className="pt-body">
      <g className="pt-tail"><path d="M-6,-2 C-12,-4 -13,-12 -9,-14 C-6,-15 -6,-11 -7,-8" fill="none" stroke={s('#8a5a32')} strokeWidth={2.6} strokeLinecap="round" /></g>
      <g transform={up ? 'rotate(-25 -4 0)' : undefined}>
        <path d="M-6,0 C-7,-7 -2,-10 3,-9 C6,-8 6,-3 4,0Z" fill={s('#b07a48')} stroke={ink} strokeWidth={0.6} />
        <path d="M-4,-7 C-2,-8 1,-8 3,-7" stroke={s('#f2e2c4')} strokeWidth={0.9} fill="none" />
        <g className="pt-head">
          <circle cx={4} cy={-10} r={3} fill={s('#b07a48')} stroke={ink} strokeWidth={0.5} />
          <circle cx={5.4} cy={-10.6} r={0.55} fill={ink} />
          <circle cx={5} cy={-8.4} r={1.6} fill={s('#c98a52')} stroke={ink} strokeWidth={0.3} className="pt-cheek" />
        </g>
      </g>
      <path className="pt-leg-a" d="M-4,0 l-1,1 M2,0 l1,1" stroke={s('#7a4a24')} strokeWidth={1} />
    </g>
  )
}

export function Mole({ s, ink }: Art) {
  return (
    <g className="pt-body">
      <path d="M-4,0 C-4,-6 4,-6 4,0Z" fill={s('#3b3436')} stroke={ink} strokeWidth={0.5} />
      <ellipse cx={0} cy={-5.6} rx={1.4} ry={1} fill={s('#e8a0a8')} className="pt-nose" />
      <path d="M-5,-1 l-2,1 M5,-1 l2,1" stroke={s('#e8c0c0')} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  )
}

export function Molehill({ s, ink }: Art) {
  return <path d="M-12,0 C-8,-8 8,-8 12,0Z" fill={s('#7b5a3c')} stroke={ink} strokeWidth={0.6} />
}

export function Snail({ s, ink, pose }: Art) {
  const hide = pose === 'hide'
  return (
    <g className="pt-body">
      <g style={{ transition: 'transform .6s', transform: hide ? 'scaleX(.35)' : undefined, transformBox: 'view-box', transformOrigin: '0px 0px' }}>
        <path d="M-7,1 C-7,-1 4,-1 8,0 C10,1 6,2 -7,1Z" fill={s('#c9b79a')} stroke={ink} strokeWidth={0.6} />
        <g className="pt-head" style={{ transition: 'transform .6s', transform: hide ? 'scaleY(0)' : undefined }}>
          <path d="M8,0 L10,-4 M8,0 L11.4,-3" stroke={s('#b8a688')} strokeWidth={0.9} strokeLinecap="round" />
          <circle cx={10} cy={-4.2} r={0.6} fill={ink} /><circle cx={11.6} cy={-3.2} r={0.6} fill={ink} />
        </g>
      </g>
      <circle cx={-1} cy={-4} r={4.8} fill={s('#b07a45')} stroke={ink} strokeWidth={0.7} />
      <path d="M-1,-4 m-2.6,0 a2.6,2.6 0 1 1 2.6,2.6 a1.4,1.4 0 1 1 -1.4,-1.4" stroke={ink} strokeWidth={0.6} fill="none" />
    </g>
  )
}

// ---------- birds ----------

/** A small bird side-on: head pecks, wing flaps (fly), tail flicks. */
export function Songbird({ body, belly, ink, pose }: { body: string; belly: string; ink: string; pose?: string }) {
  const flying = pose === 'fly' || pose === 'glide' || pose === 'hover'
  return (
    <g className="pt-body">
      <g className="pt-tail"><path d="M-6,-6 L-11,-4 L-6,-4Z" fill={body} stroke={ink} strokeWidth={0.5} /></g>
      <ellipse cx={-1} cy={-6} rx={6} ry={4.4} fill={body} stroke={ink} strokeWidth={0.6} />
      <path d="M1,-5 C3,-3 5,-4 5,-6 C4,-8 2,-8 1,-5Z" fill={belly} className="pt-throat" style={{ transformOrigin: '50% 50%' }} />
      <g className="pt-wing" style={{ transformBox: 'view-box', transformOrigin: '1px -8px' }}>
        <path d={flying ? 'M1,-8 C-3,-16 -9,-16 -11,-12 C-6,-11 -3,-9 -1,-6Z' : 'M2,-7 C-1,-9 -6,-8 -7,-5 C-4,-4 -1,-4 2,-5Z'} fill={mix(body, '#000', 0.12)} stroke={ink} strokeWidth={0.5} />
      </g>
      <g className="pt-head">
        <circle cx={4} cy={-9} r={3} fill={body} stroke={ink} strokeWidth={0.6} />
        <path d={pose === 'sing' || pose === 'coo' ? 'M6.8,-9.8 L9.4,-10.4 M6.8,-8.6 L9.4,-7.8' : 'M6.8,-9.4 L9.4,-8.6 L6.8,-8Z'} fill="#e2a33a" stroke="#c48a2a" strokeWidth={0.6} />
        <circle cx={4.8} cy={-9.6} r={0.6} fill={ink} />
        {pose === 'tug' && <path d="M9,-8.6 q3,3 1,7 q-1,2 1,4" stroke="#d98b84" strokeWidth={1.1} fill="none" strokeLinecap="round" />}
      </g>
      {!flying && <path d="M-1,-1.6 l-1,2 M1,-1.6 l1,2" stroke={ink} strokeWidth={0.5} />}
    </g>
  )
}

export function Hummingbird({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <path d="M-5,0 C-3,-3 3,-3 4,-1 C3,1 -3,1 -5,0Z" fill="#3fa36b" stroke={ink} strokeWidth={0.4} />
      <path d="M-5,0 L-9,2 L-8,-1Z" fill="#2c7a50" />
      <g className="pt-head"><circle cx={4} cy={-1.4} r={1.6} fill="#c43b6a" /><path d="M5.4,-1.6 L11,-2" stroke={ink} strokeWidth={0.5} /></g>
      <g className="pt-buzz"><ellipse cx={-1} cy={-3.6} rx={1.6} ry={4} fill="#e9f6ff" opacity={0.6} /></g>
    </g>
  )
}

export function Woodpecker({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <path d="M-2,4 C-5,0 -5,-8 -2,-11 C1,-12 3,-9 3,-6 C3,-1 1,3 -2,4Z" fill="#2d2d2d" stroke={ink} strokeWidth={0.5} />
      <path d="M-1,-3 l2,1 M-1,-6 l2,1" stroke="#f4f2ec" strokeWidth={0.8} />
      <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '0px -9px' }}>
        <circle cx={1} cy={-11} r={2.4} fill="#f4f2ec" stroke={ink} strokeWidth={0.4} />
        <path d="M-1,-13.6 C0,-14.6 2,-14.4 2.6,-13" fill="#d23b2b" />
        <path d="M3.2,-11 L6.8,-10.6" stroke={ink} strokeWidth={0.8} />
      </g>
    </g>
  )
}

export function Duck({ s, ink, baby }: Art & { baby?: boolean }) {
  const body = baby ? '#f3d65a' : '#9a7a52'
  return (
    <g className="pt-body">
      <path d="M-8,0 C-9,-5 -2,-6 4,-4 C7,-3 7,0 5,0Z" fill={s(body)} stroke={ink} strokeWidth={0.6} />
      <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '3px -3px' }}>
        <circle cx={4} cy={-6} r={2.8} fill={s(baby ? body : '#2f7a4a')} stroke={ink} strokeWidth={0.5} />
        <path d="M6.6,-6 L9.4,-5.4 L6.6,-4.8Z" fill="#e6a032" />
        <circle cx={4.6} cy={-6.6} r={0.5} fill={ink} />
      </g>
      {!baby && <path d="M2,-3.4 L4.6,-3.6" stroke="#f4f2ec" strokeWidth={0.7} />}
      <g className="pt-wing" style={{ transformBox: 'view-box', transformOrigin: '0px -3px' }}><path d="M0,-3 C-3,-5 -6,-4 -6,-2 C-4,-1 -2,-1 0,-2Z" fill={s(mix(body, '#000', 0.12))} /></g>
    </g>
  )
}

export function Swan({ ink, pose }: { ink: string; pose?: string }) {
  return (
    <g className="pt-body">
      {pose === 'wings' && <path d="M-12,-5 C-14,-16 -4,-20 2,-10 C-2,-14 -8,-12 -6,-6Z" fill="#fbfbf6" stroke={ink} strokeWidth={0.6} className="st-grow" />}
      <path d="M-14,0 C-16,-8 -6,-10 4,-6 C8,-4 8,0 6,0Z" fill="#fbfbf6" stroke={ink} strokeWidth={0.7} />
      <path d="M-10,-6 C-6,-12 0,-10 2,-7" stroke="#e6e6de" strokeWidth={1.2} fill="none" />
      <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '4px -5px' }}>
        <path d="M4,-5 C8,-10 6,-18 9,-20 C11,-21 13,-20 12,-18" stroke="#fbfbf6" strokeWidth={2.6} fill="none" strokeLinecap="round" />
        <path d="M4,-5 C8,-10 6,-18 9,-20" stroke={ink} strokeWidth={0.4} fill="none" transform="translate(1.2,0)" />
        <path d="M12,-19 L15.4,-17.6 L12.4,-17Z" fill="#e2732e" />
        <circle cx={10.4} cy={-19.4} r={0.5} fill={ink} />
      </g>
    </g>
  )
}

export function Heron({ ink, pose }: { ink: string; pose?: string }) {
  const flying = pose === 'fly' || pose === 'glide'
  return (
    <g className="pt-body">
      {flying ? (
        <path d="M-1,-14 L-12,-10 M2,-14 L-10,-11" stroke="#7a7a72" strokeWidth={0.8} />
      ) : (
        <g><path className="pt-leg-a" d="M-1,-14 L-1,0" stroke="#7a7a72" strokeWidth={0.8} /><path className="pt-leg-b" d="M2,-14 L1,0" stroke="#7a7a72" strokeWidth={0.8} /></g>
      )}
      {flying && <g className="pt-wing" style={{ transformBox: 'view-box', transformOrigin: '0px -20px' }}><path d="M2,-20 C-4,-34 -14,-36 -20,-30 C-12,-28 -6,-24 -2,-17Z" fill="#a8b2b8" stroke={ink} strokeWidth={0.6} /></g>}
      <path d="M-8,-16 C-8,-24 4,-26 6,-20 C6,-16 2,-14 -3,-14 Z" fill="#b8c2c8" stroke={ink} strokeWidth={0.6} />
      <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '4px -21px' }}>
        <path d={flying ? 'M4,-21 C8,-24 9,-24 12,-22' : 'M4,-21 C8,-26 4,-32 7,-36'} stroke="#d6dde0" strokeWidth={2} fill="none" strokeLinecap="round" />
        <g transform={flying ? 'translate(6,13)' : undefined}>
          <circle cx={7.4} cy={-36.4} r={2} fill="#eef1f2" stroke={ink} strokeWidth={0.4} />
          <path d="M6,-37.6 L1,-38" stroke="#222" strokeWidth={0.8} />
          <path d="M9,-36.6 L16,-35.4" stroke="#d9a33a" strokeWidth={0.9} />
          <circle cx={8} cy={-37} r={0.4} fill={ink} />
          {pose === 'gulp' && <path d="M14,-36 l4,1 l-1,-2Z" fill="#e8873a" />}
        </g>
      </g>
    </g>
  )
}

export function Kingfisher({ ink, fish }: { ink: string; fish?: boolean }) {
  return (
    <g className="pt-body">
      <g className="pt-tail"><path d="M-4,-2 L-8,1 L-5,1Z" fill="#1f6f9f" /></g>
      <path d="M-4,-2 C-6,-8 0,-11 3,-9 C5,-7 4,-3 2,-1Z" fill="#2a8fc9" stroke={ink} strokeWidth={0.5} />
      <path d="M0,-3 C2,-3 3,-5 3,-7" stroke="#e8823a" strokeWidth={2} fill="none" />
      <g className="pt-wing" style={{ transformBox: 'view-box', transformOrigin: '0px -7px' }}><path d="M1,-7 C-2,-9 -5,-8 -5,-5 C-3,-4 -1,-4 1,-5Z" fill="#1f78b0" /></g>
      <g className="pt-head">
        <circle cx={2} cy={-10} r={2.4} fill="#2a8fc9" stroke={ink} strokeWidth={0.4} />
        <path d="M4,-10.6 L9,-10 L4,-9.4Z" fill="#222" />
        <circle cx={2.6} cy={-10.4} r={0.45} fill={ink} />
        {fish && <path d="M8,-10 l4,0.6 l1,-1.4 l0,3 l-1,-1.2 l-4,0.6Z" fill="#c7cfd6" stroke={ink} strokeWidth={0.3} />}
      </g>
    </g>
  )
}

export function Turtle({ s, ink }: Art) {
  return (
    <g className="pt-body">
      <path d="M-6,-1 C-6,-7 6,-7 6,-1Z" fill={s('#4f6a3a')} stroke={ink} strokeWidth={0.6} />
      <path d="M-3,-2 L0,-5.6 L3,-2" stroke={mix('#4f6a3a', '#e8e0b0', 0.4)} strokeWidth={0.5} fill="none" />
      <g className="pt-head"><path d="M6,-2 C8,-3 10,-3 10,-1.6" stroke={s('#7a9a4a')} strokeWidth={1.6} fill="none" strokeLinecap="round" /></g>
      <path className="pt-leg-a" d="M-5,-1 l-2,1.4 M4,-1 l2,1.4" stroke={s('#7a9a4a')} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  )
}

export function Log({ s, ink }: Art) {
  return <path d="M-16,1 C-16,-3 14,-4 16,0 C14,3 -14,4 -16,1Z" fill={s('#7a5e3e')} stroke={ink} strokeWidth={0.6} />
}

export function Fish({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <path d="M-6,0 C-3,-4 3,-4 6,0 C3,4 -3,4 -6,0Z M-6,0 L-10,-3 L-10,3Z" fill="#e8873a" stroke={ink} strokeWidth={0.5} />
      <circle cx={3} cy={-0.6} r={0.5} fill={ink} />
    </g>
  )
}

export type Herd = 'sheep' | 'lamb' | 'goat' | 'cow' | 'camel' | 'donkey'
/** Tiny distant animals, simple and readable from far away; the head nods down to graze. */
export function FarHerdAnimal({ kind, ink }: { kind: Herd; ink: string }) {
  const legs = (c: string, w = 0.8) => <path className="pt-legs" d="M-4,-2 l0,2.4 M3,-2 l0,2.4" stroke={c} strokeWidth={w} />
  if (kind === 'sheep' || kind === 'lamb')
    return (
      <g className="pt-body" transform={kind === 'lamb' ? 'scale(.65)' : undefined}>
        {legs('#3a3330')}
        <path d="M-6,-3 C-7,-8 -1,-10 3,-8 C7,-8 8,-4 5,-2 C2,-1 -4,-1 -6,-3Z" fill="#f6f3ea" stroke={ink} strokeWidth={0.5} />
        <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '4px -5px' }}><ellipse cx={6} cy={-4.6} rx={1.8} ry={1.3} fill="#3a3330" /></g>
      </g>
    )
  if (kind === 'goat')
    return (
      <g className="pt-body">
        {legs(ink, 0.7)}
        <path d="M-6,-4 C-6,-8 4,-8 5,-5 C5,-3 -4,-2 -6,-4Z" fill="#d9cdb8" stroke={ink} strokeWidth={0.5} />
        <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '4px -6px' }}>
          <path d="M4,-6 L7,-9 L8,-6Z" fill="#d9cdb8" stroke={ink} strokeWidth={0.4} />
          <path d="M7,-9 q-2,-3 -3,-3 M8,-6 l0,2" stroke={ink} strokeWidth={0.5} fill="none" />
        </g>
      </g>
    )
  if (kind === 'cow')
    return (
      <g className="pt-body">
        {legs(ink, 0.9)}
        <g className="pt-tail"><path d="M-8,-6 q-2,2 -1.4,5" stroke={ink} strokeWidth={0.5} fill="none" /></g>
        <path d="M-8,-5 C-8,-10 6,-10 7,-6 C7,-3 -6,-2 -8,-5Z" fill="#f4f0e6" stroke={ink} strokeWidth={0.5} />
        <ellipse cx={-3} cy={-7} rx={2.4} ry={1.6} fill="#3a3330" /><ellipse cx={3} cy={-6} rx={1.6} ry={1.2} fill="#3a3330" />
        <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '6px -6px' }}><path d="M7,-7 C9,-8 11,-6 10,-4 L7,-4Z" fill="#f4f0e6" stroke={ink} strokeWidth={0.4} /></g>
      </g>
    )
  if (kind === 'camel')
    return (
      <g className="pt-body">
        <path className="pt-legs" d="M-6,-6 l0,6 M3,-6 l0,6" stroke={ink} strokeWidth={0.7} />
        <path d="M-8,-8 C-8,-12 -4,-14 -2,-11 C0,-14 4,-13 5,-9 C6,-7 4,-6 -6,-6Z" fill="#c9a26a" stroke={ink} strokeWidth={0.5} />
        <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '5px -9px' }}><path d="M5,-9 C7,-10 8,-14 10,-14 L11,-13" stroke="#c9a26a" strokeWidth={1.8} fill="none" strokeLinecap="round" /></g>
      </g>
    )
  return (
    <g className="pt-body">
      {legs(ink, 0.7)}
      <g className="pt-tail"><path d="M-6,-5 q-2,2 -1,4" stroke={ink} strokeWidth={0.5} fill="none" /></g>
      <path d="M-6,-4 C-6,-8 4,-8 5,-5 C5,-3 -4,-2 -6,-4Z" fill="#8f8780" stroke={ink} strokeWidth={0.5} />
      <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '4px -6px' }}>
        <path d="M4,-6 L8,-8 L9,-5 L6,-4Z" fill="#8f8780" stroke={ink} strokeWidth={0.4} />
        <g className="pt-ear"><path d="M6,-8 l-1,-3 M7,-8 l0,-3" stroke="#8f8780" strokeWidth={0.8} /></g>
      </g>
    </g>
  )
}

/** Sky birds seen from below: wings flap (fly) or hold still (glide). */
export function Eagle({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <g className="pt-flap"><path d="M0,0 C-6,-3 -12,-3 -18,0 C-12,-1 -6,1 0,2 C6,1 12,-1 18,0 C12,-3 6,-3 0,0Z" fill="#5a4030" stroke={ink} strokeWidth={0.4} /></g>
      <circle cx={0} cy={-0.6} r={1.2} fill="#f4f2ec" />
    </g>
  )
}

export function Goose({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <path d="M-5,0 L4,0" stroke={ink} strokeWidth={1.2} strokeLinecap="round" />
      <g className="pt-flap"><path d="M-2,0 L-4,-4 M-2,0 L-4,4" stroke={ink} strokeWidth={0.9} fill="none" strokeLinecap="round" /></g>
    </g>
  )
}

export function Swallow({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <path d="M-6,0 L-11,-2 M-6,0 L-11,2" stroke={ink} strokeWidth={0.9} strokeLinecap="round" />
      <ellipse cx={-1} cy={0} rx={5} ry={1.6} fill="#2a3550" />
      <circle cx={4} cy={0} r={1.4} fill="#b8503a" />
      <g className="pt-flap"><path d="M-9,1 Q-4,-7 0,0 Q4,-7 9,1" fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" transform="translate(-1,0)" /></g>
    </g>
  )
}

export function Bat({ ink }: { ink: string }) {
  return (
    <g className="pt-body">
      <g className="pt-flap"><path d="M0,0 C-3,-3 -6,-4 -10,-2 C-8,-1 -7,1 -8,2 C-5,0 -3,1 0,2 C3,1 5,0 8,2 C7,1 8,-1 10,-2 C6,-4 3,-3 0,0Z" fill="#2a2632" stroke={ink} strokeWidth={0.3} /></g>
      <path d="M-1,-1 l0.4,-1.4 M1,-1 l-0.4,-1.4" stroke="#2a2632" strokeWidth={0.6} />
    </g>
  )
}

// ---------- Nova the cat ----------

/** Nova is a dilute calico: a white cat with soft blue-grey and cream (blonde) patches, and green eyes. */
export const NOVA = { white: '#f6f2ec', grey: '#9ea3aa', greyDark: '#83888f', cream: '#ecc995', eye: '#9cc46a' }
const BODY = 'M-13,0 C-16,-10 -12,-22 -2,-26 C6,-28 12,-22 12,-12 C12,-6 11,-2 9,0Z'
const HAUNCH = 'M-14,0 C-16,-8 -10,-13 -4,-12 C1,-11 2,-5 0,0Z'
const HEAD = 'M-2.4,-32 C-2.4,-38 2,-41.4 7,-41.4 C12.4,-41.4 16.4,-37.6 16.4,-32 C16.4,-26.6 12.4,-23.4 7,-23.4 C1.8,-23.4 -2.4,-26.6 -2.4,-32Z'

/** Nova sitting. Poses: sit (looks about, tail flicks), look, groom (paw up, licks), blink (slow cat blink). */
export function Nova({ s, ink, pose = 'sit' }: Art) {
  const sid = useSid()
  const groom = pose === 'groom'
  const shut = groom || pose === 'blink'
  const w = s(NOVA.white)
  const g = s(NOVA.grey)
  const cr = s(NOVA.cream)
  const tail = 'M-11,-2 C-21,-4 -21,5 -8,3.4 C2,2.4 9,3 14,1'
  return (
    <g>
      <defs>
        <clipPath id={`${sid}-nb`}><path d={BODY} /><path d={HAUNCH} /></clipPath>
        <clipPath id={`${sid}-nh`}><path d={HEAD} /></clipPath>
      </defs>
      <g className="cr-tailflick">
        <path d={tail} stroke={g} strokeWidth={4.2} fill="none" strokeLinecap="round" />
        <path d="M-17,-1 C-19,1 -17,3.6 -12,3.6" stroke={cr} strokeWidth={4.2} fill="none" strokeLinecap="round" />
      </g>
      <path d={tail} stroke={ink} strokeWidth={0.5} fill="none" opacity={0.5} transform="translate(0,2.1)" />
      <path d={BODY} fill={w} />
      <path d={HAUNCH} fill={w} />
      <g clipPath={`url(#${sid}-nb)`}>
        <path d="M-18,-14 C-12,-30 4,-32 8,-24 C6,-18 -2,-16 -6,-12 C-10,-8 -14,-8 -18,-8Z" fill={g} />
        <path d="M-6,-12 C-2,-16 4,-18 8,-17 C9,-13 5,-10 0,-9 C-3,-9 -5,-10 -6,-12Z" fill={cr} />
        <path d="M-18,-6 C-14,-10 -8,-11 -5,-8 C-4,-4 -8,0 -14,1 L-18,1Z" fill={cr} />
        <path d="M-10,-4 C-7,-6 -3,-6 -1,-3 C-2,0 -6,1 -9,0Z" fill={g} />
      </g>
      <path d={BODY} fill="none" stroke={ink} strokeWidth={1} />
      <path d={HAUNCH} fill="none" stroke={ink} strokeWidth={0.9} />
      <path d="M4,-11 L3.6,-0.6" stroke={w} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M4,-11 L3.6,-0.6" stroke={ink} strokeWidth={0.4} opacity={0.4} transform="translate(-1.8,0)" />
      <ellipse cx={3.8} cy={-0.4} rx={2.2} ry={1.2} fill={w} stroke={ink} strokeWidth={0.5} />
      <g className={groom ? 'cr-pawlift' : undefined}>
        <path d="M8.4,-11 L8.6,-0.6" stroke={w} strokeWidth={3.4} strokeLinecap="round" />
        <path d="M8.4,-11 L8.6,-0.6" stroke={ink} strokeWidth={0.4} opacity={0.4} transform="translate(1.8,0)" />
        <ellipse cx={8.8} cy={-0.4} rx={2.2} ry={1.2} fill={w} stroke={ink} strokeWidth={0.5} />
      </g>
      <g className={groom ? 'cr-lick' : 'pt-head'}>
        <path d="M-1,-38 L0.5,-46 L5,-40Z" fill={g} stroke={ink} strokeWidth={0.9} strokeLinejoin="round" />
        <path d="M10,-40 L14.6,-46 L15,-37.6Z" fill={cr} stroke={ink} strokeWidth={0.9} strokeLinejoin="round" />
        <path d="M0.8,-39.6 L1.4,-43.6 L3.6,-40.6Z M11.4,-40.4 L13.8,-43.4 L14,-39Z" fill={s('#e9b4b4')} />
        <path d={HEAD} fill={w} />
        <g clipPath={`url(#${sid}-nh)`}>
          <path d="M-4,-44 L7.6,-44 C7,-38 6.4,-33 5,-30 C2,-28 -1,-29 -4,-30Z" fill={g} />
          <path d="M7.6,-44 L19,-44 L19,-29 C15,-28 12,-29 10,-31 C9,-35 8.6,-39 7.6,-44Z" fill={cr} />
          <path d="M7,-42 C6,-37 6.4,-33 7.2,-30" stroke={w} strokeWidth={1.6} fill="none" />
        </g>
        <path d={HEAD} fill="none" stroke={ink} strokeWidth={1} />
        <ellipse cx={7.2} cy={-27} rx={4.2} ry={2.8} fill={w} />
        {shut ? (
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

/** Where things sit on the fence, in scene units. */
export const FENCE = (() => {
  const x = 912
  const base = yAt(LINES.near, x) + 10
  const k = 1.7
  return { x, base, k, postL: [x - 36 * k, base - 31 * k] as [number, number], postR: [x + 36 * k, base - 31 * k] as [number, number], rail: (lx: number) => [x + lx * k, base - (22 + ((lx + 40) / 80) * 4) * k - 1] as [number, number] }
})()

function FarmPost({ s, ink, onTap, spin }: Art & { onTap: () => void; spin: number }) {
  const wood = s('#8b6a4c')
  const straw = s('#e9c66b')
  return (
    <g>
      <path d="M-40,-22 L40,-26 M-40,-10 L40,-14" stroke={wood} strokeWidth={3} strokeLinecap="round" />
      <path d="M-40,-22 L40,-26 M-40,-10 L40,-14" stroke={ink} strokeWidth={0.5} opacity={0.5} />
      {[-36, 36].map((x) => <path key={x} d={`M${x - 2.5},2 L${x - 2.5},-30 L${x + 2.5},-31 L${x + 2.5},2Z`} fill={wood} stroke={ink} strokeWidth={0.8} />)}
      <path d="M20,2 L30,-46" stroke={s('#a07c58')} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M27,-44 L33,-58 M29,-45 L35,-58 M31,-46 L37,-57 M26.6,-45 L32,-47" stroke="#8a8f94" strokeWidth={0.9} />
      <path d="M-2,2 L-2,-34 L3,-35 L3,2Z" fill={wood} stroke={ink} strokeWidth={0.8} />
      <g className="gs-tap" onClick={(e) => { e.stopPropagation(); onTap() }}>
        <rect x={-18} y={-52} width={38} height={24} fill="transparent" />
        <g key={spin} className={spin ? 'cr-hatspin' : undefined}>
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

export function Apples({ n, s, ink }: Art & { n: number }) {
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
/** where the fallen apples lie (scene units) */
export const APPLES_AT: [number, number] = [600, 584]

/**
 * The still parts of the garden's little world: the farmer's fence with his hat, the lizard's sunning stone, and
 * fallen apples under a full-grown tree. Everything alive comes and goes through the director.
 */
export function Critters({ pal, apples, onEgg }: { pal: Palette; apples: number; onEgg: (name: string) => void }) {
  const art = { s: pal.shade, ink: pal.c.ink }
  const [hat, setHat] = useState(0)
  return (
    <g>
      <g transform={`translate(${FENCE.x},${FENCE.base}) scale(${FENCE.k})`}>
        <FarmPost {...art} spin={hat} onTap={() => { setHat(Date.now()); onEgg('hat') }} />
      </g>
      <path d="M936,606 C934,596 952,590 966,594 C976,597 978,604 972,607Z" fill={pal.shade('#a59f94')} stroke={pal.c.ink} strokeWidth={1.2} />
      {apples > 0 && <g transform={`translate(${APPLES_AT[0]},${APPLES_AT[1]})`}><Apples n={apples} {...art} /></g>}
    </g>
  )
}

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
