// The animated illustrated garden. Layers: a GPU sky (canvas), then SVG sky details, scenery, living things,
// foreground, and a paper texture on top. The camera zoom is applied inside each SVG so everything stays crisp.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { SceneId } from './ids'
import type { ForestTree, GardenSceneProps, GrowthStage } from '../types'
import { playOwlNow, useGardenAudio } from '../audio'
import { mix } from './ink'
import { palette } from './palette'
import { celestial, Front, H, Land, LINES, moonPhase, Paper, PLANT_BASE, Sky, W, yAt } from './Landscape'
import { GroundTuft, Plant } from './Plant'
import SkyShader, { webglAvailable, type SkyUniforms } from './SkyShader'
import Pond from './Pond'
import Precip from './Precip'
import { Clover, Critters, EggEffects, FarLife, type EggFx } from './Critters'
import { celebrate } from '../../confetti'
import { Burrow, Nest, NutSprouts, Snail, SquirrelAct } from './Eggs'
import { ageDays, auroraNight, loadEggs, saveEggs, type EggMemory } from './eggMemory'
import {
  ANIMALS,
  Bee,
  BlowingLeaves,
  Butterfly,
  Dust,
  Fireflies,
  Flocks,
  Grove,
  Mist,
  Owl,
  PATH_CSS,
  Swirls,
  Troupe,
  Walker,
  Watering,
  type AnimalKind,
  type FarEvent,
} from './Creatures'
import './garden.css'

const VB = `0 0 ${W} ${H}`
const ZOOM = [1, 1.35, 1.32, 1.28, 1.24, 1.2, 1.16, 1.12, 1.08, 1.04, 1, 1]
/** young plants are drawn a little larger than life so they read well on a phone */
const PLANT_SCALE = [1, 1.7, 1.6, 1.45, 1.35, 1.3, 1.2, 1.1, 1, 1, 1, 1]
const EGGS_KEY = 'garden-eggs-v1'
/** animals that walk on the distant hills, drawn behind the plant */
const FAR_KINDS: AnimalKind[] = ['deer', 'horse', 'foal', 'elephant', 'calf']

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

const localKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Stage, scale and base position for a neighbour tree in the forest. */
function neighbour(t: ForestTree) {
  // young neighbours pass through every stage of the main plant: sprout, stem, leaves, blossom, fruit
  const steps = [0.06, 0.12, 0.2, 0.28, 0.38, 0.5, 0.62, 0.8]
  const i = steps.findIndex((g) => t.growth < g)
  const stage = (i < 0 ? 10 : i + 2) as GrowthStage
  const x = t.x * W
  const y = yAt(LINES.mid, x) + 4 + (yAt(LINES.near, x) + 26 - (yAt(LINES.mid, x) + 4)) * t.depth
  const depthScale = 0.32 + 0.45 * t.depth
  const scale = depthScale * (stage >= 9 ? 0.55 + 0.45 * t.growth : 0.85)
  return { stage, x, y, scale, seed: hashNum(t.id) % 1000 }
}

export default function GardenScene({ stage, health, dead, weather: condition, sky = 'clear', timeOfDay, trees, muted, waterPulse, onTap, dev }: GardenSceneProps) {
  const hour = Math.round(timeOfDay * 20) / 20
  // What the sky looks like comes from the real weather; health (studying) alone decides how alive the garden is.
  // A long break from studying still dries the ground out, unless it is actually raining or snowing.
  const wet = sky === 'rain' || sky === 'snow'
  const weather = condition === 'drought' && !wet ? 'drought' : sky === 'clear' ? 'sunny' : wet ? 'overcast' : 'partly-cloudy'
  // how alive the garden is: a neglected garden turns grey, gathers clouds and the animals stay away
  const vital = dead ? 0 : Math.max(0, Math.min(1, health))
  const gloom = Math.round(Math.max(0, Math.min(1, (0.92 - vital) / 0.92)) * 20) / 20
  const pal = useMemo(() => palette(hour, weather, gloom), [hour, weather, gloom])
  const sid = 'gs' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const box = useRef<HTMLDivElement>(null)
  const visible = useDocumentVisible()
  const reduced = useReducedMotion()
  const night = pal.night
  const day = night < 0.5
  const clear = weather === 'sunny' || weather === 'partly-cloudy'
  const sunnyDay = weather === 'sunny' && day
  const nightLife = night > 0.6 && clear && vital > 0.3
  const { sun, moon } = celestial(hour)
  /** 0..1: how much wildlife is about right now (health alone; none at night) */
  const life = day ? vital : 0
  useGardenAudio({ muted, weather, sky, night, visible })

  // ---------- day-to-day stories ----------
  const today = dev?.today ?? localKey(new Date())
  const eggsKey = dev?.eggsKey ?? EGGS_KEY
  const [eggs, setEggs] = useState<EggMemory>(() => loadEggs(eggsKey))
  useEffect(() => setEggs(loadEggs(eggsKey)), [eggsKey, dev?.eggsVersion])
  const updateEggs = (f: (m: EggMemory) => EggMemory) =>
    setEggs((m) => {
      const n = f(m)
      saveEggs(eggsKey, n)
      return n
    })
  useEffect(() => {
    if (stage >= 9 && !dead && !eggs.nestStart) updateEggs((m) => ({ ...m, nestStart: today }))
    if (sunnyDay && !eggs.burrowStart) updateEggs((m) => ({ ...m, burrowStart: today }))
  }, [stage, dead, sunnyDay, today, eggs.nestStart, eggs.burrowStart]) // eslint-disable-line react-hooks/exhaustive-deps

  // the squirrel visits once a day, in fair daytime weather
  const [squirrel, setSquirrel] = useState(0)
  const squirrelOK = day && clear && visible && !reduced && vital > 0.4
  useEffect(() => {
    if (!squirrelOK || squirrel || eggs.squirrelDay === today) return
    const t = setTimeout(() => setSquirrel(Date.now()), 6000)
    return () => clearTimeout(t)
  }, [squirrelOK, squirrel, eggs.squirrelDay, today])
  useEffect(() => {
    if (dev?.squirrel) setSquirrel(dev.squirrel)
  }, [dev?.squirrel])

  // ---------- walkers ----------
  // The healthier the garden, the more often animals come by and the more kinds there are.
  const [walker, setWalker] = useState<{ kind: AnimalKind; reverse: boolean; id: number } | null>(null)
  const lastKind = useRef<AnimalKind | null>(null)
  const pool: AnimalKind[] = life >= 0.85 ? ANIMALS : life >= 0.6 ? ANIMALS.slice(0, 5) : ['rabbit', 'hedgehog']
  const walkersOn = life >= 0.35 && visible && !reduced
  useEffect(() => {
    if (!walkersOn || walker || squirrel) return
    const first = lastKind.current === null
    const gap = life >= 0.85 ? 12000 + Math.random() * 12000 : life >= 0.6 ? 25000 + Math.random() * 20000 : 50000 + Math.random() * 30000
    const t = setTimeout(
      () => {
        let kind = pool[Math.floor(Math.random() * pool.length)]
        if (kind === lastKind.current) kind = pool[(pool.indexOf(kind) + 1) % pool.length]
        lastKind.current = kind
        setWalker({ kind, reverse: Math.random() < 0.5, id: Date.now() })
      },
      first ? 3500 : gap,
    )
    return () => clearTimeout(t)
  }, [walkersOn, walker, squirrel, life >= 0.85, life >= 0.6]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (dev?.walker) setWalker({ kind: dev.walker.kind, reverse: Math.random() < 0.5, id: dev.walker.id })
  }, [dev?.walker])

  // ---------- far away: horses, elephants, a chase (only when the garden is thriving) ----------
  const [far, setFar] = useState<{ event: FarEvent; reverse: boolean; id: number } | null>(null)
  const farOn = life >= 0.85 && visible && !reduced
  useEffect(() => {
    if (!farOn || far) return
    const t = setTimeout(
      () => {
        const events: FarEvent[] = ['horses', 'elephants', 'chase', 'horses', 'chase']
        setFar({ event: events[Math.floor(Math.random() * events.length)], reverse: Math.random() < 0.5, id: Date.now() })
      },
      9000 + Math.random() * 25000,
    )
    return () => clearTimeout(t)
  }, [farOn, far])
  useEffect(() => {
    if (dev?.far) setFar({ event: dev.far.event, reverse: Math.random() < 0.5, id: dev.far.id })
  }, [dev?.far])
  const [monkeyFlip, setMonkeyFlip] = useState(0)

  // ---------- hidden secrets ----------
  // tap Nova for hearts; tap the farmer's hat three times for a shower of hay; tap the plant seven times quickly for a
  // rainbow; find the four-leaf clover in the long grass. A rainbow also appears when real rain clears in the day.
  const [eggFx, setEggFx] = useState<EggFx | null>(null)
  const taps = useRef<Record<string, number[]>>({})
  const [clover, setClover] = useState(() => {
    try { return localStorage.getItem('garden-clover') === '1' } catch { return false }
  })
  const onEgg = (name: string) => {
    const t = Date.now()
    const list = (taps.current[name] = [...(taps.current[name] ?? []).filter((x) => t - x < 4000), t])
    if (name === 'nova') setEggFx({ kind: 'hearts', id: t })
    if (name === 'hat' && list.length >= 3) {
      taps.current.hat = []
      setEggFx({ kind: 'hay', id: t })
    }
    if (name === 'plant' && list.length >= 7) {
      taps.current.plant = []
      setEggFx({ kind: 'rainbow', id: t })
    }
    if (name === 'clover') {
      setEggFx({ kind: 'clover', id: t })
      celebrate('big')
      if (!clover) {
        setClover(true)
        try { localStorage.setItem('garden-clover', '1') } catch { /* ignore */ }
      }
    }
  }
  const lastSky = useRef(sky)
  useEffect(() => {
    if (lastSky.current === 'rain' && (sky === 'clear' || sky === 'cloudy') && day) setEggFx({ kind: 'rainbow', id: Date.now() })
    lastSky.current = sky
  }, [sky, day])
  useEffect(() => {
    if (!eggFx) return
    const t = setTimeout(() => setEggFx(null), eggFx.kind === 'rainbow' ? 10500 : 2600)
    return () => clearTimeout(t)
  }, [eggFx])

  // ---------- watering ----------
  const [watering, setWatering] = useState(0)
  useEffect(() => {
    if (!waterPulse) return
    setWatering(waterPulse)
    const t = setTimeout(() => setWatering(0), 6400)
    return () => clearTimeout(t)
  }, [waterPulse])

  // ---------- owl ----------
  const [owlSpin, setOwlSpin] = useState(0)

  // ---------- GPU sky ----------
  const [gpu, setGpu] = useState(() => typeof document !== 'undefined' && webglAvailable())
  const shader = gpu && dev?.shader !== false
  const occlusion = useRef(0)
  useEffect(() => {
    if (dev?.occlusion !== undefined) {
      occlusion.current = dev.occlusion
      return
    }
    if (!shader || !sun || !visible) {
      occlusion.current = 0
      return
    }
    // how much of the sun is hidden by clouds right now: the light shafts grow when a cloud passes
    const t = setInterval(() => {
      const el = box.current
      const s = el?.querySelector('[data-sun]')?.getBoundingClientRect()
      if (!el || !s || !s.width) return
      let covered = 0
      el.querySelectorAll('.gs-cloudbody').forEach((c) => {
        const r = c.getBoundingClientRect()
        const w = Math.max(0, Math.min(r.right, s.right) - Math.max(r.left, s.left))
        const h = Math.max(0, Math.min(r.bottom - r.height * 0.1, s.bottom) - Math.max(r.top + r.height * 0.25, s.top))
        covered += (w * h) / (s.width * s.height)
      })
      occlusion.current = Math.min(1, covered)
    }, 250)
    return () => clearInterval(t)
  }, [shader, sun?.x === undefined, visible, dev?.occlusion]) // eslint-disable-line react-hooks/exhaustive-deps

  const phase = dev?.moonPhase ?? moonPhase(new Date())
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2
  const auroraWanted = dev?.aurora === 'on' || (dev?.aurora !== 'off' && auroraNight(today) && clear)
  const uniforms: SkyUniforms = {
    top: pal.sky.top,
    mid: pal.sky.mid,
    bottom: pal.sky.bottom,
    glow: pal.sky.glow,
    night,
    overcast: Math.max(weather === 'overcast' ? 1 : weather === 'partly-cloudy' ? 0.25 : 0, gloom * 0.85),
    drought: weather === 'drought' ? 1 : 0,
    sun,
    sunVis: (weather === 'overcast' ? 0.2 : 1 - night * 0.6) * (1 - gloom * 0.6),
    moon,
    moonLight: night * (0.35 + 0.65 * illum) * (weather === 'overcast' ? 0.35 : 1),
    aurora: auroraWanted && vital > 0.5 ? (weather === 'sunny' ? 1 : 0.65) * Math.max(0, night * 1.4 - 0.4) : 0,
    meteors: clear && !reduced ? 1 : 0,
    starVis: weather === 'overcast' ? 0.1 : weather === 'partly-cloudy' ? 0.75 : weather === 'drought' ? 0.9 : 1,
  }

  // ---------- layout numbers ----------
  const isTree = stage >= 9
  const plantHeight = [0, 30, 50, 100, 140, 160, 200, 230, 260, 320, 400, 400][stage] * PLANT_SCALE[stage]
  const windy = sky === 'windy' || sky === 'rain' || weather === 'drought'
  const swirlCount = { sunny: 2, 'partly-cloudy': 3, overcast: 6, drought: 3 }[weather] - (night > 0.5 ? 1 : 0)
  // a young tree in blossom sheds pink petals on the breeze instead of leaves
  const petals = stage === 9 && health > 0.75 && !dead
  const leafColors = petals
    ? ['#fbd9e3', '#f6c3d3', '#fff4f6']
    : health > 0.6
      ? ['#7fbf55', '#a6d06a', '#5f9e45']
      : health > 0.3
        ? ['#d9c050', '#c9a84a', '#a6b04a']
        : ['#b5824a', '#9a6a3a', '#c99a5a']
  const leafCount = dead || stage < 7 ? 0 : { sunny: 2, 'partly-cloudy': 3, overcast: 6, drought: 5 }[weather] + (health < 0.6 ? 2 : 0) + (petals ? 3 : 0)
  const mistOpacity = Math.max(hour > 4.8 && hour < 8.5 ? 1 - Math.abs(hour - 6.4) / 2.2 : 0, weather === 'overcast' ? 0.6 : 0, night * 0.35)
  const nb = trees.map((t) => ({ t, ...neighbour(t) })).sort((a, b) => a.y - b.y)
  const behind = nb.filter((n) => n.y <= PLANT_BASE[1])
  const infront = nb.filter((n) => n.y > PLANT_BASE[1])
  const crownY = PLANT_BASE[1] - (isTree ? (stage >= 10 ? 330 : 230) : plantHeight * 0.8)
  const nestAge = ageDays(eggs.nestStart, today)
  const burrowAge = ageDays(eggs.burrowStart, today)
  const cam = { transform: `scale(${ZOOM[stage]})`, transformOrigin: `${PLANT_BASE[0]}px ${PLANT_BASE[1]}px` }

  const renderNb = (n: (typeof nb)[number]) => (
    <g key={n.t.id} transform={`translate(${n.x.toFixed(1)},${n.y.toFixed(1)}) scale(${n.scale.toFixed(3)})`}>
      <Plant stage={n.stage} health={Math.max(health, 0.3)} dead={false} pal={pal} seed={n.seed} uid={`${sid}nb${n.t.id}`} />
    </g>
  )

  return (
    <SceneId.Provider value={sid}>
      <div ref={box} className={`gs${visible ? '' : ' gs-paused'}`} onClick={onTap} role="img" aria-label={`Your garden: stage ${stage} of 11, ${sky}`}
        data-gloom={gloom}>
        <style>{PATH_CSS}</style>
        {shader && <SkyShader uniforms={uniforms} occlusion={occlusion} running={visible && !reduced} onFail={() => setGpu(false)} />}
        {/* sky details: sun, moon, clouds, birds */}
        <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer">
          <Sky pal={pal} shader={shader} phase={phase}>
            {life > 0.55 && !reduced && <Flocks ink={pal.c.ink} />}
          </Sky>
        </svg>
        {/* scenery */}
        <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer">
          <g className="gs-camg" style={cam}>
            <Land pal={pal} />
          </g>
        </svg>
        {/* living things */}
        <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer">
          <g className="gs-camg" style={cam}>
            {mistOpacity > 0.02 && <Mist color={mix(pal.sky.bottom, '#ffffff', 0.5)} opacity={Math.min(0.8, mistOpacity)} />}
            <Grove pal={pal} monkeys={life >= 0.8 && !reduced} flip={monkeyFlip} onTap={() => setMonkeyFlip(Date.now())} />
            <FarLife pal={pal} life={vital} night={night} reduced={reduced} />
            {far && <Troupe key={far.id} event={far.event} reverse={far.reverse} pal={pal} onDone={() => setFar(null)} />}
            {walker && FAR_KINDS.includes(walker.kind) && <Walker key={walker.id} kind={walker.kind} reverse={walker.reverse} pal={pal} onDone={() => setWalker(null)} />}
            {behind.map(renderNb)}
            {weather !== 'drought' && (
              <Pond pal={pal} sunX={sun ? sun.x : null} moonX={moon ? moon.x : null} night={night} frogOK={!reduced && vital > 0.3} dragonfly={life > 0.6 && !reduced} />
            )}
            <NutSprouts pal={pal} memory={eggs} today={today} />
            {burrowAge >= 0 && <Burrow pal={pal} age={burrowAge} peeking={life > 0.5 && !reduced} sid={(n) => `${sid}-${n}`} />}
            <g transform={`translate(${PLANT_BASE[0]},${PLANT_BASE[1]})`}>
              <g className="gs-t" style={{ transform: `scale(${PLANT_SCALE[stage]})` }}>
                <g key={watering || 'still'} className={watering ? 'gs-bounce gs-tap' : 'gs-tap'} onClick={() => onEgg('plant')}>
                  <Plant stage={stage} health={health} dead={dead} pal={pal} seed={7} uid={`${sid}main`} windy={windy} />
                </g>
                {isTree && !dead && health > 0.3 && nestAge >= 0 && (
                  <g className={windy ? 'gs-sway gs-sway-windy' : 'gs-sway'}>
                    <g transform={stage >= 10 ? 'translate(22,-130) scale(1.35)' : 'translate(12,-100) scale(1.1)'}>
                      <Nest pal={pal} age={nestAge} daytime={day} sunny={weather === 'sunny'} />
                    </g>
                  </g>
                )}
                {stage > 1 && <GroundTuft pal={pal} w={isTree ? 60 : 26} seed={3} />}
              </g>
              {watering > 0 && <Watering key={watering} height={plantHeight} />}
            </g>
            {infront.map(renderNb)}
            {walker && !FAR_KINDS.includes(walker.kind) && <Walker key={walker.id} kind={walker.kind} reverse={walker.reverse} pal={pal} onDone={() => setWalker(null)} />}
            {squirrel > 0 && (
              <SquirrelAct
                key={squirrel}
                pal={pal}
                today={today}
                memory={eggs}
                onBury={(x) => updateEggs((m) => (m.nuts.some((n) => n.day === today) ? { ...m, squirrelDay: today } : { ...m, nuts: [...m.nuts, { x, day: today }].slice(-8), squirrelDay: today }))}
                onDone={() => setSquirrel(0)}
              />
            )}
            {weather === 'overcast' && day && !reduced && <Snail pal={pal} />}
            {life > 0.4 && (
              <>
                <Butterfly x={470} y={560} color={pal.shade('#f2a541')} path={1} dur={16} delay={-3} ink={pal.c.ink} />
                {life > 0.6 && <Butterfly x={800} y={590} color={pal.shade('#f5dc6a')} path={2} dur={19} delay={-9} ink={pal.c.ink} />}
                {life > 0.85 && <Butterfly x={330} y={620} color={pal.shade('#b8a2e6')} path={3} dur={22} delay={-14} ink={pal.c.ink} />}
                {life > 0.85 && <Butterfly x={640} y={520} color={pal.shade('#f08aa8')} path={2} dur={17} delay={-6} ink={pal.c.ink} />}
                {life > 0.5 && <Bee x={700} y={600} dur={7} delay={-2} ink={pal.c.ink} />}
                {life > 0.7 && <Bee x={150} y={640} dur={8.5} delay={-5} ink={pal.c.ink} />}
              </>
            )}
            {leafCount > 0 && !reduced && (
              <BlowingLeaves x={PLANT_BASE[0]} y={crownY} spread={isTree ? 120 : 50} colors={leafColors.map(pal.shade)} count={leafCount} ink={pal.c.ink} />
            )}
            {nightLife && (
              <Owl
                x={108}
                y={506}
                pal={pal}
                spin={owlSpin}
                onTap={() => {
                  setOwlSpin(Date.now())
                  playOwlNow()
                }}
              />
            )}
            {nightLife && !reduced && vital > 0.5 && <Fireflies />}
            <Critters pal={pal} life={vital} night={night} stage={stage} dead={dead} reduced={reduced} onEgg={onEgg} />
            {!reduced && <EggEffects fx={eggFx} />}
            {weather === 'drought' && !reduced && <Dust />}
            {!reduced && <Swirls count={Math.max(0, swirlCount)} ink={pal.c.ink} />}
          </g>
        </svg>
        {/* foreground grass and flowers */}
        <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer">
          <g className="gs-camg" style={cam}>
            <Front pal={pal} />
            {vital > 0.3 && <Clover found={clover} onTap={() => onEgg('clover')} />}
          </g>
        </svg>
        {/* real weather: rain, snow, wind */}
        {(wet || sky === 'windy') && !reduced && (
          <Precip rain={sky === 'rain' ? 1 : 0} snow={sky === 'snow' ? 1 : 0} wind={sky === 'windy' ? 1 : sky === 'rain' ? 0.3 : 0} night={night} running={visible} />
        )}
        {/* watercolour paper texture and night vignette */}
        <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="gs-layer gs-paper" aria-hidden>
          <Paper />
        </svg>
        <div
          className="gs-vignette"
          style={{
            opacity: Math.max(night * 0.75, weather === 'overcast' ? 0.45 : 0, gloom * 0.55),
            background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(6,10,30,.5) 100%)',
          }}
        />
      </div>
    </SceneId.Provider>
  )
}
