import { useEffect, useMemo, useState } from 'react'
import { State } from 'ts-fsrs'
import { db, type StudyCard, type Word, type WordType } from '../db'
import Icon from '../ui/Icon'

type Status = 'New' | 'Learning' | 'Mature'

function status(cards: StudyCard[]): Status {
  const started = cards.filter((c) => c.fsrs.state !== State.New)
  if (!started.length) return 'New'
  const best = Math.max(...started.map((c) => c.fsrs.stability))
  return best >= 21 ? 'Mature' : 'Learning'
}

const TYPE_LABEL: Record<WordType, string> = { noun: 'noun', verb: 'verb', adj: 'adjective', phrase: 'phrase', number: 'number' }
const PAGE = 120

export default function Words() {
  const [words, setWords] = useState<Word[] | null>(null)
  const [cards, setCards] = useState<StudyCard[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    ;(async () => {
      setCards(await db.cards.toArray())
      setWords(await db.words.toArray())
    })()
  }, [])

  const statusOf = useMemo(() => {
    const m = new Map<string, StudyCard[]>()
    for (const c of cards) m.set(c.wordId, [...(m.get(c.wordId) ?? []), c])
    const out = new Map<string, Status>()
    for (const [id, cs] of m) out.set(id, status(cs))
    return out
  }, [cards])
  const st = (w: Word): Status => statusOf.get(w.id) ?? 'New'

  const all = words ?? []
  const counts = useMemo(() => {
    const c = { all: all.length, New: 0, Learning: 0, Mature: 0 }
    for (const w of all) c[st(w)]++
    return c
  }, [all, statusOf]) // eslint-disable-line react-hooks/exhaustive-deps

  const t = q.trim().toLowerCase()
  const shown = all.filter(
    (w) =>
      (filter === 'all' || st(w) === filter) &&
      (!t || w.english.toLowerCase().includes(t) || w.arabic.some((a) => a.includes(t)) || w.translit.some((x) => x.toLowerCase().includes(t))),
  )

  return (
    <div className="space-y-4">
      <header className="page-head">
        <div>
          <h1 className="page-title">Words</h1>
          <p className="page-sub">
            {words ? `${all.length.toLocaleString()} words · ${counts.Mature.toLocaleString()} mature` : 'Loading…'}
          </p>
        </div>
      </header>

      <div className="words-tools">
        <label className="search">
          <Icon name="search" size={20} className="search-icon" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="Search English, Arabic or sounds"
            aria-label="Search words"
            enterKeyHint="search"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          {q && (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQ('')}>
              <Icon name="close" size={16} strokeWidth={2.2} />
            </button>
          )}
        </label>
        <div className="seg" role="group" aria-label="Show">
          {(['all', 'New', 'Learning', 'Mature'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f)
                setLimit(PAGE)
              }}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {!words ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 76 }} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="card empty">
          <Icon name="search" size={28} />
          <b>No words found</b>
          <span className="muted text-sm">{t ? `Nothing matches “${q.trim()}”.` : 'Nothing here yet.'}</span>
        </div>
      ) : (
        <>
          <ul className="card group word-list">
            {shown.slice(0, limit).map((w) => {
              const s = st(w)
              return (
                <li key={w.id} className="row word">
                  <div className="row-main">
                    <div className="word-en">{w.english}</div>
                    <div className="word-meta">
                      {w.translit[0] && <span className="word-tr">{w.translit[0]}</span>}
                      <span className="chip">{TYPE_LABEL[w.type] ?? w.type}</span>
                    </div>
                  </div>
                  <div className="word-side">
                    <div className="ar word-ar" lang="ar">{w.arabic[0]}</div>
                    <span className={`word-status s-${s.toLowerCase()}`}>
                      <i aria-hidden />
                      {s}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          {shown.length > limit ? (
            <button className="btn ghost w-full" onClick={() => setLimit(limit + PAGE * 2)}>
              Show more · {(shown.length - limit).toLocaleString()} left
            </button>
          ) : (
            <p className="text-center text-xs muted">
              {shown.length.toLocaleString()} {shown.length === 1 ? 'word' : 'words'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
