// The pond: reflects the sky, reeds, sun and moon; ripples, lily pads, a frog (tap it!) and a dragonfly.
import { useEffect, useMemo, useState } from 'react'
import { mix, rng } from './ink'
import type { Palette } from './palette'
import { useSid } from './ids'

const CX = 258
const CY = 556
const RX = 100
const RY = 16
const WATERLINE = 551

export const REEDS = (() => {
  const r = rng(4242)
  return [...Array(8)].map((_, i) => ({ x: 164 + i * 6.5 + r.range(-2, 2), h: r.range(24, 42), bend: r.range(-5, 5), head: i % 2 === 0 }))
})()

function Reeds({ pal, reflected }: { pal: Palette; reflected?: boolean }) {
  const c = pal.c
  return (
    <g>
      {REEDS.map((rd, i) => (
        <g key={i}>
          <path d={`M${rd.x},${WATERLINE} q${rd.bend},-${rd.h / 2} ${rd.bend * 1.4},-${rd.h}`} stroke={reflected ? mix(c.grass, '#10261a', 0.4) : c.grass} strokeWidth={2} fill="none" strokeLinecap="round" />
          {!reflected && <path d={`M${rd.x},${WATERLINE} q${rd.bend},-${rd.h / 2} ${rd.bend * 1.4},-${rd.h}`} stroke={c.ink} strokeWidth={0.6} fill="none" opacity={0.5} transform="translate(0.9,0)" />}
          {rd.head && (
            <rect x={rd.x + rd.bend * 1.2 - 2.3} y={WATERLINE - rd.h * 0.95} width={4.6} height={12} rx={2.3} fill={reflected ? mix(c.barkDark, '#10261a', 0.4) : c.barkDark} stroke={reflected ? 'none' : c.ink} strokeWidth={0.7} />
          )}
        </g>
      ))}
      {/* a few long leaves */}
      <path d={`M160,${WATERLINE} q-8,-14 -16,-18 M212,${WATERLINE} q10,-12 16,-14`} stroke={reflected ? mix(c.grass, '#10261a', 0.4) : c.grass} strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </g>
  )
}

function Frog({ pal, onTap, state }: { pal: Palette; onTap: () => void; state: 'sit' | 'jump' | 'gone' }) {
  const green = pal.shade('#6aa84f')
  const dark = pal.shade('#3f7a35')
  const belly = pal.shade('#e8efc0')
  const ink = pal.c.ink
  if (state === 'gone') return null
  return (
    <g transform={`translate(${CX + 44},${CY - 2})`} className="gs-tap" onClick={(e) => { e.stopPropagation(); onTap() }}>
      <rect x={-14} y={-16} width={28} height={22} fill="transparent" />
      <g className={state === 'jump' ? 'gs-frogjump' : 'gs-frogsit'}>
        <path d="M-8,0 C-9,-6 -5,-10 0,-10 C5,-10 9,-6 8,0Z" fill={green} stroke={ink} strokeWidth={1} />
        <path d="M-4,0 C-4,-4 4,-4 4,0Z" fill={belly} />
        <circle cx={-4} cy={-10} r={2.6} fill={green} stroke={ink} strokeWidth={0.9} />
        <circle cx={4} cy={-10} r={2.6} fill={green} stroke={ink} strokeWidth={0.9} />
        <circle cx={-4} cy={-10.4} r={1.1} fill="#1a1a1a" />
        <circle cx={4} cy={-10.4} r={1.1} fill="#1a1a1a" />
        <path d="M-3,-6 q3,2 6,0" stroke={ink} strokeWidth={0.7} fill="none" />
        <path d="M-8,0 l-4,1 M8,0 l4,1" stroke={dark} strokeWidth={1.6} strokeLinecap="round" />
        <ellipse cx={0} cy={-5.5} rx={3} ry={1.6} fill={pal.shade('#f2f2d0')} className="gs-croak" />
      </g>
    </g>
  )
}

const RAIN_DROPS = (() => {
  const r = rng(515)
  return [...Array(16)].map(() => {
    const a = r.range(0, Math.PI * 2)
    const d = Math.sqrt(r.range(0, 0.8))
    return { x: CX + Math.cos(a) * RX * 0.85 * d, y: CY + Math.sin(a) * RY * 0.7 * d, dur: r.range(0.9, 1.8), dl: -r.range(0, 1.8), s: r.range(0.7, 1.2) }
  })
})()

export default function Pond({
  pal,
  sunX,
  moonX,
  night,
  frogOK,
  dragonfly,
  rain = false,
  wind = 0.15,
}: {
  pal: Palette
  sunX: number | null
  moonX: number | null
  night: number
  frogOK: boolean
  dragonfly: boolean
  /** raindrops land on the water */
  rain?: boolean
  /** 0..1: the surface is ruffled and the glints dance faster in the wind */
  wind?: number
}) {
  const sid = useSid()
  const [frog, setFrog] = useState<'sit' | 'jump' | 'gone'>('sit')
  const [splash, setSplash] = useState(0)
  useEffect(() => {
    if (frog === 'jump') {
      const a = setTimeout(() => {
        setFrog('gone')
        setSplash(Date.now())
      }, 650)
      return () => clearTimeout(a)
    }
    if (frog === 'gone') {
      const b = setTimeout(() => setFrog('sit'), 7000)
      return () => clearTimeout(b)
    }
  }, [frog])
  const ripples = useMemo(() => {
    const r = rng(77)
    return [...Array(3)].map(() => ({ x: r.range(CX - 40, CX + 40), y: r.range(CY - 3, CY + 4), dl: -r.range(0, 9), dur: r.range(7, 11) }))
  }, [])
  const { sky, c } = pal
  // frogs and dragonflies are away for the winter
  const winter = pal.season.winter > 0.6
  const ruffle = 2 + wind * 7
  const waterTop = mix(mix(sky.bottom, c.pond, 0.5), '#5a9ab0', 0.25 * (1 - night))
  const waterBot = mix(mix(sky.top, '#2f6f8a', 0.5), '#0e2a3a', 0.25)
  const glint = (x: number | null, color: string, strength: number) =>
    x !== null && x > CX - RX + 8 && x < CX + RX - 8 && strength > 0.02 ? (
      <g opacity={strength}>
        <ellipse cx={x} cy={CY - 6} rx={22} ry={4} fill={color} opacity={0.35} />
        <ellipse cx={x} cy={CY - 6} rx={14} ry={2.2} fill={color} className="gs-glint" />
        <path d={`M${x - 9},${CY - 1} h18 M${x - 6},${CY + 3} h12 M${x - 4},${CY + 7} h8 M${x - 2},${CY + 11} h4`} stroke={color} strokeWidth={1.3} strokeLinecap="round" className="gs-glint gs-glint-2" />
      </g>
    ) : null

  return (
    <g>
      <defs>
        <clipPath id={sid('water')}>
          <ellipse cx={CX} cy={CY} rx={RX} ry={RY} />
        </clipPath>
        <linearGradient id={sid('waterg')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={waterTop} />
          <stop offset="1" stopColor={waterBot} />
        </linearGradient>
        <filter id={sid('ripple')} x="-10%" y="-50%" width="120%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.35" numOctaves={2} seed={3} />
          <feDisplacementMap in="SourceGraphic" scale={ruffle} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g clipPath={`url(#${sid('water')})`}>
        <rect x={CX - RX} y={CY - RY} width={RX * 2} height={RY * 2} fill={`url(#${sid('waterg')})`} />
        {/* the far edge mirrors the bright sky near the horizon; the middle shows a soft band of reflected light */}
        <ellipse cx={CX} cy={CY - RY + 3} rx={RX * 0.92} ry={4.5} fill={mix(sky.bottom, '#ffffff', 0.35)} opacity={0.55} />
        <ellipse cx={CX - 10} cy={CY - 2} rx={RX * 0.7} ry={2.2} fill={mix(sky.mid, '#ffffff', 0.3)} opacity={0.35} />
        {/* mirrored reeds, softly broken up by ripples */}
        <g filter={`url(#${sid('ripple')})`} opacity={0.5}>
          <g className="gs-reflect">
            <g transform={`translate(0,${WATERLINE * 2}) scale(1,-1)`}>
              <Reeds pal={pal} reflected />
            </g>
          </g>
        </g>
        {glint(sunX, '#fff6d0', 1 - night)}
        {glint(moonX, '#eef2ff', night)}
        {ripples.map((rp, i) => (
          <ellipse key={i} cx={rp.x} cy={rp.y} rx={20} ry={3.6} fill="none" stroke="#ffffff" strokeWidth={0.9} className="gs-ripple" style={{ animationDelay: `${rp.dl}s`, animationDuration: `${rp.dur}s` }} />
        ))}
        {rain &&
          RAIN_DROPS.map((d, i) => (
            <ellipse
              key={`r${i}`}
              cx={d.x}
              cy={d.y}
              rx={7 * d.s}
              ry={1.6 * d.s}
              fill="none"
              stroke="#ffffff"
              strokeWidth={0.8}
              className="gs-rainring"
              style={{ animationDuration: `${d.dur.toFixed(2)}s`, animationDelay: `${d.dl.toFixed(2)}s` }}
            />
          ))}
        {splash > 0 && <ellipse key={splash} cx={CX + 64} cy={CY + 2} rx={14} ry={3} fill="none" stroke="#ffffff" strokeWidth={1.4} className="gs-ripple gs-ripple-once" />}
        <path d={`M${CX - 44},${CY - 2} l18,0 M${CX + 6},${CY + 4} l24,0 M${CX - 14},${CY + 7} l12,0`} stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" className="gs-shimmer" opacity={0.7} style={{ animationDuration: `${(3.2 / (0.6 + wind * 1.6)).toFixed(2)}s` }} />
        {/* the near bank shades the water a little */}
        <ellipse cx={CX} cy={CY + RY + 2} rx={RX} ry={5} fill="#0d2430" opacity={0.18} />
      </g>
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke={pal.c.ink} strokeWidth={1.5} opacity={0.8} />
      {/* lily pads */}
      {[
        [CX + 34, CY + 3, 12],
        [CX + 62, CY - 4, 9],
        [CX + 12, CY + 8, 8],
        [CX - 30, CY + 6, 7],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <path d={`M0,0 L${r},-1 A${r},${r * 0.36} 0 1 1 ${r * 0.8},${r * 0.2}Z`} fill={pal.shade(i === 1 ? '#7cb85a' : '#5f9e4a')} stroke={pal.c.ink} strokeWidth={0.7} />
          <path d={`M0,0 l${-r * 0.6},${-r * 0.12} M0,0 l${-r * 0.3},${r * 0.2}`} stroke={pal.shade('#3f7a35')} strokeWidth={0.6} />
        </g>
      ))}
      <g transform={`translate(${CX + 13},${CY + 6})`}>
        {night < 0.5 ? (
          <g>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx={0} cy={-3} rx={1.8} ry={3.4} transform={`rotate(${a})`} fill={pal.shade('#f6c3d3')} stroke={pal.c.ink} strokeWidth={0.4} />
            ))}
            <circle r={1.5} fill={pal.shade('#f4d35e')} />
          </g>
        ) : (
          <path d="M-2,0 q2,-6 4,0Z" fill={pal.shade('#e7a8bd')} stroke={pal.c.ink} strokeWidth={0.4} />
        )}
      </g>
      <Reeds pal={pal} />
      {frogOK && !winter && <Frog pal={pal} state={frog} onTap={() => frog === 'sit' && setFrog('jump')} />}
      {dragonfly && !winter && (
        <g transform={`translate(${CX - 20},${CY - 26})`}>
          <g className="gs-dragonfly">
            <path d="M-9,0 L9,0" stroke={pal.shade('#2f7f9a')} strokeWidth={2} strokeLinecap="round" />
            <circle cx={9} cy={0} r={1.7} fill={pal.shade('#2f7f9a')} />
            <g className="gs-dfwing">
              <ellipse cx={4} cy={-4} rx={2} ry={6} transform="rotate(-25 4 -4)" fill="#e9f6ff" opacity={0.75} stroke={pal.c.ink} strokeWidth={0.3} />
              <ellipse cx={1} cy={-4} rx={2} ry={6} transform="rotate(20 1 -4)" fill="#e9f6ff" opacity={0.75} stroke={pal.c.ink} strokeWidth={0.3} />
            </g>
          </g>
        </g>
      )}
    </g>
  )
}
