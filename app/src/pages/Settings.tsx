import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, db, type Settings as S } from '../db'
import { disableReminders, enableReminders, isIosNotInstalled, pushSupported } from '../push'
import { GoalPicker } from '../garden/GardenPanel'
import { loadGarden, setGoal, setMuted, startGarden, syncGarden } from '../garden/service'
import type { GardenState } from '../garden/state'

export default function Settings() {
  const [s, setS] = useState<S>(DEFAULT_SETTINGS)
  const [msg, setMsg] = useState('')
  const [garden, setGarden] = useState<GardenState | null>(null)
  const [editGoal, setEditGoal] = useState(false)

  useEffect(() => {
    db.settings.get('main').then((x) => x && setS(x))
    syncGarden().then(() => loadGarden()).then(setGarden)
  }, [])

  async function save(patch: Partial<S>) {
    const next = { ...s, ...patch }
    setS(next)
    await db.settings.put(next)
  }

  async function toggleReminders() {
    setMsg('')
    try {
      if (s.remindersEnabled) {
        await disableReminders()
        await save({ remindersEnabled: false })
      } else {
        await enableReminders(s.reminderTime, s.timezone)
        await save({ remindersEnabled: true })
        setMsg('Reminders on.')
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not enable reminders.')
    }
  }

  async function resetAll() {
    if (!confirm('Delete all progress and start over?')) return
    await db.cards.clear()
    await db.reviews.clear()
    await db.garden.clear()
    location.reload()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card p-4 space-y-2">
        <label className="font-semibold text-sm">New words per day: {s.dailyNewLimit}</label>
        <input type="range" min={1} max={30} value={s.dailyNewLimit} onChange={(e) => save({ dailyNewLimit: +e.target.value })} className="w-full" />
      </div>

      <div className="card p-4 space-y-2">
        <label className="font-semibold text-sm">Target recall: {Math.round(s.desiredRetention * 100)}%</label>
        <input type="range" min={0.7} max={0.97} step={0.01} value={s.desiredRetention} onChange={(e) => save({ desiredRetention: +e.target.value })} className="w-full" />
        <p className="text-xs muted">Higher means more reviews and fewer forgotten words. 90% is a good balance.</p>
      </div>

      <div className="card p-4 space-y-2">
        <div className="font-semibold text-sm">Card directions</div>
        {(['en-ar', 'ar-en'] as const).map((d) => (
          <label key={d} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.directions.includes(d)}
              onChange={(e) => {
                const dirs = e.target.checked ? [...s.directions, d] : s.directions.filter((x) => x !== d)
                if (dirs.length) save({ directions: dirs })
              }}
            />
            {d === 'en-ar' ? 'English → Arabic' : 'Arabic → English'}
          </label>
        ))}
        <p className="text-xs muted">Re-open the app after changing this so new cards are created.</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold text-sm">Daily reminder</div>
        {isIosNotInstalled() && (
          <p className="text-sm" style={{ color: '#d97706' }}>
            On iPhone: tap Share in Safari → "Add to Home Screen", then open the app from your Home Screen to turn reminders on.
          </p>
        )}
        <input type="time" value={s.reminderTime} onChange={(e) => save({ reminderTime: e.target.value })} className="card px-3 py-2" />
        <button className="btn w-full" disabled={!pushSupported() && !s.remindersEnabled} onClick={toggleReminders}>
          {s.remindersEnabled ? 'Turn reminders off' : 'Turn reminders on'}
        </button>
        {msg && <p className="text-sm muted">{msg}</p>}
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold text-sm">Garden</div>
        {garden ? (
          <>
            <div className="text-sm">
              Goal for this seed: <b>{garden.goalWords} words</b>
              {garden.finishedTrees.length > 0 && <span className="muted"> · {garden.finishedTrees.length} finished tree{garden.finishedTrees.length > 1 ? 's' : ''}</span>}
            </div>
            {editGoal ? (
              <GoalPicker
                title="New goal"
                note="Your plant keeps the stage it has already reached."
                initial={garden.goalWords}
                onPick={async (g) => {
                  await setGoal(g)
                  setGarden({ ...garden, goalWords: g })
                  setEditGoal(false)
                }}
              />
            ) : (
              <button className="btn ghost w-full" onClick={() => setEditGoal(true)}>Change goal</button>
            )}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!garden.soundMuted}
                onChange={async (e) => {
                  await setMuted(!e.target.checked)
                  setGarden({ ...garden, soundMuted: !e.target.checked })
                }}
              />
              Nature sounds (birds, wind, crickets)
            </label>
          </>
        ) : (
          <GoalPicker title="Pick a goal to plant your first seed" onPick={async (g) => { await startGarden(g); setGarden(await loadGarden()) }} />
        )}
      </div>

      <button className="btn ghost w-full" onClick={resetAll}>Reset all progress</button>
    </div>
  )
}
