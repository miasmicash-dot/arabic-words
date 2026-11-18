// The garden on the Home page: the scene, its status, the goal picker, stage-up celebration and replanting.
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { GARDEN } from './config'
import { markCelebrated, plantNewSeed, setMuted, startGarden, syncGarden, takeWatered, type GardenView } from './service'
import type { GrowthStage, Weather } from './types'
import { applyMood, moodOf } from './theme'
import Whisper from './Whisper'
import './panel.css'

const GardenScene = lazy(() => import('./scene/GardenScene'))

export const STAGE_NAMES: Record<GrowthStage, string> = {
  1: 'Seed planted',
  2: 'Germinating',
  3: 'Little stem',
  4: 'First branch',
  5: 'First leaf',
  6: 'Branching out',
  7: 'Leafing up',
  8: 'Full plant',
  9: 'Young tree',
  10: 'Grown tree',
  11: 'Forest',
}

const STAGE_LINES: Record<GrowthStage, string> = {
  1: 'A tiny seed is tucked into the soil.',
  2: 'Your seed has cracked open and a sprout is peeking out!',
  3: 'A little stem is standing up on its own.',
  4: 'Your plant grew its very first branch.',
  5: 'The first real leaf has opened.',
  6: 'New branches are reaching out in every direction.',
  7: 'Leaves everywhere! Your plant is filling out.',
  8: 'A full, healthy plant, and it is blossoming.',
  9: 'It has a woody trunk now: a young tree!',
  10: 'A proper tree. You reached your goal!',
  11: 'New trees are sprouting around yours. A forest is growing!',
}

const WEATHER_LINES: Record<Weather, string> = {
  sunny: 'Sunny skies. Your garden is thriving.',
  'partly-cloudy': 'A few clouds. A quick review brings the sun back.',
  overcast: 'Grey skies. Your plant misses you.',
  drought: 'Drought! Your plant is thirsty. A review will water it.',
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function GoalPicker({ initial, onPick, title, note }: { initial?: number; onPick: (goal: number) => void; title: string; note?: string }) {
  const [custom, setCustom] = useState('')
  const [chosen, setChosen] = useState<number | null>(initial ?? null)
  const customNum = Math.round(Number(custom))
  const value = custom ? customNum : chosen
  const valid = !!value && value >= 10 && value <= 2000
  return (
    <div className="space-y-3">
      <div className="font-semibold">{title}</div>
      {note && <p className="text-sm muted">{note}</p>}
      <div className="grid grid-cols-4 gap-2">
        {GARDEN.goalOptions.map((g) => (
          <button
            key={g}
            className={`btn ${!custom && chosen === g ? '' : 'ghost'}`}
            onClick={() => {
              setCustom('')
              setChosen(g)
            }}
          >
            {g}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="muted">Or your own:</span>
        <input
          inputMode="numeric"
          className="card px-3 py-2 w-24"
          placeholder="e.g. 150"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <span className="muted">words</span>
      </label>
      <button className="btn w-full" disabled={!valid} onClick={() => valid && onPick(value!)}>
        🌱 Plant my seed{valid ? ` (${value} words)` : ''}
      </button>
    </div>
  )
}

function Celebration({ stage, onClose }: { stage: GrowthStage; onClose: () => void }) {
  const bits = Array.from({ length: 26 }, (_, i) => i)
  return (
    <div className="gp-cele" onClick={onClose} role="dialog" aria-label="Your plant grew">
      {bits.map((i) => (
        <span
          key={i}
          className={`gp-bit gp-bit-${i % 3}`}
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.18}s`, animationDuration: `${2.6 + (i % 5) * 0.4}s` }}
        >
          {['🍃', '🌸', '✨', '🌿', '🌼'][i % 5]}
        </span>
      ))}
      <div className="gp-cele-card card">
        <div className="text-5xl">{stage >= 9 ? '🌳' : stage >= 3 ? '🌿' : '🌱'}</div>
        <div className="text-sm muted">Stage {stage} of 11</div>
        <div className="text-2xl font-bold">{STAGE_NAMES[stage]}!</div>
        <p>{STAGE_LINES[stage]}</p>
        <button className="btn w-full">Lovely!</button>
      </div>
    </div>
  )
}

/** `waiting` = words to review and learn today (null while counting), shown as handwriting over the garden. */
export default function GardenPanel({ waiting = null }: { waiting?: number | null }) {
  const [view, setView] = useState<GardenView | null | undefined>(undefined)
  const [replay, setReplay] = useState(0)
  const [pulse, setPulse] = useState(0)
  const [replanting, setReplanting] = useState(false)
  const [celebrating, setCelebrating] = useState<GrowthStage | null>(null)
  const now = useClock()

  const refresh = useCallback(async () => {
    const v = await syncGarden(new Date())
    setView(v)
    applyMood(moodOf(v?.state ?? null))
    if (v?.celebrate) setCelebrating(v.celebrate)
  }, [])

  useEffect(() => {
    refresh()
    // a review session just ended: water the plant (after the scene has appeared)
    if (takeWatered()) {
      const t = setTimeout(() => setPulse((p) => p + 1), 900)
      return () => clearTimeout(t)
    }
  }, [refresh])

  if (view === undefined) return <div className="gp-skeleton" />

  if (view === null) {
    return (
      <div className="card p-4 space-y-3">
        <div className="text-lg font-bold">Your garden 🌱</div>
        <p className="text-sm muted">
          Every review waters a seed. As you learn words it grows into a plant, then a tree, then a forest. Pick how many words you want to learn for your
          first tree.
        </p>
        <GoalPicker title="How many words is your goal?" onPick={async (g) => setView(await startGarden(g))} />
      </div>
    )
  }

  const s = view.state
  const stage = view.stage
  const toNext = (() => {
    if (stage >= 10) return null
    const starts = [0, ...GARDEN.stageStarts, 1]
    const lo = starts[stage - 1] * s.goalWords
    const hi = starts[stage] * s.goalWords
    return { pct: Math.max(0, Math.min(1, (view.learnedSinceSeed - lo) / Math.max(1, hi - lo))), words: Math.max(1, Math.ceil(hi - view.learnedSinceSeed)) }
  })()

  return (
    <div className="space-y-3">
      <div className="relative">
        <Suspense fallback={<div className="gp-skeleton" />}>
          <GardenScene
            stage={stage}
            health={s.health}
            dead={s.dead}
            weather={s.weather}
            timeOfDay={now.getHours() + now.getMinutes() / 60}
            trees={view.trees}
            muted={s.soundMuted}
            waterPulse={pulse}
            onTap={() => setReplay(Date.now())}
          />
        </Suspense>
        <Whisper mood={moodOf(s).mood} waiting={waiting} replay={replay} />
        <button
          className="gp-mute"
          aria-label={s.soundMuted ? 'Turn nature sounds on' : 'Turn nature sounds off'}
          onClick={async (e) => {
            e.stopPropagation()
            await setMuted(!s.soundMuted)
            setView({ ...view, state: { ...s, soundMuted: !s.soundMuted } })
          }}
        >
          {s.soundMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {s.dead ? (
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Your plant has withered 🥀</div>
          <p className="text-sm muted">
            It went without water for too long. Your {view.learnedTotal} learned words are safe, and any trees you finished stay in your forest. Plant a new
            seed and start again!
          </p>
          {replanting ? (
            <GoalPicker
              title="Goal for the new seed"
              initial={s.goalWords}
              onPick={async (g) => {
                setReplanting(false)
                const v = await plantNewSeed(g)
                setView(v)
                applyMood(moodOf(v?.state ?? null))
              }}
            />
          ) : (
            <button className="btn w-full" onClick={() => setReplanting(true)}>
              🌱 Plant a new seed
            </button>
          )}
        </div>
      ) : (
        <div className="card p-4 space-y-2">
          <div className="flex justify-between items-baseline gap-2">
            <div className="font-semibold">{STAGE_NAMES[stage]}</div>
            <div className="text-xs muted">Stage {stage} of 11</div>
          </div>
          {toNext ? (
            <>
              <div className="gp-bar">
                <div style={{ width: `${Math.round(toNext.pct * 100)}%` }} />
              </div>
              <div className="text-xs muted">
                {view.learnedSinceSeed} of {s.goalWords} words learned · {toNext.words} more to the next stage
              </div>
            </>
          ) : (
            <div className="text-xs muted">
              {view.learnedSinceSeed} words learned. Goal of {s.goalWords} reached! Keep going to grow a forest.
            </div>
          )}
          <div className="text-sm">{WEATHER_LINES[s.weather]}</div>
          {s.health < 0.6 && <div className="text-sm" style={{ color: '#b45309' }}>Your plant is wilting. Review a little each day to bring it back to life.</div>}
          {view.goalReached &&
            (replanting ? (
              <GoalPicker
                title="Plant a new seed"
                note="Your grown tree stays in your forest. Pick a goal for the next one."
                initial={s.goalWords}
                onPick={async (g) => {
                  setReplanting(false)
                  setView(await plantNewSeed(g))
                }}
              />
            ) : (
              <button className="btn ghost w-full" onClick={() => setReplanting(true)}>
                🌱 Plant a new seed with a new goal
              </button>
            ))}
        </div>
      )}

      {celebrating && (
        <Celebration
          stage={celebrating}
          onClose={async () => {
            await markCelebrated(celebrating)
            setCelebrating(null)
          }}
        />
      )}
    </div>
  )
}
