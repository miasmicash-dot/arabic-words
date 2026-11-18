import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, DEFAULT_SETTINGS, type StudyCard, type Word } from '../db'
import { answerCard, getSession, getStats } from '../scheduler'
import { State } from 'ts-fsrs'
import { celebrate } from '../confetti'
import { unlockPacks } from '../boot'
import { updateDueCount } from '../push'
import { markWatered } from '../garden/service'

/** The four answers, in plain words. How soon a word comes back is worked out for you, so no timings are shown. */
export const RATINGS = {
  1: { label: 'Forgot', icon: '🌧️', help: "I didn't know it. Show it again soon.", color: '#d9534f' },
  2: { label: 'Hard', icon: '🌱', help: 'I got it, but it took real effort.', color: '#e0912f' },
  3: { label: 'Good', icon: '🌿', help: 'I knew it after a moment.', color: '#2f9a68' },
  4: { label: 'Easy', icon: '🌸', help: 'I knew it instantly. Show it much later.', color: '#3a7bd5' },
} as const

export default function Review() {
  const [queue, setQueue] = useState<StudyCard[] | null>(null)
  const [words, setWords] = useState<Map<string, Word>>(new Map())
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(0)
  const shownAt = useRef(Date.now())

  useEffect(() => {
    ;(async () => {
      const settings = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
      const s = await getSession(new Date(), settings)
      setWords(new Map((await db.words.toArray()).map((w) => [w.id, w])))
      setQueue(s.queue)
    })()
  }, [])

  useEffect(() => {
    shownAt.current = Date.now()
  }, [queue?.[0]?.id, done])

  useEffect(() => {
    if (queue && queue.length === 0) {
      if (done > 0) {
        markWatered()
        celebrate('big')
        unlockPacks().then((u) => u && setTimeout(() => celebrate('big'), 1400))
      }
      getStats(new Date()).then((s) => updateDueCount(s.dueNow).catch(() => {}))
    }
  }, [queue]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!queue) return <p className="muted">Loading…</p>
  if (queue.length === 0) {
    return (
      <div className="card p-8 text-center space-y-3">
        <div className="text-4xl">🎉</div>
        <div className="text-xl font-bold">Session complete</div>
        <div className="muted">{done} cards reviewed{done > 0 ? ' · your plant has been watered 💧' : ''}</div>
        <Link to="/" className="btn inline-block">Back home</Link>
      </div>
    )
  }

  const card = queue[0]
  const word = words.get(card.wordId)
  if (!word) return <p>Missing word.</p>

  async function rate(g: 1 | 2 | 3 | 4, e: React.MouseEvent) {
    const wasNew = card.fsrs.state === State.New
    const at = { x: e.clientX, y: e.clientY }
    await answerCard(card.id, g, Date.now() - shownAt.current, new Date())
    // a word you got right for the first time is a small win
    if (wasNew && g >= 3) celebrate('small', at)
    // the shortest gap before a word comes back is an hour, so it never repeats within the same sitting
    setQueue(queue!.slice(1))
    setRevealed(false)
    setDone((d) => d + 1)
  }

  const en = card.direction === 'en-ar'
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm muted">
        <Link to="/">← Exit</Link>
        <span>{queue.length} left</span>
      </div>
      <div className="card p-8 text-center space-y-4 min-h-64 flex flex-col justify-center" onClick={() => setRevealed(true)}>
        <div className="text-xs uppercase tracking-wide muted">{word.type}{en ? ' · English → Arabic' : ' · Arabic → English'}</div>
        {en ? <div className="text-3xl font-semibold">{word.english}</div> : <div className="ar text-5xl">{word.arabic[0]}</div>}
        {revealed && (
          <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
            {en ? (
              word.arabic.map((a) => <div key={a} className="ar text-4xl">{a}</div>)
            ) : (
              <div className="text-2xl font-semibold">{word.english}</div>
            )}
            {word.translit.length > 0 && <div className="muted italic">{word.translit.join(' / ')}</div>}
            {!en && word.arabic.length > 1 && (
              <div className="ar text-2xl muted">{word.arabic.slice(1).join(' · ')}</div>
            )}
            {word.notes && <div className="text-sm muted">{word.notes}</div>}
            {word.conjugations && (
              <div className="grid grid-cols-2 gap-1 pt-2 text-sm">
                {Object.entries(word.conjugations).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="muted">{k}</span>
                    <span className="ar">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {!revealed ? (
        <button className="btn w-full" onClick={() => setRevealed(true)}>Show answer</button>
      ) : (
        <div className="space-y-2">
          <p className="rate-help muted">How well did you know it?</p>
          <div className="rate-grid">
            {([1, 2, 3, 4] as const).map((g) => (
              <button key={g} className="rate" style={{ ['--c' as string]: RATINGS[g].color }} onClick={(e) => rate(g, e)}>
                <b><span aria-hidden>{RATINGS[g].icon}</span>{RATINGS[g].label}</b>
                <small>{RATINGS[g].help}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
