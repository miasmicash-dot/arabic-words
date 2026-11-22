import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_SETTINGS, db, type Settings as S } from '../db'
import { disableReminders, enableReminders, isIosNotInstalled, pushSupported } from '../push'
import { GoalPicker } from '../garden/GardenPanel'
import { loadGarden, setGoal, setMuted, startGarden, syncGarden } from '../garden/service'
import type { GardenState } from '../garden/state'
import { getPlayerName, setPlayerName } from '../intro/player'
import { disableRealWeather, enableRealWeather, weatherAllowed } from '../garden/realWeather'
import Icon, { type IconName } from '../ui/Icon'

const pct = (v: number, min: number, max: number) => `${((v - min) / (max - min)) * 100}%`

export default function Settings() {
  const [s, setS] = useState<S>(DEFAULT_SETTINGS)
  const [msg, setMsg] = useState('')
  const [garden, setGarden] = useState<GardenState | null>(null)
  const [name, setName] = useState(getPlayerName)
  const [editGoal, setEditGoal] = useState(false)
  const [wx, setWx] = useState(weatherAllowed)
  const [wxMsg, setWxMsg] = useState('')

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

  const recall = Math.round(s.desiredRetention * 100)

  return (
    <div className="space-y-6">
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Make the app fit your day.</p>
        </div>
      </header>

      <Section title="Study">
        <div className="row block-row">
          <div className="flex items-center gap-3">
            <RowIcon icon="sparkle" />
            <div className="row-main">
              <div className="row-title">New words per day</div>
            </div>
            <div className="stepper">
              <button type="button" aria-label="Fewer" disabled={s.dailyNewLimit <= 1} onClick={() => save({ dailyNewLimit: Math.max(1, s.dailyNewLimit - 1) })}>−</button>
              <b className="num">{s.dailyNewLimit}</b>
              <button type="button" aria-label="More" disabled={s.dailyNewLimit >= 30} onClick={() => save({ dailyNewLimit: Math.min(30, s.dailyNewLimit + 1) })}>+</button>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={s.dailyNewLimit}
            aria-label="New words per day"
            onChange={(e) => save({ dailyNewLimit: +e.target.value })}
            className="range"
            style={{ ['--p' as string]: pct(s.dailyNewLimit, 1, 30) }}
          />
        </div>
        <div className="row block-row">
          <div className="flex items-center gap-3">
            <RowIcon icon="target" color="var(--sky)" />
            <div className="row-main">
              <div className="row-title">Target recall</div>
            </div>
            <div className="row-value"><b style={{ color: 'var(--ink)' }}>{recall}%</b></div>
          </div>
          <input
            type="range"
            min={0.7}
            max={0.97}
            step={0.01}
            value={s.desiredRetention}
            aria-label="Target recall"
            onChange={(e) => save({ desiredRetention: +e.target.value })}
            className="range"
            style={{ ['--p' as string]: pct(s.desiredRetention, 0.7, 0.97) }}
          />
          <p className="row-sub">Higher means more reviews and fewer forgotten words. 90% is a good balance.</p>
        </div>
        {(['en-ar', 'ar-en'] as const).map((d) => (
          <label key={d} className="row">
            <RowIcon icon="swap" color="var(--warm)" />
            <div className="row-main">
              <div className="row-title">{d === 'en-ar' ? 'English → Arabic' : 'Arabic → English'}</div>
              <div className="row-sub">{d === 'en-ar' ? 'See English, recall the Arabic' : 'See Arabic, recall the English'}</div>
            </div>
            <input
              type="checkbox"
              className="switch"
              checked={s.directions.includes(d)}
              onChange={(e) => {
                const dirs = e.target.checked ? [...s.directions, d] : s.directions.filter((x) => x !== d)
                if (dirs.length) save({ directions: dirs })
              }}
            />
          </label>
        ))}
      </Section>
      <p className="section-note">Re-open the app after changing card directions so new cards are created.</p>

      <Section title="Daily reminder">
        {isIosNotInstalled() && (
          <div className="row">
            <RowIcon icon="info" color="var(--warm)" />
            <p className="row-sub" style={{ margin: 0, color: 'var(--ink-2)' }}>
              On iPhone: tap Share in Safari → “Add to Home Screen”, then open the app from your Home Screen to turn reminders on.
            </p>
          </div>
        )}
        <label className="row">
          <RowIcon icon="clock" color="var(--sky)" />
          <div className="row-main"><div className="row-title">Time</div></div>
          <input type="time" value={s.reminderTime} onChange={(e) => save({ reminderTime: e.target.value })} className="field time-field" />
        </label>
        <label className="row">
          <RowIcon icon="bell" />
          <div className="row-main">
            <div className="row-title">Remind me to review</div>
            {msg && <div className="row-sub">{msg}</div>}
          </div>
          <input type="checkbox" className="switch" checked={s.remindersEnabled} disabled={!pushSupported() && !s.remindersEnabled} onChange={toggleReminders} />
        </label>
      </Section>

      <Section title="Garden">
        <label className="row">
          <RowIcon icon="user" color="var(--warm)" />
          <div className="row-main"><div className="row-title">Your name</div></div>
          <input
            className="field name-field"
            maxLength={30}
            value={name}
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim()) {
                setPlayerName(name)
                window.dispatchEvent(new Event('player-name'))
              }
            }}
          />
        </label>
        {garden ? (
          <>
            <div className="row block-row">
              <div className="flex items-center gap-3">
                <RowIcon icon="sprout" />
                <div className="row-main">
                  <div className="row-title">Goal for this seed</div>
                  {garden.finishedTrees.length > 0 && (
                    <div className="row-sub">{garden.finishedTrees.length} finished tree{garden.finishedTrees.length > 1 ? 's' : ''} in your forest</div>
                  )}
                </div>
                {!editGoal && (
                  <button className="btn soft sm" onClick={() => setEditGoal(true)}>
                    {garden.goalWords} words
                    <Icon name="chevronRight" size={16} strokeWidth={2.2} />
                  </button>
                )}
              </div>
              {editGoal && (
                <div className="pt-2">
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
                  <button className="btn ghost w-full mt-2" onClick={() => setEditGoal(false)}>Cancel</button>
                </div>
              )}
            </div>
            <label className="row">
              <RowIcon icon="volume" color="var(--sky)" />
              <div className="row-main">
                <div className="row-title">Nature sounds</div>
                <div className="row-sub">Birds, wind, rain and the stream</div>
              </div>
              <input
                type="checkbox"
                className="switch"
                checked={!garden.soundMuted}
                onChange={async (e) => {
                  await setMuted(!e.target.checked)
                  setGarden({ ...garden, soundMuted: !e.target.checked })
                }}
              />
            </label>
          </>
        ) : (
          <div className="row block-row">
            <GoalPicker title="Pick a goal to plant your first seed" onPick={async (g) => { await startGarden(g); setGarden(await loadGarden()) }} />
          </div>
        )}
        <label className="row">
          <RowIcon icon="cloud" color="#7c8fa6" />
          <div className="row-main">
            <div className="row-title">Real weather</div>
            <div className="row-sub">Show my local rain, snow and wind. Only for looks: your plant's health comes from studying alone.</div>
            {wxMsg && <div className="row-sub" style={{ color: 'var(--warn)' }}>{wxMsg}</div>}
          </div>
          <input
            type="checkbox"
            className="switch"
            checked={wx}
            onChange={async (e) => {
              setWxMsg('')
              if (e.target.checked) {
                const ok = await enableRealWeather()
                setWx(ok)
                if (!ok) setWxMsg('Location was not allowed. You can allow it in your phone settings.')
              } else {
                disableRealWeather()
                setWx(false)
              }
            }}
          />
        </label>
      </Section>

      <Section title="Help">
        <button className="row" onClick={() => window.dispatchEvent(new Event('show-tutorial'))}>
          <RowIcon icon="help" color="var(--sky)" />
          <div className="row-main"><div className="row-title">How the app works</div></div>
          <Icon name="chevronRight" size={18} className="muted" />
        </button>
        <details className="row details-row">
          <summary>
            <RowIcon icon="book" color="var(--warm)" />
            <div className="row-main"><div className="row-title">Word sources</div></div>
            <Icon name="chevronRight" size={18} className="muted details-chev" />
          </summary>
          <p className="row-sub details-body">
            Extra words are picked in order of how common they are from the Kelly Project Arabic frequency list (University of Leeds). Each word's spelling, meaning,
            pronunciation and verb forms come from English Wiktionary, and every meaning is confirmed by at least one more source: Wiktionary's English-to-Arabic
            translations, Arabic WordNet (with Princeton WordNet), or Tim Buckwalter's Arabic lexicon. Words that fail any check are left out. New packs open as you
            learn.
          </p>
        </details>
        {import.meta.env.DEV && (
          <Link to="/garden-preview" className="row">
            <RowIcon icon="sparkle" color="#9b6fd0" />
            <div className="row-main">
              <div className="row-title">Garden playground</div>
              <div className="row-sub">Try every stage, weather and time</div>
            </div>
            <Icon name="chevronRight" size={18} className="muted" />
          </Link>
        )}
      </Section>

      <Section title="Danger zone">
        <button className="row" onClick={resetAll}>
          <RowIcon icon="refresh" color="var(--danger)" />
          <div className="row-main">
            <div className="row-title" style={{ color: 'var(--danger)' }}>Reset all progress</div>
            <div className="row-sub">Deletes every review and your garden. This can't be undone.</div>
          </div>
        </button>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="section-label">{title}</h2>
      <div className="card group">{children}</div>
    </section>
  )
}

function RowIcon({ icon, color }: { icon: IconName; color?: string }) {
  return (
    <span className="row-icon" style={color ? { ['--c' as string]: color } : undefined}>
      <Icon name={icon} size={18} strokeWidth={2} />
    </span>
  )
}
