// Garden playground: try every stage, weather, time, sky effect and easter egg.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import GardenScene from '../garden/scene/GardenScene'
import { STAGE_NAMES } from '../garden/GardenPanel'
import { clearEggs, loadEggs } from '../garden/scene/eggMemory'
import type { ForestTree, GardenDevOptions, GardenSceneProps, GrowthStage, Weather } from '../garden/types'

const WEATHERS: Weather[] = ['sunny', 'partly-cloudy', 'overcast', 'drought']
const ANIMALS = ['fox', 'rabbit', 'deer', 'squirrel', 'hedgehog'] as const
const EGGS_KEY = 'garden-eggs-playground'
const TIMES: [string, number][] = [
  ['Dawn', 6.2],
  ['Morning', 8.5],
  ['Noon', 12],
  ['Golden', 17.6],
  ['Sunset', 18.7],
  ['Dusk', 19.6],
  ['Night', 22.5],
  ['Late night', 2],
]
const demoForest: ForestTree[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
  id: `d${i}`,
  x: i % 2 ? 0.06 + i * 0.04 : 0.74 + i * 0.035,
  growth: [1, 0.9, 0.6, 0.35, 0.2, 0.5, 0.1][i],
  depth: [0.2, 0.35, 0.5, 0.7, 0.9, 0.1, 0.6][i],
}))

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const ageOf = (from: string, to: string) => (from ? Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) : null)
const fmt = (t: number) => `${Math.floor(t)}:${String(Math.round((t % 1) * 60) % 60).padStart(2, '0')}`

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card p-4 space-y-3 text-sm">
      <div className="font-semibold">{title}</div>
      {children}
    </div>
  )
}

function Chips<T extends string | number>({ items, value, onPick, label }: { items: readonly T[]; value?: T; onPick: (v: T) => void; label?: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((v) => (
        <button key={String(v)} className={`btn ${value === v ? '' : 'ghost'}`} style={{ padding: '8px 12px' }} onClick={() => onPick(v)}>
          {label ? label(v) : String(v)}
        </button>
      ))}
    </div>
  )
}

export default function GardenPreview() {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '')
  const [stage, setStage] = useState<GrowthStage>((Number(q.get('stage')) || 10) as GrowthStage)
  const [health, setHealth] = useState(Number(q.get('health') ?? 1))
  const [dead, setDead] = useState(q.get('dead') === '1')
  const [weather, setWeather] = useState<Weather>((q.get('weather') as Weather) || 'sunny')
  const [time, setTime] = useState(Number(q.get('time') ?? new Date().getHours() + new Date().getMinutes() / 60))
  const [speed, setSpeed] = useState(0)
  const [muted, setMuted] = useState(true)
  const [pulse, setPulse] = useState(0)
  const [forest, setForest] = useState(Number(q.get('forest') ?? 0))
  const [aurora, setAurora] = useState<'auto' | 'on' | 'off'>((q.get('aurora') as 'on') || 'auto')
  const [phase, setPhase] = useState<number | null>(q.get('moon') ? Number(q.get('moon')) : null)
  const [shader, setShader] = useState(q.get('shader') !== '0')
  const [dayOffset, setDayOffset] = useState(0)
  const [walker, setWalker] = useState<GardenDevOptions['walker']>()
  const [squirrel, setSquirrel] = useState(0)
  const [eggsVersion, setEggsVersion] = useState(0)
  const [big, setBig] = useState(q.get('big') === '1')
  const [cover, setCover] = useState(q.get('cover') === '1')

  // time-lapse: speed = game hours per real second
  useEffect(() => {
    if (!speed) return
    const t = setInterval(() => setTime((h) => (h + speed / 10) % 24), 100)
    return () => clearInterval(t)
  }, [speed])

  const today = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + dayOffset)
    return keyOf(d)
  }, [dayOffset])
  const eggs = useMemo(() => loadEggs(EGGS_KEY), [eggsVersion, today, squirrel]) // eslint-disable-line react-hooks/exhaustive-deps
  // refresh the story readout once the squirrel has had time to bury its nut
  useEffect(() => {
    if (!squirrel) return
    const t = setTimeout(() => setEggsVersion((v) => v + 1), 16000)
    return () => clearTimeout(t)
  }, [squirrel])

  const trees = useMemo<ForestTree[]>(() => {
    const out: ForestTree[] = []
    for (let i = 0; i < forest; i++) {
      const left = i % 2 === 1
      const k = ((i * 7919) % 100) / 100
      out.push({ id: `p${i}`, x: left ? 0.05 + k * 0.28 : 0.72 + k * 0.25, growth: Math.min(1, 0.1 + i * 0.12), depth: ((i * 37) % 10) / 10 })
    }
    return out
  }, [forest])

  const dev: GardenDevOptions = { aurora, shader, moonPhase: phase ?? undefined, today, eggsKey: EGGS_KEY, walker, squirrel, eggsVersion, occlusion: cover ? 1 : undefined }

  const gallery = q.get('gallery')
  if (gallery) {
    type SP = Partial<GardenSceneProps>
    const items: { label: string; p: SP }[] =
      gallery === 'stages'
        ? ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as GrowthStage[]).map((s) => ({ label: `stage ${s}`, p: { stage: s, trees: s === 11 ? demoForest : [] } }))
        : gallery === 'weather'
          ? WEATHERS.flatMap((w) => [11, 21.5].map((t) => ({ label: `${w} ${t}h`, p: { weather: w, timeOfDay: t } as SP })))
          : gallery === 'time'
            ? TIMES.map(([n, t]) => ({ label: n, p: { timeOfDay: t } as SP }))
            : [1, 0.6, 0.45, 0.3, 0.15, 0.02].map((h) => ({ label: `health ${h}`, p: { health: h } as SP })).concat([{ label: 'dead', p: { dead: true, health: 0 } }])
    return (
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label}>
            <GardenScene stage={stage} health={health} dead={dead} weather={weather} timeOfDay={time} trees={trees} muted waterPulse={0} dev={dev} {...it.p} />
            <div className="text-xs muted">{it.label}</div>
          </div>
        ))}
      </div>
    )
  }

  const scene = (
    <GardenScene stage={stage} health={health} dead={dead} weather={weather} timeOfDay={time} trees={stage === 11 && !forest ? demoForest : trees} muted={muted} waterPulse={pulse} dev={dev} />
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Garden playground ✨</h1>
        <Link to="/settings" className="text-sm muted">
          ← Settings
        </Link>
      </div>
      {big ? (
        <div style={{ overflowX: 'auto', marginInline: -16 }}>
          <div style={{ width: 1500 }}>{scene}</div>
        </div>
      ) : (
        <div className="sticky top-0 z-10" style={{ background: 'var(--bg)', paddingBottom: 4 }}>
          {scene}
        </div>
      )}
      <p className="text-xs muted">Tap the frog in the pond, or the owl at night. Sound starts after your first tap when it is on.</p>

      <Section title={`Growth · stage ${stage}: ${STAGE_NAMES[stage]}`}>
        <input type="range" min={1} max={11} value={stage} onChange={(e) => setStage(+e.target.value as GrowthStage)} className="w-full" />
        <label className="block">
          Health {Math.round(health * 100)}%
          <input type="range" min={0} max={1} step={0.01} value={health} onChange={(e) => setHealth(+e.target.value)} className="w-full" />
        </label>
        <label className="block">
          Forest neighbours {forest}
          <input type="range" min={0} max={12} value={forest} onChange={(e) => setForest(+e.target.value)} className="w-full" />
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={dead} onChange={(e) => setDead(e.target.checked)} /> Withered
          </label>
          <button className="btn" onClick={() => setPulse((p) => p + 1)}>💧 Water</button>
        </div>
      </Section>

      <Section title="Weather">
        <Chips items={WEATHERS} value={weather} onPick={setWeather} />
      </Section>

      <Section title={`Time of day · ${fmt(time)}`}>
        <input type="range" min={0} max={23.99} step={0.05} value={time} onChange={(e) => setTime(+e.target.value)} className="w-full" />
        <Chips items={TIMES.map(([n]) => n)} onPick={(n) => setTime(TIMES.find(([m]) => m === n)![1])} />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="muted">Time-lapse:</span>
          <Chips items={[0, 0.5, 2, 6]} value={speed} onPick={setSpeed} label={(v) => (v === 0 ? '⏸ Stop' : `▶ ${v}h/s`)} />
        </div>
      </Section>

      <Section title="Night sky">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="muted">Aurora:</span>
          <Chips items={['auto', 'on', 'off'] as const} value={aurora} onPick={setAurora} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={phase === null} onChange={(e) => setPhase(e.target.checked ? null : 0.5)} /> Real moon phase for today
        </label>
        {phase !== null && (
          <label className="block">
            Moon phase {phase < 0.03 || phase > 0.97 ? '(new)' : Math.abs(phase - 0.5) < 0.03 ? '(full)' : phase < 0.5 ? '(waxing)' : '(waning)'}
            <input type="range" min={0} max={1} step={0.01} value={phase} onChange={(e) => setPhase(+e.target.value)} className="w-full" />
          </label>
        )}
        <p className="text-xs muted">Shooting stars appear every half minute or so on clear nights.</p>
      </Section>

      <Section title="Wildlife">
        <Chips items={ANIMALS} onPick={(k) => setWalker({ kind: k, id: Date.now() })} label={(k) => `${{ fox: '🦊', rabbit: '🐇', deer: '🦌', squirrel: '🐿️', hedgehog: '🦔' }[k]} ${k}`} />
        <p className="text-xs muted">Animals walk by on their own every 20-40 s on sunny days.</p>
      </Section>

      <Section title={`Day-to-day stories · ${dayOffset === 0 ? 'today' : `day +${dayOffset}`} (${today})`}>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => setSquirrel(Date.now())}>🐿️ Squirrel visit now</button>
          <button className="btn ghost" onClick={() => setDayOffset((d) => d + 1)}>Next day →</button>
          <button className="btn ghost" onClick={() => setDayOffset((d) => d + 7)}>+1 week</button>
          <button
            className="btn ghost"
            onClick={() => {
              clearEggs(EGGS_KEY)
              setDayOffset(0)
              setEggsVersion((v) => v + 1)
            }}
          >
            Reset stories
          </button>
        </div>
        <ul className="text-xs muted space-y-1">
          <li>🌰 Nuts buried and forgotten: {eggs.nuts.length}. After 4 days they sprout, after 10 they become little oaks.</li>
          <li>
            🪺 Nest: {ageOf(eggs.nestStart, today) ?? 'starts when the plant becomes a tree (stage 9)'}
            {eggs.nestStart ? ' days (twigs → nest → eggs on day 5 → chicks on day 11 → fledgling on day 19)' : ''}
          </li>
          <li>
            🕳️ Rabbit burrow: {ageOf(eggs.burrowStart, today) ?? 'dug on the first sunny day'}
            {eggs.burrowStart ? ' days (a bunny peeks out from day 2, two from day 9)' : ''}
          </li>
          <li>🐌 A snail crosses the path on grey days. 🐸 Tap the frog. 🦉 Tap the owl at night.</li>
        </ul>
      </Section>

      <Section title="Display">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={shader} onChange={(e) => setShader(e.target.checked)} /> GPU sky (glow, light shafts, stars, aurora)
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={cover} onChange={(e) => setCover(e.target.checked)} /> Pretend a cloud covers the sun (light shafts)
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={big} onChange={(e) => setBig(e.target.checked)} /> Big view
          </label>
          <button className="btn ghost" onClick={() => setMuted((m) => !m)}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {['stages', 'weather', 'time', 'health'].map((g) => (
            <a key={g} className="btn ghost" style={{ padding: '6px 10px' }} href={`#/garden-preview?gallery=${g}&stage=${stage}`} onClick={() => setTimeout(() => location.reload(), 0)}>
              Gallery: {g}
            </a>
          ))}
        </div>
      </Section>
    </div>
  )
}
