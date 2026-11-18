import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, DEFAULT_SETTINGS, type StudyCard, type Word } from '../db'
import { answerCard, getSession, getStats, previewIntervals } from '../scheduler'
import { updateDueCount } from '../push'

const LABELS = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' } as const
const COLORS = { 1: '#dc2626', 2: '#d97706', 3: '#0f766e', 4: '#2563eb' } as const

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
      getStats(new Date()).then((s) => updateDueCount(s.dueNow).catch(() => {}))
    }
  }, [queue])

  if (!queue) return <p className="muted">Loading…</p>
  if (queue.length === 0) {
    return (
      <div className="card p-8 text-center space-y-3">
        <div className="text-4xl">🎉</div>
        <div className="text-xl font-bold">Session complete</div>
        <div className="muted">{done} cards reviewed</div>
        <Link to="/" className="btn inline-block">Back home</Link>
      </div>
    )
  }

  const card = queue[0]
  const word = words.get(card.wordId)
  if (!word) return <p>Missing word.</p>
  const preview = previewIntervals(card)

  async function rate(g: 1 | 2 | 3 | 4) {
    const updated = await answerCard(card.id, g, Date.now() - shownAt.current, new Date())
    const rest = queue!.slice(1)
    setQueue(g === 1 ? [...rest, updated] : rest)
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
        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map((g) => (
            <button key={g} className="btn" style={{ background: COLORS[g] }} onClick={() => rate(g)}>
              <div>{LABELS[g]}</div>
              <div className="text-xs font-normal opacity-80">{preview[g]}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
