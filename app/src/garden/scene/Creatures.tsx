// Wildlife drawings and little atmospheric effects. The animals are drawn with named parts (pt-head, pt-tail,
// pt-leg-a...) and no motion of their own: their stories (species*.tsx) move them and pick a pose (stories.css).
import { useSid } from './ids'
import { memo, useMemo } from 'react'
import { brush, mix, rng, type P } from './ink'
import { LINES, yAt } from './Landscape'
import './critters.css'
import { NOVA } from './Critters'
import type { Palette } from './palette'

type Shade = (c: string) => string
export interface ArtProps {
  s: Shade
  ink: string
  pose?: string
}

// ---------- walking animals (facing right, feet at y=0) ----------

function Leg({ d, ph, color, w = 3.2 }: { d: string; ph: 'a' | 'b'; color: string; w?: number }) {
  return <path d={d} className={`pt-leg-${ph}`} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />
}

export function Fox({ s, ink, pose }: ArtProps) {
  const fur = s('#e2793a')
  const cream = s('#fbf1de')
  const dark = s('#3d2a20')
  const sit = pose === 'sit' || pose === 'scratch'
  return (
    <g className="pt-body">
      {sit ? (
        <g>
          <path d="M-26,-10 C-38,-6 -48,-2 -50,2 C-40,4 -28,2 -20,-2Z" fill={fur} stroke={ink} strokeWidth={1.5} className="pt-tail" />
          <path d="M-22,0 C-30,-10 -22,-30 -4,-34 C8,-36 18,-30 20,-20 L18,0Z" fill={fur} stroke={ink} strokeWidth={1.6} />
          <path d="M8,-24 C12,-16 12,-8 10,0" stroke={cream} strokeWidth={4} fill="none" strokeLinecap="round" />
          <path d="M6,-12 L6,0 M14,-12 L15,0" stroke={dark} strokeWidth={3.2} strokeLinecap="round" />
          <g className="pt-arm"><path d="M-16,-6 C-20,-14 -18,-22 -12,-26" stroke={dark} strokeWidth={3} fill="none" strokeLinecap="round" /></g>
        </g>
      ) : (
        <g>
          <Leg d="M-20,-12 L-22,0" ph="a" color={dark} />
          <Leg d="M14,-12 L16,0" ph="b" color={dark} />
          <g className="pt-tail">
            <path d="M-26,-20 C-38,-28 -54,-24 -60,-14 C-54,-10 -40,-11 -28,-15Z" fill={fur} stroke={ink} strokeWidth={1.5} />
            <path d="M-52,-20 C-57,-18 -60,-15 -60,-14 C-56,-11 -52,-12 -49,-14Z" fill={cream} />
          </g>
          <path d="M-28,-22 C-20,-32 10,-32 20,-26 C26,-22 26,-14 20,-11 C8,-8 -18,-8 -26,-12 C-32,-15 -32,-19 -28,-22Z" fill={fur} stroke={ink} strokeWidth={1.6} />
          <path d="M-18,-11 C-6,-9 8,-9 16,-12" stroke={cream} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Leg d="M-25,-12 L-27,0" ph="b" color={dark} />
          <Leg d="M9,-12 L8,0" ph="a" color={dark} />
        </g>
      )}
      <g className="pt-head" transform={sit ? 'translate(-8,-14)' : undefined}>
        <path d="M18,-26 C22,-34 30,-36 36,-33 L45,-28 C46,-27 45,-25 43,-25 L36,-23 C32,-20 24,-19 19,-21Z" fill={fur} stroke={ink} strokeWidth={1.5} />
        <path d="M30,-24 L43,-25 L37,-22Z" fill={cream} />
        <g className="pt-ear"><path d="M22,-31 L24,-43 L30,-34Z M28,-34 L32,-44 L35,-34Z" fill={fur} stroke={ink} strokeWidth={1.3} strokeLinejoin="round" /></g>
        <circle cx={33} cy={-30} r={1.4} fill={ink} />
        <path d="M31,-31.5 h4" stroke={fur} strokeWidth={2.4} className="pt-lid" />
        <circle cx={45} cy={-27} r={1.4} fill={ink} className="pt-nose" />
      </g>
    </g>
  )
}

export function Rabbit({ s, ink, pose }: ArtProps) {
  const fur = s('#a88e74')
  const light = s('#d9c7b0')
  const up = pose === 'sit' || pose === 'alert' || pose === 'ears'
  return (
    <g className="pt-body">
      <g transform={up ? 'scale(1.02,1.14) translate(2,0)' : 'scale(1.1)'}>
        <path d="M-14,-6 C-18,-16 -10,-24 2,-23 C10,-22 14,-16 13,-9 C12,-4 4,-1 -6,-1 C-12,-1 -14,-3 -14,-6Z" fill={fur} stroke={ink} strokeWidth={1.5} />
        <circle cx={-15} cy={-11} r={4.5} fill="#fbf8f2" stroke={ink} strokeWidth={1} className="pt-tail" />
        <g className="pt-leg-b"><path d="M-10,-3 L6,-1 C7,1 4,1 -10,1Z" fill={light} stroke={ink} strokeWidth={1} /></g>
        <g className="pt-head">
          <g className="pt-ear">
            <path d="M10,-25 C6,-36 8,-44 12,-44 C15,-42 14,-33 13,-26Z" fill={fur} stroke={ink} strokeWidth={1.3} />
            <path d="M14,-25 C14,-37 18,-43 21,-41 C22,-37 18,-30 16,-24Z" fill={fur} stroke={ink} strokeWidth={1.3} />
          </g>
          <path d="M8,-26 C14,-30 22,-26 22,-19 C22,-14 17,-12 12,-13 C8,-15 6,-22 8,-26Z" fill={fur} stroke={ink} strokeWidth={1.4} />
          <circle cx={17} cy={-21} r={1.4} fill={ink} />
          <circle cx={22} cy={-17} r={1} fill={s('#d88a8a')} className="pt-nose" />
          {pose === 'eat' && <path d="M22,-14 l5,4 M22,-14 l3,6 M22,-14 l6,1" stroke={s('#5f9e45')} strokeWidth={1.2} strokeLinecap="round" />}
        </g>
      </g>
    </g>
  )
}

export function Squirrel({ s, ink, pose }: ArtProps) {
  const fur = s('#b8653a')
  const light = s('#f0d9b8')
  const up = pose === 'sit' || pose === 'eat' || pose === 'alert'
  return (
    <g className="pt-body">
      <g className="pt-tail">
        <path d="M-10,-6 C-26,-10 -28,-32 -17,-38 C-8,-42 -1,-36 -6,-29 C-10,-24 -15,-18 -12,-10Z" fill={fur} stroke={ink} strokeWidth={1.4} />
        <path d="M-18,-34 C-12,-37 -7,-34 -8,-30" stroke={light} strokeWidth={2} fill="none" strokeLinecap="round" />
      </g>
      <g transform={up ? 'rotate(-28 -6 0)' : undefined}>
        <path d="M-10,-4 C-14,-14 -6,-22 4,-20 C12,-18 14,-10 10,-4 C6,0 -6,0 -10,-4Z" fill={fur} stroke={ink} strokeWidth={1.4} />
        <path d="M4,-17 C9,-14 10,-8 7,-4" stroke={light} strokeWidth={3} fill="none" strokeLinecap="round" />
        <g className="pt-head">
          <circle cx={10} cy={-21} r={6.5} fill={fur} stroke={ink} strokeWidth={1.3} />
          <g className="pt-ear"><path d="M7,-26 L8,-33 L12,-26Z" fill={fur} stroke={ink} strokeWidth={1} /></g>
          <circle cx={12} cy={-22} r={1.2} fill={ink} />
          <circle cx={16} cy={-20} r={0.9} fill={ink} className="pt-nose" />
        </g>
        {pose === 'eat' && <g transform="translate(14,-14)"><Acorn ink={ink} /></g>}
      </g>
      <g className="pt-leg-a"><path d="M-6,-1 L6,-1" stroke={s('#5a3420')} strokeWidth={3} strokeLinecap="round" /></g>
    </g>
  )
}

export const Acorn = ({ ink }: { ink: string }) => (
  <g>
    <path d="M-3,-1 C-3,3 -1,5 0,5.5 C1,5 3,3 3,-1Z" fill="#b5793d" stroke={ink} strokeWidth={0.6} />
    <path d="M-3.6,-1 C-3,-4 3,-4 3.6,-1Z" fill="#7a5530" stroke={ink} strokeWidth={0.6} />
    <path d="M0,-3.4 l0.6,-1.6" stroke={ink} strokeWidth={0.7} />
  </g>
)

export function Hedgehog({ s, ink, pose }: ArtProps) {
  const spines = s('#7a5a3e')
  const face = s('#e9d3b0')
  if (pose === 'curl' || pose === 'ball') {
    // rolled up into a spiky ball; when uncurling a nose peeks out
    return (
      <g className="pt-body">
        <circle cx={0} cy={-11} r={11} fill={spines} stroke={ink} strokeWidth={1.4} />
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2
          return <path key={i} d={`M${(Math.cos(a) * 9).toFixed(1)},${(-11 + Math.sin(a) * 9).toFixed(1)} L${(Math.cos(a) * 14.5).toFixed(1)},${(-11 + Math.sin(a) * 14.5).toFixed(1)}`} stroke={ink} strokeWidth={1.1} strokeLinecap="round" />
        })}
        <path d="M-5,-12 l-2,-3 M2,-14 l1,-4 M5,-8 l3,-2" stroke={mix(spines, '#000', 0.3)} strokeWidth={1} />
        {pose === 'ball' && <circle cx={10} cy={-4} r={1.4} fill={ink} />}
      </g>
    )
  }
  return (
    <g className="pt-body">
      <Leg d="M-8,-3 L-9,1" ph="a" color={s('#4a3322')} />
      <Leg d="M8,-3 L9,1" ph="b" color={s('#4a3322')} />
      <path d="M-16,-1 C-19,-11 -10,-21 2,-21 C12,-21 18,-12 18,-4 L16,-1Z" fill={spines} stroke={ink} strokeWidth={1.4} />
      <path d="M-15,-6 L-20,-9 L-13,-11 L-17,-16 L-10,-15 L-10,-22 L-4,-18 L0,-25 L3,-18 L9,-22 L8,-15 L14,-17 L12,-11" stroke={ink} strokeWidth={1.1} fill="none" strokeLinejoin="round" />
      <path d="M-8,-10 l-3,-4 M-2,-12 l-1,-5 M4,-12 l2,-5 M-4,-6 l-3,-3" stroke={mix(spines, '#000', 0.3)} strokeWidth={1} />
      <g className="pt-head">
        <path d="M12,-12 C16,-12 23,-7 26,-4 C24,-1 17,-1 13,-2 C11,-5 11,-9 12,-12Z" fill={face} stroke={ink} strokeWidth={1.2} />
        <circle cx={26} cy={-4} r={1.6} fill={ink} className="pt-nose" />
        <circle cx={17} cy={-8} r={1.1} fill={ink} />
      </g>
      {pose === 'eat' && <g className="st-fadein"><ellipse cx={30} cy={-1.5} rx={2.6} ry={1.8} fill="#2f4f3a" stroke={ink} strokeWidth={0.6} /></g>}
    </g>
  )
}

export function Deer({ s, ink }: ArtProps) {
  const fur = s('#a8784e')
  const light = s('#e8d2b0')
  const dark = s('#5a3e2a')
  return (
    <g className="pt-body">
      <Leg d="M-22,-42 L-25,0" ph="a" color={dark} />
      <Leg d="M16,-40 L18,0" ph="b" color={dark} />
      <path d="M-30,-52 C-22,-61 14,-61 24,-55 C30,-50 30,-42 24,-40 C10,-37 -20,-37 -28,-41 C-33,-44 -34,-49 -30,-52Z" fill={fur} stroke={ink} strokeWidth={1.6} />
      <g className="pt-tail"><path d="M-30,-50 L-37,-47 L-31,-45Z" fill="#fbf8f2" stroke={ink} strokeWidth={1} /></g>
      <Leg d="M-28,-42 L-27,0" ph="b" color={dark} />
      <Leg d="M10,-40 L9,0" ph="a" color={dark} />
      <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '24px -52px' }}>
        <path d="M18,-54 C22,-64 27,-74 31,-80 C35,-85 42,-85 46,-81 L55,-74 C57,-72 55,-70 52,-70 L44,-70 C40,-66 34,-56 30,-45Z" fill={fur} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
        <g className="pt-ear"><path d="M36,-82 L28,-91 L40,-86Z" fill={fur} stroke={ink} strokeWidth={1.2} /></g>
        <path d="M38,-85 C36,-97 31,-104 27,-111 M33,-97 L25,-100 M31,-104 L34,-112 M42,-85 C45,-97 49,-103 53,-109 M47,-97 L54,-99 M50,-104 L48,-111" stroke={dark} strokeWidth={2} fill="none" strokeLinecap="round" />
        <circle cx={44} cy={-78} r={1.5} fill={ink} />
        <circle cx={55} cy={-73} r={1.3} fill={ink} className="pt-nose" />
        <path d="M25,-60 C28,-66 31,-72 34,-76" stroke={light} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
      </g>
      <path d="M-14,-50 l3,-2 M-4,-52 l3,-2 M6,-51 l3,-2" stroke={light} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    </g>
  )
}

export function Horse({ s, ink, coat = '#8a5a36', pose }: ArtProps & { coat?: string }) {
  const fur = s(coat)
  const dark = s(mix(coat, '#1e130c', 0.6))
  const light = s(mix(coat, '#fff1dc', 0.35))
  return (
    <g className="pt-body">
      <Leg d="M-30,-44 L-36,-20 L-32,0" ph="a" color={dark} w={4} />
      <Leg d="M22,-42 L26,-20 L24,0" ph="b" color={dark} w={4} />
      <g className="pt-tail"><path d="M-40,-58 C-52,-58 -60,-46 -63,-28 C-56,-36 -50,-44 -44,-50Z" fill={dark} stroke={ink} strokeWidth={1.2} /></g>
      <path d="M-42,-58 C-32,-71 22,-71 34,-61 C41,-55 41,-45 33,-41 C14,-36 -26,-36 -38,-42 C-46,-46 -47,-53 -42,-58Z" fill={fur} stroke={ink} strokeWidth={1.6} />
      <path d="M-30,-62 C-14,-68 10,-68 26,-62" stroke={light} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
      <Leg d="M-36,-44 L-41,-20 L-38,0" ph="b" color={fur} w={4} />
      <Leg d="M28,-42 L33,-20 L30,0" ph="a" color={fur} w={4} />
      <g className="pt-head" style={{ transformBox: 'view-box', transformOrigin: '28px -58px' }}>
        <path d="M24,-62 C30,-74 38,-88 46,-96 C50,-100 56,-100 60,-96 L71,-82 C73,-79 71,-75 66,-76 L58,-79 C52,-73 45,-61 37,-47Z" fill={fur} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
        <g className="pt-ear"><path d="M49,-97 L51,-108 L56,-98Z" fill={fur} stroke={ink} strokeWidth={1.1} /></g>
        <path d="M47,-97 C40,-90 33,-79 26,-66 M44,-93 C38,-88 33,-82 30,-74" stroke={dark} strokeWidth={4} fill="none" strokeLinecap="round" />
        <circle cx={57} cy={-90} r={1.5} fill={ink} />
        <circle cx={68} cy={-79} r={1} fill={ink} className="pt-nose" />
        {pose === 'rear' && <path d="M78,-92 q6,-3 10,0 M80,-84 q6,-1 9,2" stroke={ink} strokeWidth={1.4} fill="none" strokeLinecap="round" />}
      </g>
    </g>
  )
}

export function Elephant({ s, ink, pose }: ArtProps) {
  const hide = s('#9c9894')
  const dark = s('#6f6a66')
  return (
    <g className="pt-body">
      <Leg d="M-36,-28 L-36,0" ph="a" color={dark} w={7} />
      <Leg d="M26,-28 L27,0" ph="b" color={dark} w={7} />
      <g className="pt-tail"><path d="M-50,-50 q-9,8 -7,24" stroke={ink} strokeWidth={1.4} fill="none" /></g>
      <path d="M-50,-32 C-56,-70 -30,-92 6,-90 C40,-88 58,-68 52,-36 C50,-28 44,-24 36,-24 L-40,-24 C-48,-24 -50,-28 -50,-32Z" fill={hide} stroke={ink} strokeWidth={1.7} />
      <path d="M-40,-76 C-24,-86 8,-88 30,-80" stroke={s('#c4c0ba')} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.6} />
      <path d="M-30,-40 q4,-3 8,0 M-6,-36 q4,-3 8,0" stroke={dark} strokeWidth={1} fill="none" opacity={0.6} />
      <Leg d="M-26,-28 L-27,0" ph="b" color={hide} w={7} />
      <Leg d="M36,-28 L36,0" ph="a" color={hide} w={7} />
      <path d="M40,-82 C56,-92 78,-82 77,-62 C77,-54 74,-48 70,-44 L58,-40 C50,-42 44,-48 40,-56Z" fill={hide} stroke={ink} strokeWidth={1.6} />
      <g className="pt-trunk">
        <path d="M70,-48 C70,-30 70,-16 77,-8 C79,-5 77,-2 73,-3 C63,-9 60,-24 60,-42Z" fill={hide} stroke={ink} strokeWidth={1.5} />
        <path d="M66,-36 l5,0 M66,-28 l6,-1 M68,-20 l5,-1" stroke={dark} strokeWidth={0.9} />
      </g>
      <g className="pt-ear"><path d="M46,-80 C30,-86 22,-66 28,-52 C34,-42 48,-46 52,-56 C55,-66 53,-76 46,-80Z" fill={s('#b3aca6')} stroke={ink} strokeWidth={1.4} /></g>
      <path d="M64,-44 q6,5 13,3" stroke="#f6f1e4" strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={63} cy={-68} r={1.6} fill={ink} />
      {pose === 'spray' && (
        <g className="st-fadein">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={84 + i * 5} cy={-112 + (i % 2) * 6} r={2.4} fill="#bfe6f5" stroke={ink} strokeWidth={0.5} className="st-fly" style={{ animationDelay: `${0.6 + i * 0.08}s`, ['--dx' as string]: `${10 + i * 3}px`, ['--dy' as string]: `${-10 + i * 4}px` }} />
          ))}
        </g>
      )}
    </g>
  )
}

export function Skunk({ s, ink }: ArtProps) {
  const fur = s('#26262e')
  const white = s('#f4f2ec')
  return (
    <g className="pt-body">
      <Leg d="M-10,-4 L-11,0" ph="a" color={fur} />
      <g className="pt-tail">
        <path d="M-16,-10 C-32,-14 -40,-32 -32,-46 C-26,-55 -12,-51 -14,-40 C-16,-31 -14,-22 -9,-16Z" fill={fur} stroke={ink} strokeWidth={1.4} />
        <path d="M-14,-14 C-26,-20 -32,-34 -26,-44" stroke={white} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      </g>
      <g className="pt-front">
        <Leg d="M12,-4 L13,0" ph="b" color={fur} />
        <path d="M-18,-5 C-22,-16 -10,-24 4,-23 C16,-22 22,-14 20,-6 C18,-1 8,0 -4,0 C-12,0 -17,-2 -18,-5Z" fill={fur} stroke={ink} strokeWidth={1.4} />
        <path d="M-14,-15 C-6,-22 8,-22 17,-14" stroke={white} strokeWidth={3.6} fill="none" strokeLinecap="round" />
        <g className="pt-head">
          <path d="M16,-14 C20,-20 30,-16 33,-9 C34,-6 30,-4 26,-5 C21,-6 17,-9 16,-14Z" fill={fur} stroke={ink} strokeWidth={1.3} />
          <path d="M19,-16 C24,-15 29,-12 32,-9" stroke={white} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <circle cx={24} cy={-12} r={1.2} fill="#f4f2ec" />
          <circle cx={33} cy={-8.5} r={1.2} fill={ink} className="pt-nose" />
        </g>
      </g>
    </g>
  )
}

export function Ferret({ s, ink }: ArtProps) {
  const fur = s('#7d5a3e')
  const cream = s('#f1e2c4')
  const dark = s('#3e2a1c')
  return (
    <g className="pt-body">
      <Leg d="M-22,-5 L-24,0" ph="a" color={dark} />
      <Leg d="M15,-5 L17,0" ph="b" color={dark} />
      <g className="pt-tail"><path d="M-30,-9 C-40,-10 -46,-6 -51,-2 C-45,-4 -38,-5 -30,-6Z" fill={dark} stroke={ink} strokeWidth={1.1} /></g>
      <path d="M-31,-8 C-33,-17 -20,-21 -4,-20 C12,-19 22,-17 26,-12 C28,-8 22,-4 10,-4 C-8,-3 -25,-2 -31,-8Z" fill={fur} stroke={ink} strokeWidth={1.4} />
      <path d="M-20,-6 C-6,-5 8,-5 18,-7" stroke={cream} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
      <Leg d="M-17,-5 L-18,0" ph="b" color={dark} />
      <Leg d="M19,-5 L20,0" ph="a" color={dark} />
      <g className="pt-head">
        <path d="M21,-16 C27,-23 38,-21 43,-14 C43,-11 39,-9 33,-9 C27,-9 22,-11 21,-16Z" fill={cream} stroke={ink} strokeWidth={1.3} />
        <path d="M27,-17 C31,-18 36,-16 39,-14" stroke={dark} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <circle cx={26} cy={-20} r={2.4} fill={fur} stroke={ink} strokeWidth={0.9} />
        <circle cx={35} cy={-15.5} r={1.1} fill="#111" />
        <circle cx={43} cy={-13} r={1} fill={s('#d88a8a')} className="pt-nose" />
      </g>
    </g>
  )
}

export function Badger({ s, ink }: ArtProps) {
  const grey = s('#7e7a76')
  return (
    <g className="pt-body">
      <Leg d="M-14,-6 L-15,0" ph="a" color="#222" w={4} />
      <Leg d="M10,-6 L11,0" ph="b" color="#222" w={4} />
      <g className="pt-tail"><path d="M-30,-14 l-6,2 l5,2Z" fill={grey} stroke={ink} strokeWidth={0.8} /></g>
      <path d="M-30,-10 C-32,-24 -10,-30 10,-28 C22,-27 28,-20 26,-10 C20,-4 -20,-2 -30,-10Z" fill={grey} stroke={ink} strokeWidth={1.4} />
      <Leg d="M-20,-6 L-21,0" ph="b" color="#222" w={4} />
      <Leg d="M16,-6 L17,0" ph="a" color="#222" w={4} />
      <g className="pt-head">
        <path d="M20,-24 C30,-26 40,-18 42,-10 C36,-8 28,-8 22,-12Z" fill="#f4f2ec" stroke={ink} strokeWidth={1.2} />
        <path d="M22,-22 C29,-20 35,-15 41,-11" stroke="#222" strokeWidth={3} fill="none" />
        <circle cx={42} cy={-10} r={1.6} fill={ink} className="pt-nose" />
      </g>
    </g>
  )
}

/** Nova walking: a small dilute-calico cat, white with grey and cream patches, tail held up. */
export function NovaWalk({ s, ink, pose }: ArtProps) {
  const sid = useSid()
  const w = s(NOVA.white)
  const g = s(NOVA.grey)
  const cr = s(NOVA.cream)
  const body = 'M-20,-13 C-21,-22 -6,-24 8,-23 C16,-22 20,-18 19,-13 C18,-9 14,-8 10,-8 L-14,-8 C-18,-8 -20,-10 -20,-13Z'
  const low = pose === 'crouch' || pose === 'wiggle'
  return (
    <g className="pt-body">
      <defs><clipPath id={`${sid}-nw`}><path d={body} /></clipPath></defs>
      <Leg d="M-15,-9 L-17,0" ph="a" color={g} />
      <Leg d="M11,-9 L12,0" ph="b" color={w} />
      <g className="pt-tail">
        <path d={low ? 'M-19,-12 C-27,-12 -32,-10 -36,-6' : 'M-19,-15 C-27,-18 -30,-28 -26,-35 C-25,-37 -23,-36 -23.6,-34'} stroke={g} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      </g>
      <path d={body} fill={w} />
      <g clipPath={`url(#${sid}-nw)`}>
        <path d="M-22,-26 C-14,-26 -4,-27 2,-22 C0,-17 -8,-15 -14,-15 C-18,-15 -22,-17 -22,-20Z" fill={g} />
        <path d="M2,-24 C8,-25 14,-23 16,-19 C12,-16 6,-17 3,-19Z" fill={cr} />
        <path d="M-22,-14 C-18,-16 -12,-14 -11,-10 C-14,-7 -20,-7 -22,-9Z" fill={cr} />
      </g>
      <path d={body} fill="none" stroke={ink} strokeWidth={1.2} />
      <Leg d="M-19,-9 L-20,0" ph="b" color={w} />
      <Leg d="M15,-9 L15,0" ph="a" color={w} />
      <g className="pt-head">
        <g className="pt-ear">
          <path d="M17,-26 L18,-33 L22,-28Z" fill={g} stroke={ink} strokeWidth={0.9} strokeLinejoin="round" />
          <path d="M24,-28 L28,-33 L28.4,-25Z" fill={cr} stroke={ink} strokeWidth={0.9} strokeLinejoin="round" />
        </g>
        <path d="M15,-21 C15,-27 19,-29 23,-29 C28,-29 31,-26 31,-21 C31,-17 28,-15 24,-15 C19,-15 15,-17 15,-21Z" fill={w} />
        <path d="M15,-21 C15,-27 19,-29 22.4,-29 C22,-25 21,-22 19,-20 C17,-19.6 15.6,-20 15,-21Z" fill={g} />
        <path d="M23.4,-29 C27,-29 30,-27 30.6,-23 C28,-22.6 25.6,-24 24.4,-26Z" fill={cr} />
        <path d="M15,-21 C15,-27 19,-29 23,-29 C28,-29 31,-26 31,-21 C31,-17 28,-15 24,-15 C19,-15 15,-17 15,-21Z" fill="none" stroke={ink} strokeWidth={1.1} />
        <ellipse cx={26.6} cy={-22.6} rx={1.3} ry={1.5} fill={NOVA.eye} stroke={ink} strokeWidth={0.4} />
        <path d="M26.8,-23.8 L26.8,-21.4" stroke="#141414" strokeWidth={0.8} strokeLinecap="round" />
        <path d="M30.2,-19.6 L31.4,-19.6 L30.8,-18.8Z" fill={s('#d98a92')} />
        <path d="M29,-18.6 l6,-0.8 M29,-18 l6,0.8" stroke={ink} strokeWidth={0.3} opacity={0.7} />
      </g>
    </g>
  )
}

// ---------- monkeys in a distant grove ----------

function scallopish(cx: number, cy: number, rr: number, r: ReturnType<typeof rng>): string {
  const n = 9
  let d = ''
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr * 0.8
    if (i === 0) d += `M${x.toFixed(1)},${y.toFixed(1)}`
    else {
      const am = a - Math.PI / n
      const k = rr * r.range(1.15, 1.28)
      d += ` Q${(cx + Math.cos(am) * k).toFixed(1)},${(cy + Math.sin(am) * k * 0.8).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`
    }
  }
  return d + 'Z'
}

/** The grove's three trees on the far hill: x, height and where the trunk meets the ground. */
export const GROVE = [
  { x: 846, h: 92, w: 44 },
  { x: 902, h: 110, w: 52 },
  { x: 950, h: 84, w: 40 },
].map((t) => ({ ...t, base: yAt(LINES.far, t.x) + 6 }))
/** the vine hanging between the first two trees */
export const VINE: P = [(GROVE[0].x + GROVE[1].x) / 2, GROVE[0].base - GROVE[0].h + 14]

/** A few tall trees on the far hill, where monkeys come to play when the garden is thriving (see the monkey story). */
export function Grove({ pal }: { pal: Palette }) {
  const sid = useSid()
  const trees = useMemo(() => {
    const r = rng(808)
    return GROVE.map((t) => {
      const base = t.base
      const crown: string[] = []
      for (let i = 0; i < 6; i++) crown.push(scallopish(t.x + r.range(-t.w * 0.6, t.w * 0.6), base - t.h + r.range(-10, 18), t.w * r.range(0.42, 0.6), r))
      return { ...t, crown: crown.join(' '), trunk: brush([[t.x, base], [t.x + r.range(-3, 3), base - t.h * 0.5], [t.x + r.range(-4, 4), base - t.h * 0.85]], 7, 3, r, { taperIn: 0, taperOut: 0.2 }) }
    })
  }, [])
  const haze = (c: string) => mix(pal.shade(c), pal.c.farHill2, 0.35)
  const ink = pal.c.ink
  const t1 = trees[0]
  const t2 = trees[1]
  return (
    <g>
      {trees.map((t, i) => (
        <g key={i}>
          <path d={t.trunk} fill={haze('#6b5440')} stroke={ink} strokeWidth={0.8} opacity={0.9} />
          <path d={t.crown} fill={haze('#4f8a52')} stroke={ink} strokeWidth={0.8} strokeOpacity={0.6} />
          <path d={t.crown} fill={`url(#${sid('grovehi')})`} />
        </g>
      ))}
      <path d={`M${t1.x + 8},${VINE[1] - 4} Q${VINE[0]},${VINE[1] + 10} ${t2.x - 8},${VINE[1] - 8}`} stroke={haze('#4a6a34')} strokeWidth={1.4} fill="none" />
      <defs>
        <radialGradient id={sid('grovehi')} cx="0.35" cy="0.25" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.25} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
    </g>
  )
}

/** A small monkey, about 14 units tall. Poses: hang (by the tail from a vine), leap, sit (and scratch). */
export function Monkey({ s, ink, pose }: ArtProps) {
  const fur = s('#6b4a32')
  const face = s('#e2c4a0')
  if (pose === 'swing' || pose === 'hang' || pose === 'flip') {
    return (
      <g className="pt-body">
        <path d="M0,-6 C-4,-12 2,-16 4,-11 C5,-8 2,-4 1,0" stroke={fur} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <ellipse cx={1} cy={6} rx={3.6} ry={5.2} fill={fur} stroke={ink} strokeWidth={0.7} />
        <circle cx={1} cy={13.5} r={3.6} fill={fur} stroke={ink} strokeWidth={0.7} />
        <ellipse cx={1} cy={14.4} rx={2.3} ry={1.9} fill={face} />
        <path d="M-2,4 l-4,10 M4,4 l4,10" stroke={fur} strokeWidth={1.5} strokeLinecap="round" />
      </g>
    )
  }
  const leap = pose === 'hop' || pose === 'fly'
  return (
    <g className="pt-body">
      <g className="pt-tail"><path d="M-4,-2 C-12,-2 -12,-12 -6,-12" stroke={fur} strokeWidth={1.5} fill="none" strokeLinecap="round" /></g>
      <ellipse cx={0} cy={-6} rx={4} ry={5} fill={fur} stroke={ink} strokeWidth={0.7} />
      <g className="pt-head">
        <circle cx={2} cy={-13} r={3.7} fill={fur} stroke={ink} strokeWidth={0.7} />
        <ellipse cx={3} cy={-12.4} rx={2.4} ry={2} fill={face} />
        <circle cx={-1.5} cy={-14} r={1.3} fill={face} stroke={ink} strokeWidth={0.4} />
      </g>
      {leap ? (
        <path d="M-2,-8 l-7,-5 M3,-8 l7,-5 M-2,-2 l-6,4 M2,-2 l6,4" stroke={fur} strokeWidth={1.5} strokeLinecap="round" />
      ) : (
        <g className="pt-arm"><path d="M3,-8 q5,-4 2,-9" stroke={fur} strokeWidth={1.5} fill="none" strokeLinecap="round" /></g>
      )}
    </g>
  )
}

// ---------- small creatures near the plant ----------

/** A butterfly seen from above; its two wings open and close with the pose (fly, open, rest, glide). */
export function Butterfly({ color, ink, spot, tails, tip }: { color: string; ink: string; spot?: string; tails?: boolean; tip?: string }) {
  const L = 'M0,0 C-4,-11 -15,-13 -15,-4 C-15,2 -6,2 0,0Z M0,0 C-6,2 -11,9 -6,11 C-2,11 0,5 0,0Z'
  const R = 'M0,0 C4,-11 15,-13 15,-4 C15,2 6,2 0,0Z M0,0 C6,2 11,9 6,11 C2,11 0,5 0,0Z'
  return (
    <g className="pt-body">
      <g className="pt-bw-l">
        <path d={L} fill={color} stroke={ink} strokeWidth={1.1} />
        {tip && <path d="M-15,-4 C-15,-9 -12,-12 -8,-11 C-10,-8 -12,-6 -15,-4Z" fill={tip} />}
        {spot && <circle cx={-9} cy={-5} r={1.8} fill={spot} />}
        {tails && <path d="M-6,11 l-3,6" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />}
      </g>
      <g className="pt-bw-r">
        <path d={R} fill={color} stroke={ink} strokeWidth={1.1} />
        {tip && <path d="M15,-4 C15,-9 12,-12 8,-11 C10,-8 12,-6 15,-4Z" fill={tip} />}
        {spot && <circle cx={9} cy={-5} r={1.8} fill={spot} />}
        {tails && <path d="M6,11 l3,6" stroke={ink} strokeWidth={1.6} strokeLinecap="round" />}
      </g>
      <path d="M0,-6 L0,7" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      <path d="M0,-6 q-2,-5 -4,-6 M0,-6 q2,-5 4,-6" stroke={ink} strokeWidth={0.8} fill="none" />
    </g>
  )
}

export function Bee({ ink, pollen }: { ink: string; pollen?: boolean }) {
  return (
    <g className="pt-body">
      <g className="pt-buzz">
        <ellipse cx={-1} cy={-6} rx={4} ry={5} fill="#eef6ff" opacity={0.85} stroke={ink} strokeWidth={0.6} />
        <ellipse cx={3} cy={-6} rx={3.4} ry={4.2} fill="#eef6ff" opacity={0.85} stroke={ink} strokeWidth={0.6} />
      </g>
      <ellipse cx={0} cy={0} rx={6.5} ry={4.5} fill="#f5c842" stroke={ink} strokeWidth={1.1} />
      <path d="M-2,-4 L-2,4 M2,-4.2 L2,4.2" stroke={ink} strokeWidth={1.6} />
      <circle cx={6.2} cy={-0.5} r={0.9} fill={ink} />
      {pollen && <><circle cx={-1} cy={5} r={1.5} fill="#f2a72a" /><circle cx={2.4} cy={5} r={1.3} fill="#f2a72a" /></>}
    </g>
  )
}

/** The owl, perched (poses: idle, turn, spin, puff) or flying in on wide silent wings (fly, glide). */
export function Owl({ pal, pose }: { pal: Palette; pose: string }) {
  const ink = pal.c.ink
  const body = mix('#8a6a50', '#3a3a5a', 0.35)
  const belly = mix('#d8c2a0', '#5a5a7a', 0.3)
  const flying = pose === 'fly' || pose === 'glide'
  return (
    <g className="pt-body">
      {flying && (
        <g>
          <g className="pt-wing" style={{ transformBox: 'view-box', transformOrigin: '-6px -18px' }}><path d="M-6,-18 C-20,-30 -34,-26 -40,-16 C-30,-18 -20,-14 -8,-10Z" fill={body} stroke={ink} strokeWidth={1.2} /></g>
          <g className="pt-wing" style={{ transformBox: 'view-box', transformOrigin: '6px -18px' }}><path d="M6,-18 C20,-30 34,-26 40,-16 C30,-18 20,-14 8,-10Z" fill={body} stroke={ink} strokeWidth={1.2} /></g>
        </g>
      )}
      <path d="M-13,0 C-16,-12 -13,-27 0,-29 C13,-27 16,-12 13,0Z" fill={body} stroke={ink} strokeWidth={1.5} />
      <path d="M-8,-2 C-10,-10 -8,-17 0,-18 C8,-17 10,-10 8,-2Z" fill={belly} />
      <path d="M-5,-12 l2,2 l2,-2 M1,-12 l2,2 l2,-2 M-3,-7 l2,2 l2,-2 M2,-7 l2,2 l2,-2" stroke={mix(body, '#000', 0.3)} strokeWidth={0.9} fill="none" />
      <g className="pt-head">
        <path d="M-12,-24 L-13,-35 L-6,-28 M12,-24 L13,-35 L6,-28" fill={body} stroke={ink} strokeWidth={1.3} strokeLinejoin="round" />
        <ellipse cx={0} cy={-26} rx={12} ry={9} fill={body} stroke={ink} strokeWidth={1.4} />
        <circle cx={-5} cy={-26} r={4.6} fill="#ffd85a" stroke={ink} strokeWidth={1} />
        <circle cx={5} cy={-26} r={4.6} fill="#ffd85a" stroke={ink} strokeWidth={1} />
        <circle cx={-5} cy={-26} r={2.2} fill="#1a1a1a" />
        <circle cx={5} cy={-26} r={2.2} fill="#1a1a1a" />
        <circle cx={-4.2} cy={-27} r={0.8} fill="#fff" />
        <circle cx={5.8} cy={-27} r={0.8} fill="#fff" />
        <g className="pt-lid" style={pose === 'doze' ? { animation: 'none', transform: 'scaleY(.75)' } : undefined}>
          <ellipse cx={-5} cy={-26} rx={5} ry={5} fill={body} />
          <ellipse cx={5} cy={-26} rx={5} ry={5} fill={body} />
        </g>
        <path d="M-1.5,-23 L0,-19 L1.5,-23Z" fill="#e0a040" stroke={ink} strokeWidth={0.7} />
      </g>
      {!flying && <path d="M-5,0 l-1,3 M-3,0 l0,3 M3,0 l0,3 M5,0 l1,3" stroke="#e0a040" strokeWidth={1.2} />}
    </g>
  )
}

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

/**
 * Watering after a review: a watering can glides in, tips, and showers the plant (streams, drops, splashes,
 * darkening soil, a little rainbow in the spray), then leaves; the plant glows and sparkles. About 5 seconds.
 */
export function Watering({ height }: { height: number }) {
  const sid = useSid()
  // the can hovers beside the plant; when tipped its rose sits at about (19, -H + 24)
  const H = Math.round(Math.min(190, Math.max(110, height * 0.55)))
  const S = 1.55
  const canX = 116
  const rose: P = [canX - 53 * S, -H + 24 * S]
  const fall = -rose[1]
  const drops = useMemo(() => {
    const r = rng(71)
    return [...Array(26)].map((_, i) => ({ dx: r.range(-50, 12), dy: fall + r.range(-4, 4), dl: -(i / 26) * 0.6 - r.range(0, 0.1), s: r.range(0.8, 1.3) }))
  }, [fall])
  const streams = [-42, -28, -15, -3, 8].map((dx) => `M${rose[0].toFixed(0)},${rose[1].toFixed(0)} q${(dx * 0.35).toFixed(0)},${(fall * 0.2).toFixed(0)} ${dx},${fall.toFixed(0)}`)
  const glowR = height * 0.55 + 50
  return (
    <g className="gs-watering">
      <ellipse cx={0} cy={-height * 0.45} rx={glowR} ry={height * 0.55 + 40} fill={`url(#${sid('waterglow')})`} className="gs-wglow" />
      {/* the soil darkens where the water soaks in */}
      <ellipse cx={-6} cy={3} rx={54} ry={7} fill="#3a2a1c" className="gs-wet" />
      <g className="gs-pour">
        {streams.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#c8ecfa" strokeWidth={2} strokeLinecap="round" strokeDasharray="7 9" className="gs-stream" style={{ animationDelay: `${-i * 0.07}s` }} opacity={0.85} />
        ))}
        {drops.map((d, i) => (
          <g key={i} transform={`translate(${rose[0]},${rose[1]})`}>
            <path
              d="M0,-4 C2,-1 2.6,1 2.6,2 A2.6,2.6 0 0 1 -2.6,2 C-2.6,1 -2,-1 0,-4Z"
              transform={`scale(${d.s.toFixed(2)})`}
              fill="#a9dcf2"
              stroke="#2c5a70"
              strokeWidth={0.6}
              className="gs-pdrop"
              style={{ animationDelay: `${d.dl.toFixed(2)}s`, ['--dx' as string]: `${d.dx.toFixed(0)}px`, ['--dy' as string]: `${d.dy.toFixed(0)}px` }}
            />
          </g>
        ))}
        {/* splashes where the shower lands */}
        {[-34, -14, 4].map((x, i) => (
          <g key={i} transform={`translate(${x},1)`}>
            <ellipse rx={9} ry={2.4} fill="none" stroke="#c8ecfa" strokeWidth={1.3} className="gs-splashloop" style={{ animationDelay: `${i * 0.18}s` }} />
            <path d="M-5,-2 l-3,-5 M0,-3 l0,-6 M5,-2 l3,-5" stroke="#c8ecfa" strokeWidth={1.2} strokeLinecap="round" className="gs-splashloop" style={{ animationDelay: `${i * 0.18 + 0.1}s` }} />
          </g>
        ))}
        {/* a tiny rainbow in the spray */}
        <g className="gs-rainbow" opacity={0.5}>
          {['#ff6b6b', '#ffb347', '#ffe66d', '#7bd389', '#6fb7ff', '#a98bff'].map((col, i) => (
            <path key={col} d={`M${-44 + i * 2},0 A${30 - i * 2},${26 - i * 2} 0 0 1 ${16 - i * 2},0`} fill="none" stroke={col} strokeWidth={2} transform="translate(-8,-6)" />
          ))}
        </g>
      </g>
      {/* the watering can */}
      <g transform={`translate(${canX},${-H})`}>
        <g className="gs-can" style={{ ['--s' as string]: S }}>
          <path d="M22,-12 C40,-12 40,14 24,14" stroke={'#2c3632'} strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d="M22,-12 C40,-12 40,14 24,14" stroke="#5aa58a" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d="M-22,8 L-55,-6 L-53,-12 L-22,-2Z" fill="#4f9a80" stroke="#2c3632" strokeWidth={1.4} strokeLinejoin="round" />
          <ellipse cx={-57} cy={-8} rx={3.6} ry={7.5} transform="rotate(-22 -57 -8)" fill="#3f8a72" stroke="#2c3632" strokeWidth={1.2} />
          <path d="M-24,-20 L22,-20 L26,22 L-26,22Z" fill="#5aa58a" stroke="#2c3632" strokeWidth={1.6} strokeLinejoin="round" />
          <path d="M-25,-12 L23,-12 M-26,15 L25,15" stroke="#3f8a72" strokeWidth={2} />
          <ellipse cx={-1} cy={-20} rx={23} ry={4} fill="#3f8a72" stroke="#2c3632" strokeWidth={1.2} />
          <path d="M-12,-21 C-12,-44 20,-44 20,-21" stroke="#2c3632" strokeWidth={5.4} fill="none" strokeLinecap="round" />
          <path d="M-12,-21 C-12,-44 20,-44 20,-21" stroke="#5aa58a" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M-17,-8 L-19,12" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.45} />
          <path d="M14,-8 L16,12" stroke="#2c3632" strokeWidth={4} strokeLinecap="round" opacity={0.15} />
        </g>
      </g>
      {[...Array(9)].map((_, i) => {
        const a = (i / 9) * Math.PI * 2
        const rr = height * 0.4 + 40
        return (
          <path key={i} transform={`translate(${(Math.cos(a) * rr).toFixed(0)},${(-height * 0.45 + Math.sin(a) * rr * 0.8).toFixed(0)})`} d="M0,-6 l1.5,4.5 l4.5,1.5 l-4.5,1.5 l-1.5,4.5 l-1.5,-4.5 l-4.5,-1.5 l4.5,-1.5Z" fill="#fff4b0" className="gs-spark" style={{ animationDelay: `${(3 + i * 0.09).toFixed(2)}s` }} />
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
