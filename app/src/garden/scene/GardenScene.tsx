// The animated illustrated garden. Layers are separate SVGs so static, filtered scenery is painted once
// and only the small animated things are redrawn.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { SceneId } from './ids'
import type { ForestTree, GardenSceneProps, GrowthStage } from '../types'
import { useGardenAudio } from '../audio'
import { mix } from './ink'
import { palette } from './palette'
import { Filters, Front, H, Land, LINES, PLANT_BASE, Sky, W, yAt } from './Landscape'
import { GroundTuft, Plant } from './Plant'
import {
  ANIMALS,
  Bee,
  BlowingLeaves,
  Butterfly,
  Dust,
  Fireflies,
  Flocks,
  Mist,
  Owl,
  PATH_CSS,
  PondShimmer,
  Swirls,
  Walker,
  Watering,
  type AnimalKind,
} from './Creatures'
import './garden.css'

const VB = `0 0 ${W} ${H}`
const ZOOM = [1, 1.35, 1.32, 1.28, 1.24, 1.2, 1.16, 1.12, 1.08, 1.04, 1, 1]
/** young plants are drawn a little larger than life so they read well on a phone */
const PLANT_SCALE = [1, 1.7, 1.6, 1.45, 1.35, 1.3, 1.2, 1.1, 1, 1, 1, 1]

function useDocumentVisible() {
  const [v, setV] = useState(() => typeof document === 'undefined' || !document.hidden)
  useEffect(() => {
    const on = () => setV(!document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return v
}

function useReducedMotion() {
  const [r, setR] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setR(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return r
}

function hashNum(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Stage, scale and base position for a neighbour tree in the forest. */
function neighbour(t: ForestTree) {
  const stage: GrowthStage = t.growth < 0.15 ? 6 : t.growth < 0.3 ? 7 : t.growth < 0.45 ? 8 : t.growth < 0.75 ? 9 : 10
  const x = t.x * W
  const y = yAt(LINES.mid, x) + 4 + (yAt(LINES.near, x) + 26 - (yAt(LINES.mid, x) + 4)) * t.depth
  const depthScale = 0.32 + 0.45 * t.depth
  const scale = depthScale * (stage >= 9 ? 0.55 + 0.45 * t.growth : 0.75)
  return { stage, x, y, scale, seed: hashNum(t.id) % 1000 }
}

export default function GardenScene({ stage, health, dead, weather, timeOfDay, trees, muted, waterPulse, onTap }: GardenSceneProps) {
  const hour = Math.round(timeOfDay * 20) / 20
  const pal = useMemo(() => palette(hour, weather), [hour, weather])
  const sid = 'gs' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const visible = useDocumentVisible()
  const reduced = useReducedMotion()
  const night = pal.night
  const day = night < 0.5
  const sunnyDay = weather === 'sunny' && day
  const nightLife = night > 0.6 && (weather === 'sunny' || weather === 'partly-cloudy')
  useGardenAudio({ muted, weather, night, visible })

  // a random animal walks by every 20-40 s when it is sunny in the daytime
  const [walker, setWalker] = useState<{ kind: AnimalKind; reverse: boolean; id: number } | null>(null)
  const lastKind = useRef<AnimalKind | null>(null)
  useEffect(() => {
    if (!sunnyDay || !visible || reduced || walker) return
    const first = lastKind.current === null
    const t = setTimeout(
      () => {
        let kind = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
        if (kind === lastKind.current) kind = ANIMALS[(ANIMALS.indexOf(kind) + 1) % ANIMALS.length]
        lastKind.current = kind
        setWalker({ kind, reverse: Math.random() < 0.5, id: Date.now() })
      },
      first ? 3500 : 20000 + Math.random() * 20000,
    )
    return () => clearTimeout(t)
  }, [sunnyDay, visible, reduced, walker])
  useEffect(() => {
    if (!sunnyDay) setWalker(null)
  }, [sunnyDay])

  // watering animation whenever waterPulse changes to a new non-zero value
  const [watering, setWatering] = useState(0)
  useEffect(() => {
    if (!waterPulse) return
    setWatering(waterPulse)
    const t = setTimeout(() => setWatering(0), 4200)
    return () => clearTimeout(t)
  }, [waterPulse])

  const isTree = stage >= 9
  const plantHeight = [0, 30, 50, 100, 140, 160, 200, 230, 260, 320, 400, 400][stage] * PLANT_SCALE[stage]
  const windy = weather === 'overcast' || weather === 'drought'
  const swirlCount = { sunny: 2, 'partly-cloudy': 3, overcast: 6, drought: 3 }[weather] - (night > 0.5 ? 1 : 0)
  const leafColors = health > 0.6 ? ['#7fbf55', '#a6d06a', '#5f9e45'] : health > 0.3 ? ['#d9c050', '#c9a84a', '#a6b04a'] : ['#b5824a', '#9a6a3a', '#c99a5a']
  const leafCount = dead || stage < 7 ? 0 : { sunny: 2, 'partly-cloudy': 3, overcast: 6, drought: 5 }[weather] + (health < 0.6 ? 2 : 0)
  const mistOpacity = Math.max(
    hour > 4.8 && hour < 8.5 ? 1 - Math.abs(hour - 6.4) / 2.2 : 0,
    weather === 'overcast' ? 0.6 : 0,
    night * 0.35,
  )
  const nb = trees.map((t) => ({ t, ...neighbour(t) })).sort((a, b) => a.y - b.y)
  const behind = nb.filter((n) => n.y <= PLANT_BASE[1])
  const infront = nb.filter((n) => n.y > PLANT_BASE[1])
  const crownY = PLANT_BASE[1] - (isTree ? (stage >= 10 ? 330 : 230) : plantHeight * 0.8)

  const renderNb = (n: (typeof nb)[number]) => (
    <g key={n.t.id} transform={`translate(${n.x.toFixed(1)},${n.y.toFixed(1)}) scale(${n.scale.toFixed(3)})`}>
      <Plant stage={n.stage} health={Math.max(health, 0.45)} dead={false} pal={pal} seed={n.seed} uid={`${sid}nb${n.t.id}`} />
    </g>
  )

  return (
    <SceneId.Provider value={sid}>
    <div className={`gs${visible ? '' : ' gs-paused'}`} onClick={onTap} role="img" aria-label={`Your garden: stage ${stage} of 11, ${weather.replace('-', ' ')}`}>
      <style>{PATH_CSS}</style>
      {/* sky: gradient, sun, moon, stars, clouds, birds */}
      <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer">
        <Sky pal={pal}>{sunnyDay && !reduced && <Flocks ink={pal.c.ink} />}</Sky>
      </svg>
      {/* the camera starts close to a young plant and pulls back as it grows */}
      <div className="gs-cam" style={{ transform: `scale(${ZOOM[stage]})`, transformOrigin: `${(PLANT_BASE[0] / W) * 100}% ${(PLANT_BASE[1] / H) * 100}%` }}>
      {/* scenery (static, watercolour filter) */}
      <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer">
        <Filters />
        <Land pal={pal} />
      </svg>
      {/* living things */}
      <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer">
        {mistOpacity > 0.02 && <Mist color={mix(pal.sky.bottom, '#ffffff', 0.5)} opacity={Math.min(0.8, mistOpacity)} />}
        {walker?.kind === 'deer' && <Walker key={walker.id} kind="deer" reverse={walker.reverse} pal={pal} onDone={() => setWalker(null)} />}
        {behind.map(renderNb)}
        <g transform={`translate(${PLANT_BASE[0]},${PLANT_BASE[1]})`}>
          <g className="gs-t" style={{ transform: `scale(${PLANT_SCALE[stage]})` }}>
          <g key={watering || 'still'} className={watering ? 'gs-bounce' : undefined}>
            <Plant stage={stage} health={health} dead={dead} pal={pal} seed={7} uid={`${sid}main`} windy={windy} />
          </g>
          {stage > 1 && <GroundTuft pal={pal} w={isTree ? 60 : 26} seed={3} />}
          </g>
          {watering > 0 && <Watering key={watering} height={plantHeight} />}
        </g>
        {infront.map(renderNb)}
        {weather !== 'drought' && <PondShimmer />}
        {walker && walker.kind !== 'deer' && <Walker key={walker.id} kind={walker.kind} reverse={walker.reverse} pal={pal} onDone={() => setWalker(null)} />}
        {sunnyDay && (
          <>
            <Butterfly x={470} y={560} color={pal.shade('#f2a541')} path={1} dur={16} delay={-3} ink={pal.c.ink} />
            <Butterfly x={800} y={590} color={pal.shade('#f5dc6a')} path={2} dur={19} delay={-9} ink={pal.c.ink} />
            <Butterfly x={330} y={620} color={pal.shade('#b8a2e6')} path={3} dur={22} delay={-14} ink={pal.c.ink} />
            <Bee x={700} y={600} dur={7} delay={-2} ink={pal.c.ink} />
            <Bee x={150} y={640} dur={8.5} delay={-5} ink={pal.c.ink} />
          </>
        )}
        {leafCount > 0 && !reduced && (
          <BlowingLeaves x={PLANT_BASE[0]} y={crownY} spread={isTree ? 120 : 50} colors={leafColors.map(pal.shade)} count={leafCount} ink={pal.c.ink} />
        )}
        {nightLife && <Owl x={108} y={506} pal={pal} />}
        {nightLife && !reduced && <Fireflies />}
        {weather === 'drought' && !reduced && <Dust />}
        {!reduced && <Swirls count={Math.max(0, swirlCount)} ink={pal.c.ink} />}
      </svg>
      {/* foreground grass and flowers */}
      <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer">
        <Front pal={pal} />
      </svg>
      </div>
      {/* paper grain and night vignette */}
      <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer gs-grain" aria-hidden>
        <rect width={W} height={H} filter={`url(#${sid}-grain)`} opacity={0.28} />
      </svg>
      <div
        className="gs-vignette"
        style={{
          opacity: Math.max(night * 0.9, weather === 'overcast' ? 0.5 : 0),
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(8,12,34,.55) 100%)',
        }}
      />
    </div>
    </SceneId.Provider>
  )
}
