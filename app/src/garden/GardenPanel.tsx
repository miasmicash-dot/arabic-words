// The garden on the Home page: the scene, its status, the goal picker, stage-up celebration and replanting.
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { GARDEN } from './config'
import { markCelebrated, plantNewSeed, setMuted, startGarden, syncGarden, takeWatered, type GardenView } from './service'
import type { GrowthStage, Weather } from './types'
import { applyMood, moodOf } from './theme'
import Whisper from './Whisper'
import { useRealWeather } from './realWeather'
import { celebrate } from '../confetti'
import Icon from '../ui/Icon'
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
  sunny: 'Your garden is thriving. Lovely, steady studying.',
  'partly-cloudy': 'Doing well. A quick review keeps it growing.',
  overcast: 'Your plant misses you. A review will perk it up.',
  drought: 'A dry spell! Your plant is thirsty. A review will water it.',
}

const WEATHER_CHIPS: Record<Weather, string> = {
  sunny: 'Thriving',
  'partly-cloudy': 'Doing well',
  overcast: 'Thirsty',
  drought: 'Dry spell',
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
    <div className="gp-goal">
      <div className="gp-goal-title">{title}</div>
      {note && <p className="text-sm muted">{note}</p>}
      <div className="gp-goal-opts" role="group" aria-label="Goal in words">
        {GARDEN.goalOptions.map((g) => (
          <button
            key={g}
            type="button"
            className="gp-goal-opt"
            aria-pressed={!custom && chosen === g}
            onClick={() => {
              setCustom('')
              setChosen(g)
            }}
          >
            <b className="num">{g}</b>
            <small>words</small>
          </button>
        ))}
      </div>
      <label className="gp-goal-custom">
        <span className="muted">Or your own</span>
        <input
          inputMode="numeric"
          className="field"
          placeholder="e.g. 150"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <span className="muted">words</span>
      </label>
      <button className="btn w-full" disabled={!valid} onClick={() => valid && onPick(value!)}>
        <Icon name="sprout" size={20} />
        Plant my seed{valid ? ` · ${value} words` : ''}
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
      <div className="gp-cele-card card glass">
        <div className="gp-cele-emoji">{stage >= 9 ? '🌳' : stage >= 3 ? '🌿' : '🌱'}</div>
        <div className="eyebrow">Stage {stage} of 11</div>
        <div className="gp-cele-name">{STAGE_NAMES[stage]}!</div>
        <p className="muted">{STAGE_LINES[stage]}</p>
        <button className="btn lg w-full">Lovely!</button>
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
  const sky = useRealWeather()
  const [full, setFull] = useState(false)
  const toggleFull = () => {
    const next = !full
    setFull(next)
    // real full screen where the browser allows it (not on iPhone, where the garden still fills the screen)
    try {
      if (next && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {})
      else if (!next && document.fullscreenElement) document.exitFullscreen().catch(() => {})
    } catch { /* ignore */ }
  }
  useEffect(() => {
    const off = () => !document.fullscreenElement && setFull((f) => (f && document.fullscreenEnabled ? false : f))
    document.addEventListener('fullscreenchange', off)
    return () => document.removeEventListener('fullscreenchange', off)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('garden-full', full)
    return () => document.documentElement.classList.remove('garden-full')
  }, [full])
  useEffect(() => {
    if (celebrating) celebrate('big')
  }, [celebrating])

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

  if (view === undefined) return <div className="gp-stage"><div className="gp-skeleton" /></div>

  if (view === null) {
    return (
      <div className="card raised p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="stat-icon" style={{ margin: 0, width: 40, height: 40, borderRadius: 12 }}><Icon name="sprout" size={22} /></span>
          <div className="text-lg font-bold">Your garden</div>
        </div>
        <p className="text-sm muted" style={{ lineHeight: 1.55 }}>
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
    <div className="gp-wrap">
      <div className={`gp-stage${full ? ' gp-full' : ''}`}>
        <Suspense fallback={<div className="gp-skeleton" />}>
          <GardenScene
            stage={stage}
            health={s.health}
            dead={s.dead}
            weather={s.weather}
            sky={sky}
            timeOfDay={now.getHours() + now.getMinutes() / 60}
            trees={view.trees}
            muted={s.soundMuted}
            waterPulse={pulse}
            onTap={() => setReplay(Date.now())}
          />
        </Suspense>
        <Whisper mood={moodOf(s).mood} waiting={waiting} replay={replay} />
        <button
          className="gp-mute icon-btn"
          aria-label={s.soundMuted ? 'Turn nature sounds on' : 'Turn nature sounds off'}
          onClick={async (e) => {
            e.stopPropagation()
            await setMuted(!s.soundMuted)
            setView({ ...view, state: { ...s, soundMuted: !s.soundMuted } })
          }}
        >
          <Icon name={s.soundMuted ? 'mute' : 'volume'} size={20} />
        </button>
        <button
          className="gp-mute gp-fs icon-btn"
          aria-label={full ? 'Leave full screen' : 'Full screen'}
          onClick={(e) => {
            e.stopPropagation()
            toggleFull()
          }}
        >
          <Icon name={full ? 'close' : 'expand'} size={20} />
        </button>
      </div>

      {s.dead ? (
        <div className="card glass gp-status p-4 space-y-3">
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
              <Icon name="sprout" size={20} />
              Plant a new seed
            </button>
          )}
        </div>
      ) : (
        <div className="card glass gp-status p-4 space-y-2.5">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="gp-stage-badge num" aria-hidden>{stage}</span>
              <div className="min-w-0">
                <div className="font-semibold leading-tight truncate">{STAGE_NAMES[stage]}</div>
                <div className="text-xs muted">Stage {stage} of 11</div>
              </div>
            </div>
            <span className={`chip gp-weather gp-weather-${s.weather}`}>{WEATHER_CHIPS[s.weather]}</span>
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
          <div className="text-sm gp-line">{WEATHER_LINES[s.weather]}</div>
          {s.health < 0.6 && <div className="text-sm" style={{ color: 'var(--warn)' }}>Your plant is wilting. Review a little each day to bring it back to life.</div>}
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
                <Icon name="sprout" size={20} />
                Plant a new seed with a new goal
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
