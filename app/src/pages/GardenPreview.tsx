// Developer preview of the garden scene with controls for every state.
import { useMemo, useState } from 'react'
import GardenScene from '../garden/scene/GardenScene'
import type { ForestTree, GrowthStage, Weather } from '../garden/types'

const WEATHERS: Weather[] = ['sunny', 'partly-cloudy', 'overcast', 'drought']
const demoForest: ForestTree[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
  id: `d${i}`,
  x: i % 2 ? 0.06 + i * 0.04 : 0.74 + i * 0.035,
  growth: [1, 0.9, 0.6, 0.35, 0.2, 0.5, 0.1][i],
  depth: [0.2, 0.35, 0.5, 0.7, 0.9, 0.1, 0.6][i],
}))

export default function GardenPreview() {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '')
  const [stage, setStage] = useState<GrowthStage>((Number(q.get('stage')) || 10) as GrowthStage)
  const [health, setHealth] = useState(Number(q.get('health') ?? 1))
  const [dead, setDead] = useState(q.get('dead') === '1')
  const [weather, setWeather] = useState<Weather>((q.get('weather') as Weather) || 'sunny')
  const [time, setTime] = useState(Number(q.get('time') ?? 11))
  const [muted, setMuted] = useState(true)
  const [pulse, setPulse] = useState(0)
  const [forest, setForest] = useState(Number(q.get('forest') ?? 0))

  const trees = useMemo<ForestTree[]>(() => {
    const out: ForestTree[] = []
    for (let i = 0; i < forest; i++) {
      const left = i % 2 === 1
      const k = ((i * 7919) % 100) / 100
      out.push({ id: `p${i}`, x: left ? 0.05 + k * 0.28 : 0.72 + k * 0.25, growth: Math.min(1, 0.1 + i * 0.12), depth: ((i * 37) % 10) / 10 })
    }
    return out
  }, [forest])

  const gallery = q.get('gallery')
  if (gallery) {
    const items: { label: string; p: Partial<React.ComponentProps<typeof GardenScene>> }[] =
      gallery === 'stages'
        ? ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as GrowthStage[]).map((s) => ({ label: `stage ${s}`, p: { stage: s, trees: s === 11 ? trees.length ? trees : demoForest : [] } }))
        : gallery === 'weather'
          ? WEATHERS.flatMap((w) => [11, 21.5].map((t) => ({ label: `${w} ${t}h`, p: { weather: w, timeOfDay: t } })))
          : gallery === 'time'
            ? [5.5, 6.3, 8, 12, 17.5, 18.6, 19.5, 23].map((t) => ({ label: `${t}h`, p: { timeOfDay: t } }))
            : [1, 0.6, 0.45, 0.3, 0.15, 0.02].flatMap((h) => [{ label: `health ${h}`, p: { health: h } as Partial<React.ComponentProps<typeof GardenScene>> }]).concat([{ label: 'dead', p: { dead: true, health: 0 } }])
    return (
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label}>
            <GardenScene stage={stage} health={health} dead={dead} weather={weather} timeOfDay={time} trees={trees} muted waterPulse={0} {...it.p} />
            <div className="text-xs muted">{it.label}</div>
          </div>
        ))}
      </div>
    )
  }

  const hh = Math.floor(time)
  const mm = String(Math.round((time - hh) * 60)).padStart(2, '0')
  return (
    <div className="space-y-3">
      <GardenScene stage={stage} health={health} dead={dead} weather={weather} timeOfDay={time} trees={trees} muted={muted} waterPulse={pulse} />
      <div className="card p-4 space-y-3 text-sm">
        <label className="block">
          Stage {stage}
          <input type="range" min={1} max={11} value={stage} onChange={(e) => setStage(+e.target.value as GrowthStage)} className="w-full" />
        </label>
        <label className="block">
          Health {health.toFixed(2)}
          <input type="range" min={0} max={1} step={0.01} value={health} onChange={(e) => setHealth(+e.target.value)} className="w-full" />
        </label>
        <label className="block">
          Time {hh}:{mm}
          <input type="range" min={0} max={23.99} step={0.05} value={time} onChange={(e) => setTime(+e.target.value)} className="w-full" />
        </label>
        <label className="block">
          Forest neighbours {forest}
          <input type="range" min={0} max={12} value={forest} onChange={(e) => setForest(+e.target.value)} className="w-full" />
        </label>
        <div className="flex flex-wrap gap-2">
          {WEATHERS.map((w) => (
            <button key={w} className={`btn ${weather === w ? '' : 'ghost'}`} onClick={() => setWeather(w)}>
              {w}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={dead} onChange={(e) => setDead(e.target.checked)} /> dead
          </label>
          <button className="btn ghost" onClick={() => setMuted((m) => !m)}>{muted ? 'Sound off' : 'Sound on'}</button>
          <button className="btn" onClick={() => setPulse((p) => p + 1)}>Water</button>
        </div>
      </div>
    </div>
  )
}
