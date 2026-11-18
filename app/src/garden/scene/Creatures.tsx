import { useSid } from './ids'
// Wildlife and little atmospheric effects. All motion is CSS transform/opacity animation (see garden.css).
import { memo, useEffect, useMemo, useState } from 'react'
import { brush, mix, rng, type P } from './ink'
import { LINES, yAt } from './Landscape'
import './critters.css'
import { Nova, NOVA } from './Critters'
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

export function Squirrel({ s, ink, still }: { s: Shade; ink: string; still?: boolean }) {
  const fur = s('#b8653a')
  const light = s('#f0d9b8')
  return (
    <g className={still ? undefined : 'gs-hop gs-hop-fast'}>
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

export function Horse({ s, ink, coat = '#8a5a36', act }: { s: Shade; ink: string; coat?: string; act?: boolean }) {
  const fur = s(coat)
  const dark = s(mix(coat, '#1e130c', 0.6))
  const light = s(mix(coat, '#fff1dc', 0.35))
  return (
    <g className={act ? 'gs-rear' : 'gs-bob gs-gallop'}>
      <Leg d="M-30,-44 L-36,-20 L-32,0" cls="gs-leg gs-leg-gallop" delay={0} color={dark} />
      <Leg d="M22,-42 L26,-20 L24,0" cls="gs-leg gs-leg-gallop" delay={-0.16} color={dark} />
      <path d="M-40,-58 C-52,-58 -60,-46 -63,-28 C-56,-36 -50,-44 -44,-50Z" fill={dark} stroke={ink} strokeWidth={1.2} className="gs-tail" />
      <path d="M-42,-58 C-32,-71 22,-71 34,-61 C41,-55 41,-45 33,-41 C14,-36 -26,-36 -38,-42 C-46,-46 -47,-53 -42,-58Z" fill={fur} stroke={ink} strokeWidth={1.6} />
      <path d="M-30,-62 C-14,-68 10,-68 26,-62" stroke={light} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
      <Leg d="M-36,-44 L-41,-20 L-38,0" cls="gs-leg gs-leg-gallop" delay={-0.16} color={fur} />
      <Leg d="M28,-42 L33,-20 L30,0" cls="gs-leg gs-leg-gallop" delay={0} color={fur} />
      <path d="M24,-62 C30,-74 38,-88 46,-96 C50,-100 56,-100 60,-96 L71,-82 C73,-79 71,-75 66,-76 L58,-79 C52,-73 45,-61 37,-47Z" fill={fur} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M49,-97 L51,-108 L56,-98Z" fill={fur} stroke={ink} strokeWidth={1.1} />
      <path d="M47,-97 C40,-90 33,-79 26,-66 M44,-93 C38,-88 33,-82 30,-74" stroke={dark} strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={57} cy={-90} r={1.5} fill={ink} />
      <circle cx={68} cy={-79} r={1} fill={ink} />
      {act && <path d="M78,-92 q6,-3 10,0 M80,-84 q6,-1 9,2" stroke={ink} strokeWidth={1.4} fill="none" strokeLinecap="round" />}
    </g>
  )
}

export function Elephant({ s, ink, act }: { s: Shade; ink: string; act?: boolean }) {
  const hide = s('#9c9894')
  const dark = s('#6f6a66')
  return (
    <g className="gs-bob gs-bob-slow">
      <Leg d="M-36,-28 L-36,0" cls="gs-leg gs-leg-heavy" delay={0} color={dark} />
      <Leg d="M26,-28 L27,0" cls="gs-leg gs-leg-heavy" delay={-0.6} color={dark} />
      <path d="M-50,-50 q-9,8 -7,24" stroke={ink} strokeWidth={1.4} fill="none" className="gs-tail" />
      <path d="M-50,-32 C-56,-70 -30,-92 6,-90 C40,-88 58,-68 52,-36 C50,-28 44,-24 36,-24 L-40,-24 C-48,-24 -50,-28 -50,-32Z" fill={hide} stroke={ink} strokeWidth={1.7} />
      <path d="M-40,-76 C-24,-86 8,-88 30,-80" stroke={s('#c4c0ba')} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.6} />
      <path d="M-30,-40 q4,-3 8,0 M-6,-36 q4,-3 8,0" stroke={dark} strokeWidth={1} fill="none" opacity={0.6} />
      <Leg d="M-26,-28 L-27,0" cls="gs-leg gs-leg-heavy" delay={-0.6} color={hide} />
      <Leg d="M36,-28 L36,0" cls="gs-leg gs-leg-heavy" delay={0} color={hide} />
      <path d="M40,-82 C56,-92 78,-82 77,-62 C77,-54 74,-48 70,-44 L58,-40 C50,-42 44,-48 40,-56Z" fill={hide} stroke={ink} strokeWidth={1.6} />
      <g className={act ? 'gs-trumpet' : 'gs-trunk'}>
        <path d="M70,-48 C70,-30 70,-16 77,-8 C79,-5 77,-2 73,-3 C63,-9 60,-24 60,-42Z" fill={hide} stroke={ink} strokeWidth={1.5} />
        <path d="M66,-36 l5,0 M66,-28 l6,-1 M68,-20 l5,-1" stroke={dark} strokeWidth={0.9} />
      </g>
      <path d="M46,-80 C30,-86 22,-66 28,-52 C34,-42 48,-46 52,-56 C55,-66 53,-76 46,-80Z" fill={s('#b3aca6')} stroke={ink} strokeWidth={1.4} className="gs-ear" />
      <path d="M64,-44 q6,5 13,3" stroke="#f6f1e4" strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={63} cy={-68} r={1.6} fill={ink} />
      {act && (
        <g className="gs-spray">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={84 + i * 5} cy={-112 + (i % 2) * 6} r={2.4} fill="#bfe6f5" stroke={ink} strokeWidth={0.5} />
          ))}
        </g>
      )}
    </g>
  )
}

export function Skunk({ s, ink, act }: { s: Shade; ink: string; act?: boolean }) {
  const fur = s('#26262e')
  const white = s('#f4f2ec')
  // tapped: an angry little stomp of the front feet (with dust and a cross mark), then the tail goes up
  return (
    <g className={act ? undefined : 'gs-bob gs-bob-slow'}>
      <Leg d="M-10,-4 L-11,0" cls="gs-leg gs-leg-fast" delay={0} color={fur} />
      <g className={act ? 'gs-skunktail cr-later' : 'gs-tail'}>
        <path d="M-16,-10 C-32,-14 -40,-32 -32,-46 C-26,-55 -12,-51 -14,-40 C-16,-31 -14,-22 -9,-16Z" fill={fur} stroke={ink} strokeWidth={1.4} />
        <path d="M-14,-14 C-26,-20 -32,-34 -26,-44" stroke={white} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      </g>
      <g className={act ? 'cr-stomp' : undefined}>
        <Leg d="M12,-4 L13,0" cls={act ? '' : 'gs-leg gs-leg-fast'} delay={-0.14} color={fur} />
        <path d="M-18,-5 C-22,-16 -10,-24 4,-23 C16,-22 22,-14 20,-6 C18,-1 8,0 -4,0 C-12,0 -17,-2 -18,-5Z" fill={fur} stroke={ink} strokeWidth={1.4} />
        <path d="M-14,-15 C-6,-22 8,-22 17,-14" stroke={white} strokeWidth={3.6} fill="none" strokeLinecap="round" />
        <path d="M16,-14 C20,-20 30,-16 33,-9 C34,-6 30,-4 26,-5 C21,-6 17,-9 16,-14Z" fill={fur} stroke={ink} strokeWidth={1.3} />
        <path d="M19,-16 C24,-15 29,-12 32,-9" stroke={white} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <circle cx={24} cy={-12} r={1.2} fill="#f4f2ec" />
        <circle cx={33} cy={-8.5} r={1.2} fill={ink} />
        {act && <path d="M21,-15 l5,2" stroke={ink} strokeWidth={1.2} strokeLinecap="round" />}
      </g>
      {act && (
        <>
          <g className="cr-stompdust">
            <ellipse cx={14} cy={-1} rx={7} ry={2.4} fill={s('#cdb58a')} opacity={0.8} />
            <circle cx={6} cy={-3} r={1.6} fill={s('#cdb58a')} /><circle cx={22} cy={-3} r={1.4} fill={s('#cdb58a')} />
          </g>
          <g transform="translate(36,-30)" className="cr-angry">
            <path d="M-4,-4 q2,2 0,4 M4,-4 q-2,2 0,4 M-4,-4 q2,-2 4,0 M-4,4 q2,2 4,0" stroke="#d9342b" strokeWidth={1.8} fill="none" strokeLinecap="round" transform="rotate(45)" />
          </g>
          <g className="gs-stink cr-later">
            <path d="M-46,-40 c-6,-6 2,-14 8,-10 c2,-8 14,-6 12,2 c8,0 8,10 0,11 c-2,7 -14,7 -15,1 c-7,2 -11,-3 -5,-4Z" fill="#c9d77a" opacity={0.55} stroke="#8a9a3a" strokeWidth={0.8} />
            <path d="M-52,-58 q3,-4 0,-8 q-3,-4 0,-8 M-40,-60 q3,-4 0,-8 q-3,-4 0,-8" stroke="#8a9a3a" strokeWidth={1.3} fill="none" strokeLinecap="round" />
          </g>
        </>
      )}
    </g>
  )
}

export function Ferret({ s, ink, act }: { s: Shade; ink: string; act?: boolean }) {
  const fur = s('#7d5a3e')
  const cream = s('#f1e2c4')
  const dark = s('#3e2a1c')
  return (
    <g className={act ? 'gs-wardance' : 'gs-hop gs-hop-ferret'}>
      <Leg d="M-22,-5 L-24,0" cls="gs-leg gs-leg-fast" delay={0} color={dark} />
      <Leg d="M15,-5 L17,0" cls="gs-leg gs-leg-fast" delay={-0.14} color={dark} />
      <path d="M-30,-9 C-40,-10 -46,-6 -51,-2 C-45,-4 -38,-5 -30,-6Z" fill={dark} stroke={ink} strokeWidth={1.1} />
      <path d="M-31,-8 C-33,-17 -20,-21 -4,-20 C12,-19 22,-17 26,-12 C28,-8 22,-4 10,-4 C-8,-3 -25,-2 -31,-8Z" fill={fur} stroke={ink} strokeWidth={1.4} />
      <path d="M-20,-6 C-6,-5 8,-5 18,-7" stroke={cream} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
      <Leg d="M-17,-5 L-18,0" cls="gs-leg gs-leg-fast" delay={-0.14} color={dark} />
      <Leg d="M19,-5 L20,0" cls="gs-leg gs-leg-fast" delay={0} color={dark} />
      <path d="M21,-16 C27,-23 38,-21 43,-14 C43,-11 39,-9 33,-9 C27,-9 22,-11 21,-16Z" fill={cream} stroke={ink} strokeWidth={1.3} />
      <path d="M27,-17 C31,-18 36,-16 39,-14" stroke={dark} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <circle cx={26} cy={-20} r={2.4} fill={fur} stroke={ink} strokeWidth={0.9} />
      <circle cx={35} cy={-15.5} r={1.1} fill="#111" />
      <circle cx={43} cy={-13} r={1} fill={s('#d88a8a')} />
      {act && <path d="M30,-34 l0,-8 M30,-27 l0,1" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />}
    </g>
  )
}

/** Nova walking: a small dilute-calico cat, white with grey and cream patches, tail held up. */
export function NovaWalk({ s, ink }: { s: Shade; ink: string }) {
  const sid = useSid()
  const w = s(NOVA.white)
  const g = s(NOVA.grey)
  const cr = s(NOVA.cream)
  const body = 'M-20,-13 C-21,-22 -6,-24 8,-23 C16,-22 20,-18 19,-13 C18,-9 14,-8 10,-8 L-14,-8 C-18,-8 -20,-10 -20,-13Z'
  return (
    <g className="gs-bob gs-bob-slow">
      <defs><clipPath id={`${sid}-nw`}><path d={body} /></clipPath></defs>
      <Leg d="M-15,-9 L-17,0" cls="gs-leg" delay={0} color={g} />
      <Leg d="M11,-9 L12,0" cls="gs-leg" delay={-0.25} color={w} />
      <path d="M-19,-15 C-27,-18 -30,-28 -26,-35 C-25,-37 -23,-36 -23.6,-34" stroke={g} strokeWidth={3.4} fill="none" strokeLinecap="round" className="gs-tail" />
      <path d={body} fill={w} />
      <g clipPath={`url(#${sid}-nw)`}>
        <path d="M-22,-26 C-14,-26 -4,-27 2,-22 C0,-17 -8,-15 -14,-15 C-18,-15 -22,-17 -22,-20Z" fill={g} />
        <path d="M2,-24 C8,-25 14,-23 16,-19 C12,-16 6,-17 3,-19Z" fill={cr} />
        <path d="M-22,-14 C-18,-16 -12,-14 -11,-10 C-14,-7 -20,-7 -22,-9Z" fill={cr} />
      </g>
      <path d={body} fill="none" stroke={ink} strokeWidth={1.2} />
      <Leg d="M-19,-9 L-20,0" cls="gs-leg" delay={-0.25} color={w} />
      <Leg d="M15,-9 L15,0" cls="gs-leg" delay={0} color={w} />
      {/* head */}
      <path d="M17,-26 L18,-33 L22,-28Z" fill={g} stroke={ink} strokeWidth={0.9} strokeLinejoin="round" />
      <path d="M24,-28 L28,-33 L28.4,-25Z" fill={cr} stroke={ink} strokeWidth={0.9} strokeLinejoin="round" />
      <path d="M15,-21 C15,-27 19,-29 23,-29 C28,-29 31,-26 31,-21 C31,-17 28,-15 24,-15 C19,-15 15,-17 15,-21Z" fill={w} />
      <path d="M15,-21 C15,-27 19,-29 22.4,-29 C22,-25 21,-22 19,-20 C17,-19.6 15.6,-20 15,-21Z" fill={g} />
      <path d="M23.4,-29 C27,-29 30,-27 30.6,-23 C28,-22.6 25.6,-24 24.4,-26Z" fill={cr} />
      <path d="M15,-21 C15,-27 19,-29 23,-29 C28,-29 31,-26 31,-21 C31,-17 28,-15 24,-15 C19,-15 15,-17 15,-21Z" fill="none" stroke={ink} strokeWidth={1.1} />
      <ellipse cx={26.6} cy={-22.6} rx={1.3} ry={1.5} fill={NOVA.eye} stroke={ink} strokeWidth={0.4} />
      <path d="M26.8,-23.8 L26.8,-21.4" stroke="#141414" strokeWidth={0.8} strokeLinecap="round" />
      <path d="M30.2,-19.6 L31.4,-19.6 L30.8,-18.8Z" fill={s('#d98a92')} />
      <path d="M29,-18.6 l6,-0.8 M29,-18 l6,0.8" stroke={ink} strokeWidth={0.3} opacity={0.7} />
    </g>
  )
}

export type AnimalKind = 'nova' | 'fox' | 'rabbit' | 'deer' | 'squirrel' | 'hedgehog' | 'horse' | 'foal' | 'elephant' | 'calf' | 'skunk' | 'ferret'
/** Animals that wander along the path. */
export const ANIMALS: AnimalKind[] = ['rabbit', 'nova', 'hedgehog', 'fox', 'squirrel', 'deer', 'ferret', 'skunk']

type Line = 'path' | 'mid' | 'far'
const SPEC: Record<AnimalKind, { line: Line; scale: number; dur: number }> = {
  fox: { line: 'path', scale: 0.95, dur: 13 },
  rabbit: { line: 'path', scale: 0.95, dur: 15 },
  deer: { line: 'mid', scale: 0.55, dur: 34 },
  squirrel: { line: 'path', scale: 1, dur: 10 },
  nova: { line: 'path', scale: 0.85, dur: 20 },
  hedgehog: { line: 'path', scale: 0.9, dur: 30 },
  horse: { line: 'mid', scale: 0.42, dur: 15 },
  foal: { line: 'mid', scale: 0.27, dur: 15 },
  elephant: { line: 'far', scale: 0.3, dur: 80 },
  calf: { line: 'far', scale: 0.17, dur: 80 },
  skunk: { line: 'path', scale: 0.95, dur: 24 },
  ferret: { line: 'path', scale: 0.9, dur: 9 },
}

/** CSS keyframes that move a walker along a terrain line, generated once. */
export const PATH_CSS = (['path', 'mid', 'far'] as const)
  .map((name) => {
    const line = LINES[name]
    const steps = 24
    const frames = Array.from({ length: steps + 1 }, (_, i) => {
      const x = -110 + (1220 * i) / steps
      const y = yAt(line, x) + (name === 'path' ? 3 : name === 'mid' ? 6 : 4)
      return `${((i / steps) * 100).toFixed(1)}%{transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)}`
    }).join('')
    return `@keyframes gs-along-${name}{${frames}}`
  })
  .join('\n')

/** How long each animal stops for when tapped (ms). */
const REACT_MS: Partial<Record<AnimalKind, number>> = { nova: 5200, skunk: 3600, ferret: 1800, horse: 1600, foal: 1600, elephant: 2400, calf: 1200, hedgehog: 2400, fox: 1200, rabbit: 900, deer: 1600, squirrel: 900 }

function Body({ kind, pal, act }: { kind: AnimalKind; pal: Palette; act: boolean }) {
  const s = pal.shade
  const ink = pal.c.ink
  switch (kind) {
    case 'horse':
      return <Horse s={s} ink={ink} act={act} />
    case 'foal':
      return <Horse s={s} ink={ink} coat="#b98a5e" act={act} />
    case 'elephant':
    case 'calf':
      return <Elephant s={s} ink={ink} act={act} />
    case 'skunk':
      return <Skunk s={s} ink={ink} act={act} />
    case 'ferret':
      return <Ferret s={s} ink={ink} act={act} />
    case 'fox':
      return <g className={act ? 'gs-pounce' : undefined}><Fox s={s} ink={ink} /></g>
    case 'rabbit':
      return <g className={act ? 'gs-bighop' : undefined}><Rabbit s={s} ink={ink} /></g>
    case 'deer':
      return <Deer s={s} ink={ink} />
    case 'squirrel':
      return <g className={act ? 'gs-bighop' : undefined}><Squirrel s={s} ink={ink} /></g>
    case 'nova':
      // tapped: she sits down right there and grooms, and a few hearts float up
      return act ? (
        <g>
          <g transform="scale(0.95)"><Nova s={s} ink={ink} groom /></g>
          {[0, 1, 2].map((i) => (
            <path key={i} className="cr-heart" style={{ animationDelay: `${i * 0.35}s` }} transform={`translate(${(i - 1) * 9},-52)`} d="M0,3 C-6,-2 -4,-7 0,-4 C4,-7 6,-2 0,3Z" fill="#ff7a9a" stroke="#c2405f" strokeWidth={0.5} />
          ))}
        </g>
      ) : (
        <NovaWalk s={s} ink={ink} />
      )
    case 'hedgehog':
      return <g className={act ? 'gs-curl' : undefined}><Hedgehog s={s} ink={ink} /></g>
  }
}

/** An animal crossing the scene along a terrain line. Tap it and it stops to do its thing. */
export function Walker({ kind, reverse, pal, onDone, delay = 0, dur }: { kind: AnimalKind; reverse: boolean; pal: Palette; onDone: () => void; delay?: number; dur?: number }) {
  const spec = SPEC[kind]
  const [act, setAct] = useState(false)
  useEffect(() => {
    if (!act) return
    const t = setTimeout(() => setAct(false), REACT_MS[kind] ?? 1200)
    return () => clearTimeout(t)
  }, [act, kind])
  const tall = kind === 'horse' || kind === 'foal' || kind === 'elephant' || kind === 'calf' || kind === 'deer'
  return (
    <g
      className="gs-walker"
      style={{ animation: `gs-along-${spec.line} ${dur ?? spec.dur}s linear ${delay}s 1 both${reverse ? ' reverse' : ''}`, animationPlayState: act ? 'paused' : undefined }}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onDone()
      }}
    >
      <ellipse cx={0} cy={1} rx={28 * spec.scale * (tall ? 1.6 : 1)} ry={4 * spec.scale} fill="#000" opacity={0.12} />
      <g transform={`scale(${reverse ? -spec.scale : spec.scale},${spec.scale})`}>
        <g
          className="gs-tap"
          onClick={(e) => {
            e.stopPropagation()
            setAct(true)
          }}
        >
          <rect x={-60} y={tall ? -120 : -60} width={130} height={tall ? 125 : 66} fill="transparent" />
          <Body kind={kind} pal={pal} act={act} />
        </g>
      </g>
    </g>
  )
}

export type FarEvent = 'horses' | 'elephants' | 'chase'

/** Something happening in the distance: a mare and her foal galloping, an elephant family, a fox chasing a rabbit. */
export function Troupe({ event, reverse, pal, onDone }: { event: FarEvent; reverse: boolean; pal: Palette; onDone: () => void }) {
  if (event === 'chase') {
    return (
      <g>
        <ChaseRunner kind="rabbit" reverse={reverse} pal={pal} delay={0} />
        <ChaseRunner kind="fox" reverse={reverse} pal={pal} delay={0.9} onDone={onDone} />
      </g>
    )
  }
  const members: { kind: AnimalKind; delay: number }[] =
    event === 'horses'
      ? [{ kind: 'horse', delay: 0 }, { kind: 'foal', delay: 1.1 }]
      : [{ kind: 'elephant', delay: 0 }, { kind: 'calf', delay: 5 }, { kind: 'elephant', delay: 11 }]
  const last = members.length - 1
  return (
    <g>
      {members.map((m, i) => (
        <Walker key={i} kind={m.kind} reverse={reverse} pal={pal} delay={m.delay} onDone={i === last ? onDone : () => {}} />
      ))}
    </g>
  )
}

/** A small, fast runner along the distant hill (for chases). */
function ChaseRunner({ kind, reverse, pal, delay, onDone }: { kind: AnimalKind; reverse: boolean; pal: Palette; delay: number; onDone?: () => void }) {
  const sc = 0.5
  return (
    <g
      className="gs-walker"
      style={{ animation: `gs-along-mid 9s linear ${delay}s 1 both${reverse ? ' reverse' : ''}` }}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onDone?.()
      }}
    >
      <g transform={`scale(${reverse ? -sc : sc},${sc})`}>
        <g className="gs-hop gs-hop-fast">
          <Body kind={kind} pal={pal} act={false} />
        </g>
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

/** A few tall trees on the far hill, where monkeys play when the garden is thriving. Tap them! */
export function Grove({ pal, monkeys, onTap, flip }: { pal: Palette; monkeys: boolean; onTap: () => void; flip: number }) {
  const sid = useSid()
  const trees = useMemo(() => {
    const r = rng(808)
    return [
      { x: 846, h: 92, w: 44 },
      { x: 902, h: 110, w: 52 },
      { x: 950, h: 84, w: 40 },
    ].map((t) => {
      const base = yAt(LINES.far, t.x) + 6
      const crown: string[] = []
      for (let i = 0; i < 6; i++) crown.push(scallopish(t.x + r.range(-t.w * 0.6, t.w * 0.6), base - t.h + r.range(-10, 18), t.w * r.range(0.42, 0.6), r))
      return { ...t, base, crown: crown.join(' '), trunk: brush([[t.x, base], [t.x + r.range(-3, 3), base - t.h * 0.5], [t.x + r.range(-4, 4), base - t.h * 0.85]], 7, 3, r, { taperIn: 0, taperOut: 0.2 }) }
    })
  }, [])
  const haze = (c: string) => mix(pal.shade(c), pal.c.farHill2, 0.35)
  const ink = pal.c.ink
  const t1 = trees[0]
  const t2 = trees[1]
  // a hanging vine between the first two trees
  const vineX = (t1.x + t2.x) / 2
  const vineY = t1.base - t1.h + 14
  return (
    <g>
      {trees.map((t, i) => (
        <g key={i}>
          <path d={t.trunk} fill={haze('#6b5440')} stroke={ink} strokeWidth={0.8} opacity={0.9} />
          <path d={t.crown} fill={haze('#4f8a52')} stroke={ink} strokeWidth={0.8} strokeOpacity={0.6} />
          <path d={t.crown} fill={`url(#${sid('grovehi')})`} />
        </g>
      ))}
      <path d={`M${t1.x + 8},${vineY - 4} Q${vineX},${vineY + 10} ${t2.x - 8},${vineY - 8}`} stroke={haze('#4a6a34')} strokeWidth={1.4} fill="none" />
      {monkeys && (
        <g className="gs-tap gs-fadein" onClick={(e) => { e.stopPropagation(); onTap() }}>
          <rect x={t1.x - 30} y={t1.base - t1.h - 40} width={t2.x - t1.x + 70} height={90} fill="transparent" />
          {/* one swings from the vine by its tail */}
          <g transform={`translate(${vineX},${vineY + 6})`}>
            <g key={flip} className={flip ? 'gs-monkeyflip' : 'gs-monkeyswing'}>
              <Monkey s={pal.shade} ink={ink} hanging />
            </g>
          </g>
          {/* another sits on top of the tall tree and scratches its head */}
          <g transform={`translate(${t2.x + 6},${t2.base - t2.h - 14}) scale(0.9)`}>
            <Monkey s={pal.shade} ink={ink} />
          </g>
          {/* a third leaps between the trees now and then */}
          <g transform={`translate(${t2.x + 18},${t2.base - t2.h + 6})`}>
            <g className="gs-monkeyleap">
              <g transform="scale(-0.85,0.85)">
                <Monkey s={pal.shade} ink={ink} leaping />
              </g>
            </g>
          </g>
        </g>
      )}
      <defs>
        <radialGradient id={sid('grovehi')} cx="0.35" cy="0.25" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.25} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
    </g>
  )
}

/** A small monkey, about 14 units tall. */
function Monkey({ s, ink, hanging, leaping }: { s: Shade; ink: string; hanging?: boolean; leaping?: boolean }) {
  const fur = s('#6b4a32')
  const face = s('#e2c4a0')
  if (hanging) {
    // tail curled over the vine, body and arms hanging down
    return (
      <g>
        <path d="M0,-6 C-4,-12 2,-16 4,-11 C5,-8 2,-4 1,0" stroke={fur} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <ellipse cx={1} cy={6} rx={3.6} ry={5.2} fill={fur} stroke={ink} strokeWidth={0.7} />
        <circle cx={1} cy={13.5} r={3.6} fill={fur} stroke={ink} strokeWidth={0.7} />
        <ellipse cx={1} cy={14.4} rx={2.3} ry={1.9} fill={face} />
        <path d="M-2,4 l-4,10 M4,4 l4,10" stroke={fur} strokeWidth={1.5} strokeLinecap="round" />
      </g>
    )
  }
  return (
    <g className={leaping ? undefined : 'gs-scratch'}>
      <path d="M-4,-2 C-12,-2 -12,-12 -6,-12" stroke={fur} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <ellipse cx={0} cy={-6} rx={4} ry={5} fill={fur} stroke={ink} strokeWidth={0.7} />
      <circle cx={2} cy={-13} r={3.7} fill={fur} stroke={ink} strokeWidth={0.7} />
      <ellipse cx={3} cy={-12.4} rx={2.4} ry={2} fill={face} />
      <circle cx={-1.5} cy={-14} r={1.3} fill={face} stroke={ink} strokeWidth={0.4} />
      {leaping ? (
        <path d="M-2,-8 l-7,-5 M3,-8 l7,-5 M-2,-2 l-6,4 M2,-2 l6,4" stroke={fur} strokeWidth={1.5} strokeLinecap="round" />
      ) : (
        <path d="M3,-8 q5,-4 2,-9" stroke={fur} strokeWidth={1.5} fill="none" strokeLinecap="round" className="gs-scratcharm" />
      )}
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

export function Owl({ x, y, pal, onTap, spin }: { x: number; y: number; pal: Palette; onTap?: () => void; spin?: number }) {
  const ink = pal.c.ink
  const body = mix('#8a6a50', '#3a3a5a', 0.35)
  const belly = mix('#d8c2a0', '#5a5a7a', 0.3)
  return (
    <g transform={`translate(${x},${y})`} className="gs-owl gs-tap" onClick={(e) => { e.stopPropagation(); onTap?.() }}>
      <rect x={-16} y={-38} width={32} height={40} fill="transparent" />
      <path d="M-13,0 C-16,-12 -13,-27 0,-29 C13,-27 16,-12 13,0Z" fill={body} stroke={ink} strokeWidth={1.5} />
      <path d="M-8,-2 C-10,-10 -8,-17 0,-18 C8,-17 10,-10 8,-2Z" fill={belly} />
      <path d="M-5,-12 l2,2 l2,-2 M1,-12 l2,2 l2,-2 M-3,-7 l2,2 l2,-2 M2,-7 l2,2 l2,-2" stroke={mix(body, '#000', 0.3)} strokeWidth={0.9} fill="none" />
      <g key={spin} className={spin ? 'gs-owlspin' : 'gs-owlhead'}>
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
    const spots = [
      [258, 540, 100, 20],
      [620, 470, 150, 90],
      [500, 600, 480, 60],
      [120, 520, 90, 50],
    ]
    return [...Array(28)].map((_, i) => {
      const [cx, cy, rx, ry] = spots[i % spots.length]
      return { x: cx + r.range(-rx, rx), y: cy + r.range(-ry, ry), d: r.range(5, 11), dl: -r.range(0, 11), p: r.pick([1, 2, 3] as const), s: r.range(0.7, 1.3) }
    })
  }, [])
  return (
    <g>
      {flies.map((f, i) => (
        <g key={i} transform={`translate(${f.x.toFixed(0)},${f.y.toFixed(0)})`}>
          <g className={`gs-firefly gs-ff-${f.p}`} style={{ animationDuration: `${f.d.toFixed(1)}s`, animationDelay: `${f.dl.toFixed(1)}s` }}>
            <circle r={14 * f.s} fill={`url(#${sid('ffglow')})`} />
            <circle r={1.8 * f.s} fill="#fdffc8" />
          </g>
        </g>
      ))}
      <defs>
        <radialGradient id={sid('ffglow')}>
          <stop offset="0" stopColor="#f6ff9a" stopOpacity={0.85} />
          <stop offset="0.3" stopColor="#d8ff7a" stopOpacity={0.3} />
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
