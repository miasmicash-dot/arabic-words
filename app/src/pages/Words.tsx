import { useEffect, useMemo, useState } from 'react'
import { State } from 'ts-fsrs'
import { db, type StudyCard, type Word } from '../db'

function status(cards: StudyCard[]): string {
  const started = cards.filter((c) => c.fsrs.state !== State.New)
  if (!started.length) return 'New'
  const best = Math.max(...started.map((c) => c.fsrs.stability))
  return best >= 21 ? 'Mature' : 'Learning'
}

export default function Words() {
  const [words, setWords] = useState<Word[]>([])
  const [cards, setCards] = useState<StudyCard[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    ;(async () => {
      setWords(await db.words.toArray())
      setCards(await db.cards.toArray())
    })()
  }, [])

  const byWord = useMemo(() => {
    const m = new Map<string, StudyCard[]>()
    for (const c of cards) m.set(c.wordId, [...(m.get(c.wordId) ?? []), c])
    return m
  }, [cards])

  const shown = words.filter((w) => {
    const t = q.trim().toLowerCase()
    return !t || w.english.toLowerCase().includes(t) || w.arabic.some((a) => a.includes(t)) || w.translit.some((x) => x.toLowerCase().includes(t))
  })

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Words ({words.length})</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search English, Arabic or transliteration"
        className="card w-full px-4 py-3"
      />
      <ul className="space-y-2">
        {shown.slice(0, 300).map((w) => (
          <li key={w.id} className="card px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{w.english}</div>
              <div className="text-xs muted">{w.type}{w.translit[0] ? ` · ${w.translit[0]}` : ''}</div>
            </div>
            <div className="text-right">
              <div className="ar text-xl">{w.arabic[0]}</div>
              <div className="text-xs muted">{status(byWord.get(w.id) ?? [])}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
