// A short welcome tour, shown once after the name is asked (and again from Settings). It explains what the app is,
// sets how many new words a day, explains typing the answer, how the app scores it, and offers real weather.
import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, db } from '../db'
import { RATINGS } from '../pages/Review'
import { enableRealWeather, weatherAllowed } from '../garden/realWeather'
import { celebrate } from '../confetti'

const SEEN = 'tutorial-seen'
export const tutorialSeen = () => {
  try { return localStorage.getItem(SEEN) === '1' } catch { return true }
}
const markSeen = () => {
  try { localStorage.setItem(SEEN, '1') } catch { /* ignore */ }
}

function Motes() {
  return (
    <div className="intro-motes" aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 61) % 100}%`, top: `${(i * 37 + 11) % 100}%`, animationDelay: `${-(i * 0.7) % 6}s`, animationDuration: `${5 + (i % 5)}s` }} />
      ))}
    </div>
  )
}

export default function Tutorial({ name, onDone }: { name: string; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [perDay, setPerDay] = useState(DEFAULT_SETTINGS.dailyNewLimit)
  const [wx, setWx] = useState<'off' | 'asking' | 'on' | 'no'>(() => (weatherAllowed() ? 'on' : 'off'))

  useEffect(() => {
    db.settings.get('main').then((s) => s && setPerDay(s.dailyNewLimit))
  }, [])

  async function savePerDay(n: number) {
    setPerDay(n)
    const s = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
    await db.settings.put({ ...s, dailyNewLimit: n })
  }

  const pages = [
    {
      icon: '🌱',
      title: `Welcome, ${name || 'friend'}`,
      body: (
        <>
          <p>This app teaches you Arabic words using <b>spaced repetition</b>.</p>
          <p>Each word comes back just before you would forget it. Words you find hard come back soon; words you know well come back days or weeks later. A few minutes a day is all it takes.</p>
        </>
      ),
    },
    {
      icon: '📚',
      title: 'How many new words a day?',
      body: (
        <>
          <p>You will only meet this many <b>new</b> words each day. Words you are already learning still come back when they are due.</p>
          <div className="tut-count">
            <button className="tut-step" aria-label="Fewer" onClick={() => savePerDay(Math.max(1, perDay - 1))}>−</button>
            <div><b>{perDay}</b><small>new words a day</small></div>
            <button className="tut-step" aria-label="More" onClick={() => savePerDay(Math.min(30, perDay + 1))}>+</button>
          </div>
          <div className="tut-chips">
            {[5, 10, 15, 20].map((n) => (
              <button key={n} className={`tut-chip${perDay === n ? ' on' : ''}`} onClick={() => savePerDay(n)}>{n === 5 ? '5 · gentle' : n === 10 ? '10 · steady' : n === 15 ? '15 · keen' : '20 · intense'}</button>
            ))}
          </div>
          <p className="tut-note">You can change this any time in Settings.</p>
        </>
      ),
    },
    {
      icon: '🃏',
      title: 'How a review works',
      body: (
        <>
          <p>You see a word and <b>type the answer</b>. New words are shown to you first, so you meet them before you are tested.</p>
          <p>Type Arabic answers in Arabic letters. There are Arabic keys on screen if your phone has none.</p>
          <p>The app <b>checks your answer</b>, fixes small spelling slips, and shows you the right spelling.</p>
          <p className="tut-note">Stuck? Tap Hint for the next letter, or I don't know to see the answer.</p>
        </>
      ),
    },
    {
      icon: '⭐',
      title: 'How you are scored',
      body: (
        <>
          <p>You don't score yourself. The app gives each answer a score:</p>
          <div className="tut-rates">
            {([1, 2, 3, 4] as const).map((g) => (
              <div key={g} className="tut-rate" style={{ ['--c' as string]: RATINGS[g].color }}>
                <b>{RATINGS[g].icon} {RATINGS[g].label}</b>
                <span>{RATINGS[g].help}</span>
              </div>
            ))}
          </div>
          <p className="tut-note">If it marks you wrong but you were right, tap “I was right”. A word never comes back sooner than an hour later.</p>
        </>
      ),
    },
    {
      icon: '🌿',
      title: 'How words grow',
      body: (
        <ul className="tut-list">
          <li><b>Your score</b> decides when each word returns. “Forgot” brings it back soon, “Easy” sends it far away.</li>
          <li><b>A word is learned</b> once you remember it a week or more after last seeing it.</li>
          <li><b>Learned words grow your plant</b>, stage by stage, toward the goal you pick.</li>
          <li><b>Studying keeps it healthy.</b> Each day you review, health goes up. Doing your reviews later in the day is fine; a day only counts as missed if 24 hours pass with no reviews.</li>
          <li>Miss many days and the garden turns grey; after a long time away the plant can die and you replant.</li>
        </ul>
      ),
    },
    {
      icon: '🌦️',
      title: 'Your garden',
      body: (
        <>
          <p>Your plant lives in a little world of its own. The healthier it is, the more animals visit. Tap things: some of them have secrets.</p>
          <p>Want the sky to match your real weather? Rain, snow and wind will show up as they happen where you are.</p>
          {wx === 'on' ? (
            <p className="tut-ok">✓ Real weather is on</p>
          ) : (
            <button
              className="tut-ghost"
              disabled={wx === 'asking'}
              onClick={async () => {
                setWx('asking')
                setWx((await enableRealWeather()) ? 'on' : 'no')
              }}
            >
              {wx === 'asking' ? 'Asking…' : wx === 'no' ? 'Location not allowed. Try again?' : '📍 Use my local weather'}
            </button>
          )}
          <p className="tut-note">Your location is only used to look up the weather and is never stored.</p>
        </>
      ),
    },
  ]

  const last = i === pages.length - 1
  const p = pages[i]
  const finish = () => {
    markSeen()
    celebrate('big')
    onDone()
  }

  return (
    <div className="intro intro-ask" role="dialog" aria-label="How the app works">
      <Motes />
      <div className="tut-card" key={i}>
        <div className="tut-icon" aria-hidden>{p.icon}</div>
        <h2 className="tut-title">{p.title}</h2>
        <div className="tut-body">{p.body}</div>
        <div className="tut-dots" aria-hidden>
          {pages.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}
        </div>
        <div className="tut-nav">
          {i > 0 ? <button className="tut-ghost" onClick={() => setI(i - 1)}>Back</button> : <button className="tut-ghost" onClick={finish}>Skip</button>}
          <button className="intro-go" onClick={() => (last ? finish() : setI(i + 1))}>{last ? 'Start growing 🌱' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
