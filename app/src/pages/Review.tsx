// A review session. New words are met first, then every card is a typing test: she types the answer, the app checks it,
// shows any spelling fix and gives the score itself. A missed word is typed once more before moving on.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { State } from 'ts-fsrs'
import { db, DEFAULT_SETTINGS, type Direction, type StudyCard, type Word } from '../db'
import { answerCard, getSession, getStats } from '../scheduler'
import { celebrate } from '../confetti'
import { unlockPacks } from '../boot'
import { updateDueCount } from '../push'
import { markWatered } from '../garden/service'
import { checkAnswer, grade as scoreFor, hasArabic, hintNext, hintTarget, reason, stripHarakat, type CheckResult, type DiffPart, type Grade } from '../answer'
import './review.css'

/** The four scores, in plain words. The app picks one for you from your typed answer. */
export const RATINGS = {
  1: { label: 'Forgot', icon: '🌧️', help: "Wrong or skipped. It comes back soon.", color: '#d9534f' },
  2: { label: 'Hard', icon: '🌱', help: 'Right, with a spelling fix or a hint.', color: '#e0912f' },
  3: { label: 'Good', icon: '🌿', help: 'Right. It comes back in a while.', color: '#2f9a68' },
  4: { label: 'Easy', icon: '🌸', help: 'Right and quick. It comes back much later.', color: '#3a7bd5' },
} as const

type Phase = 'meet' | 'test' | 'feedback' | 'retype'

interface Outcome {
  result: CheckResult | null
  grade: Grade
  hinted: boolean
  skipped: boolean
  overridden: boolean
  justMet: boolean
  wasNew: boolean
  ms: number
}

interface Tally {
  reviewed: number
  right: number
  fixes: number
  missed: { word: Word; direction: Direction }[]
}

const KEYS_PREF = 'review-ar-keys'
const readPref = () => {
  try { return localStorage.getItem(KEYS_PREF) === '1' } catch { return false }
}
const writePref = (on: boolean) => {
  try { localStorage.setItem(KEYS_PREF, on ? '1' : '0') } catch { /* ignore */ }
}

// ---------- speech ----------

function useArabicVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const pick = () => setVoice(speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ar')) ?? null)
    pick()
    speechSynthesis.addEventListener('voiceschanged', pick)
    return () => speechSynthesis.removeEventListener('voiceschanged', pick)
  }, [])
  const speak = useCallback(
    (text: string) => {
      if (!voice) return
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.voice = voice
      u.lang = voice.lang
      u.rate = 0.8
      speechSynthesis.speak(u)
    },
    [voice],
  )
  return voice ? speak : null
}

function Listen({ speak, text }: { speak: ((t: string) => void) | null; text: string }) {
  if (!speak) return null
  return (
    <button type="button" className="rv-listen" onClick={() => speak(text)} aria-label="Listen">
      <span aria-hidden>🔊</span> Listen
    </button>
  )
}

// ---------- small pieces ----------

const shown = (w: Word) => w.vocalized ?? w.arabic[0] ?? ''

function Conjugations({ word }: { word: Word }) {
  if (!word.conjugations) return null
  return (
    <div className="rv-conj">
      {Object.entries(word.conjugations).map(([k, v]) => (
        <div key={k}>
          <span className="muted">{k}</span>
          <span className="ar">{v}</span>
        </div>
      ))}
    </div>
  )
}

/** The full answer: every Arabic form, the Latin spelling, notes and verb forms. */
function FullAnswer({ word, speak }: { word: Word; speak: ((t: string) => void) | null }) {
  return (
    <div className="rv-full">
      <div className="rv-full-ar">
        <span className="ar" lang="ar">{shown(word)}</span>
        <Listen speak={speak} text={shown(word)} />
      </div>
      {word.arabic.length > 1 && (
        <div className="ar rv-alt" lang="ar">{word.arabic.slice(1).join(' · ')}</div>
      )}
      {word.translit.length > 0 && <div className="rv-translit">{word.translit.join(' / ')}</div>}
      <div className="rv-meaning">{word.english}</div>
      {word.notes && <div className="rv-notes muted">{word.notes}</div>}
      <Conjugations word={word} />
    </div>
  )
}

function Diff({ parts, ar, side }: { parts: DiffPart[]; ar: boolean; side: 'typed' | 'expected' }) {
  return (
    <span className={`rv-diff${ar ? ' ar' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : undefined}>
      {parts.map((p, i) => (
        <span key={i} className={p.op === 'same' ? undefined : `rv-d-${side === 'typed' ? 'bad' : 'fix'}${p.op === 'missing' ? ' rv-d-missing' : ''}`}>
          {p.ch === ' ' ? ' ' : p.ch}
        </span>
      ))}
    </span>
  )
}

const AR_ROWS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط', 'ذ'],
  ['ئ', 'ء', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'ظ', 'أ', 'إ', 'آ'],
]

function ArabicKeys({ onKey, onBack }: { onKey: (ch: string) => void; onBack: () => void }) {
  const keep = (e: React.SyntheticEvent) => e.preventDefault() // keep the cursor in the answer box
  return (
    <div className="rv-keys" role="group" aria-label="Arabic letters">
      {AR_ROWS.map((row, r) => (
        <div key={r} className="rv-keys-row" dir="rtl">
          {row.map((ch) => (
            <button key={ch} type="button" className="rv-key ar" onMouseDown={keep} onClick={() => onKey(ch)}>{ch}</button>
          ))}
        </div>
      ))}
      <div className="rv-keys-row">
        <button type="button" className="rv-key rv-key-wide" onMouseDown={keep} onClick={() => onKey(' ')}>space</button>
        <button type="button" className="rv-key rv-key-back" onMouseDown={keep} onClick={onBack} aria-label="Delete">⌫</button>
      </div>
    </div>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  const left = total - done
  return (
    <div className="rv-top">
      <Link to="/" className="rv-exit">← Exit</Link>
      <div className="rv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <span className="rv-left">{left} left</span>
    </div>
  )
}

function Score({ g, line }: { g: Grade; line: string }) {
  const r = RATINGS[g]
  return (
    <div className="rv-score" style={{ ['--c' as string]: r.color }}>
      <span className="rv-score-chip"><span aria-hidden>{r.icon}</span> {r.label}</span>
      <span className="rv-score-why">{line}</span>
    </div>
  )
}

// ---------- the session ----------

export default function Review() {
  const [queue, setQueue] = useState<StudyCard[] | null>(null)
  const [words, setWords] = useState<Map<string, Word>>(new Map())
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('test')
  const [typed, setTyped] = useState('')
  const [hinted, setHinted] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [retypeOk, setRetypeOk] = useState(false)
  const [shake, setShake] = useState(false)
  const [latinNudge, setLatinNudge] = useState(false)
  const [keys, setKeys] = useState(readPref)
  const [tally, setTally] = useState<Tally>({ reviewed: 0, right: 0, fixes: 0, missed: [] })
  const met = useRef(new Set<string>())
  const shownAt = useRef(0)
  const pending = useRef<{ cardId: string; grade: Grade; ms: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const speak = useArabicVoice()

  const phaseFor = (c: StudyCard | undefined): Phase => (c && c.fsrs.state === State.New && !met.current.has(c.wordId) ? 'meet' : 'test')

  useEffect(() => {
    ;(async () => {
      const settings = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
      const s = await getSession(new Date(), settings)
      setWords(new Map((await db.words.toArray()).map((w) => [w.id, w])))
      setQueue(s.queue)
      setPhase(phaseFor(s.queue[0]))
    })()
    // if she leaves mid-way, the answer she already gave is still saved
    return () => {
      const p = pending.current
      pending.current = null
      if (p) answerCard(p.cardId, p.grade, p.ms, new Date()).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'test') shownAt.current = Date.now()
  }, [phase, idx])

  const finished = !!queue && idx >= queue.length
  useEffect(() => {
    if (!finished) return
    if (tally.reviewed > 0) {
      markWatered()
      celebrate('big')
      unlockPacks().then((u) => u && setTimeout(() => celebrate('big'), 1400))
    }
    getStats(new Date()).then((s) => updateDueCount(s.dueNow).catch(() => {}))
  }, [finished]) // eslint-disable-line react-hooks/exhaustive-deps

  const card = queue?.[idx]
  const word = card ? words.get(card.wordId) : undefined

  async function flush() {
    const p = pending.current
    pending.current = null
    if (p) await answerCard(p.cardId, p.grade, p.ms, new Date())
  }

  const focusInput = () => inputRef.current?.focus({ preventScroll: true })

  function startTest() {
    if (!card) return
    met.current.add(card.wordId)
    flushSync(() => setPhase('test'))
    focusInput() // inside the tap, so the phone keyboard opens
  }

  function burstAt(): { x: number; y: number } | undefined {
    const r = inputRef.current?.getBoundingClientRect()
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined
  }

  function submit(skipped = false) {
    if (!card || !word) return
    if (!skipped && !typed.trim()) {
      setShake(true)
      focusInput()
      return
    }
    if (!skipped && card.direction === 'en-ar' && !hasArabic(typed)) {
      setLatinNudge(true)
      setShake(true)
      focusInput()
      return
    }
    setLatinNudge(false)
    const ms = Date.now() - shownAt.current
    const wasNew = card.fsrs.state === State.New
    const result = skipped ? null : checkAnswer(word, card.direction, typed)
    const g = scoreFor({ kind: result?.kind ?? 'wrong', hinted, ms, direction: card.direction, justMet: wasNew })
    const at = burstAt()
    pending.current = { cardId: card.id, grade: g, ms }
    setOutcome({ result, grade: g, hinted, skipped, overridden: false, justMet: wasNew, wasNew, ms })
    setPhase('feedback')
    inputRef.current?.blur()
    // a new word answered right is a small win
    if (wasNew && g >= 2) celebrate('small', at)
  }

  function iWasRight(e: React.MouseEvent) {
    if (!outcome) return
    setOutcome({ ...outcome, grade: 3, overridden: true })
    if (pending.current) pending.current.grade = 3
    if (outcome.wasNew) celebrate('small', { x: e.clientX, y: e.clientY })
  }

  function hint() {
    if (!card || !word) return
    setTyped(hintNext(typed, hintTarget(word, card.direction, typed)))
    setHinted(true)
    focusInput()
  }

  function insert(ch: string): string {
    const el = inputRef.current
    const s = el?.selectionStart ?? typed.length
    const e = el?.selectionEnd ?? typed.length
    const v = typed.slice(0, s) + ch + typed.slice(e)
    setTyped(v)
    requestAnimationFrame(() => el?.setSelectionRange(s + ch.length, s + ch.length))
    return v
  }
  function backspace() {
    const el = inputRef.current
    const s = el?.selectionStart ?? typed.length
    const e = el?.selectionEnd ?? typed.length
    if (s === e && s === 0) return
    const from = s === e ? s - 1 : s
    setTyped(typed.slice(0, from) + typed.slice(e))
    requestAnimationFrame(() => el?.setSelectionRange(from, from))
  }
  function toggleKeys() {
    setKeys((k) => {
      writePref(!k)
      return !k
    })
    focusInput()
  }

  /** Leaves the feedback: saves the score, counts it, then either asks for one retype (if missed) or moves on. */
  async function next() {
    if (!card || !word || !outcome) return
    const g = outcome.grade
    setTally((t) => ({
      reviewed: t.reviewed + 1,
      right: t.right + (g >= 2 ? 1 : 0),
      fixes: t.fixes + (g >= 2 && outcome.result?.kind === 'typo' && !outcome.overridden ? 1 : 0),
      missed: g === 1 && !t.missed.some((m) => m.word.id === word.id) ? [...t.missed, { word, direction: card.direction }] : t.missed,
    }))
    const saving = flush()
    if (g === 1) {
      flushSync(() => {
        setTyped('')
        setRetypeOk(false)
        setPhase('retype')
      })
      focusInput()
      await saving.catch(() => {})
      return
    }
    await saving.catch(() => {})
    advance()
  }

  function advance() {
    const n = idx + 1
    const nextPhase = phaseFor(queue?.[n])
    flushSync(() => {
      setIdx(n)
      setTyped('')
      setHinted(false)
      setOutcome(null)
      setPhase(nextPhase)
    })
    if (nextPhase === 'test') focusInput()
  }

  function retypeCheck(v: string, enter: boolean) {
    if (!card || !word || retypeOk) return
    const r = checkAnswer(word, card.direction, v)
    if (r.kind !== 'wrong') {
      setRetypeOk(true)
      inputRef.current?.blur()
      setTimeout(advance, 750)
    } else if (enter) setShake(true)
  }

  // Enter moves on from the feedback, unless a button already has focus (it then handles Enter itself)
  useEffect(() => {
    if (phase !== 'feedback') return
    const t0 = Date.now()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || Date.now() - t0 < 250) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return
      e.preventDefault()
      next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // re-bound each render so next() sees fresh state

  if (!queue) return <p className="muted rv-loading">Loading…</p>

  if (queue.length === 0) {
    return (
      <div className="rv">
        <div className="card rv-end">
          <div className="rv-end-icon" aria-hidden>🌿</div>
          <h2 className="rv-end-title">All caught up</h2>
          <p className="muted">No words are due right now. Come back a little later.</p>
          <Link to="/" className="btn rv-cta">Back home</Link>
        </div>
      </div>
    )
  }

  if (finished) return <SessionEnd tally={tally} />

  if (!card || !word) return <p className="muted">Missing word.</p>

  const en = card.direction === 'en-ar'
  const typingArabic = en && (hasArabic(typed) || !/[a-z]/i.test(typed))

  let body: ReactNode
  if (phase === 'meet') {
    body = (
      <div className="card rv-card rv-meet" key={`m-${card.id}`}>
        <div className="rv-kicker">New word · {word.type}</div>
        <div className="ar rv-big" lang="ar">{shown(word)}</div>
        <Listen speak={speak} text={shown(word)} />
        {word.translit.length > 0 && <div className="rv-translit">{word.translit.join(' / ')}</div>}
        <div className="rv-meaning rv-meaning-lg">{word.english}</div>
        {word.arabic.length > 1 && <div className="ar rv-alt" lang="ar">also {word.arabic.slice(1).join(' · ')}</div>}
        {word.notes && <div className="rv-notes muted">{word.notes}</div>}
        <Conjugations word={word} />
        <button className="btn rv-cta" onClick={startTest} autoFocus>I'm ready, test me</button>
      </div>
    )
  } else if (phase === 'test') {
    body = (
      <div className="card rv-card" key={`t-${card.id}`}>
        <div className="rv-kicker">{word.type} · {en ? 'English → Arabic' : 'Arabic → English'}</div>
        {en ? <div className="rv-prompt-en">{word.english}</div> : <div className="ar rv-big" lang="ar">{shown(word)}</div>}
        <p className="rv-ask muted">{en ? 'Type it in Arabic' : 'Type the meaning in English'}</p>
        <form
          className="rv-form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            ref={inputRef}
            className={`rv-input${typingArabic ? ' ar' : ''}${shake ? ' rv-shake' : ''}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onAnimationEnd={() => setShake(false)}
            dir="auto"
            lang={en ? 'ar' : 'en'}
            inputMode={en && keys ? 'none' : 'text'}
            enterKeyHint="done"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={en ? 'اكتب هنا' : 'Your answer'}
            aria-label="Your answer"
          />
          {hinted && <span className="rv-hinted">Hint used</span>}
          {en && keys && <ArabicKeys onKey={insert} onBack={backspace} />}
          <button type="submit" className="btn rv-cta">Check</button>
        </form>
        <div className="rv-tools">
          <button type="button" className="btn ghost" onClick={hint}>💡 Hint</button>
          <button type="button" className="btn ghost" onClick={() => submit(true)}>I don't know</button>
        </div>
        {en && latinNudge && !hasArabic(typed) && <div className="rv-nudge" role="alert">Please type it in Arabic letters. Tap ⌨️ below for Arabic keys.</div>}
        {en && (
          <div className="rv-ar-help">
            <button type="button" className="rv-link" onClick={toggleKeys} aria-pressed={keys}>
              ⌨️ {keys ? 'Use my phone keyboard' : 'Arabic letters on screen'}
            </button>
          </div>
        )}
      </div>
    )
  } else if (phase === 'feedback' && outcome) {
    const r = outcome.result
    const right = outcome.grade >= 2
    const fix = r?.kind === 'typo' && !outcome.overridden
    const arDiff = r?.script === 'ar'
    const title = outcome.skipped ? 'Here it is' : outcome.overridden ? 'Marked right' : !right ? 'Not quite' : fix ? 'Right, small spelling fix' : outcome.hinted ? 'Right, with a hint' : 'Right!'
    body = (
      <div className={`card rv-card rv-fb ${right ? 'rv-ok' : 'rv-no'}`} key={`f-${card.id}`}>
        <div className="rv-fb-head">
          <span className="rv-mark" aria-hidden>{right ? '✓' : '✗'}</span>
          <span className="rv-fb-title" role="status">{title}</span>
        </div>
        <div className="rv-q">
          {en ? <span>{word.english}</span> : <span className="ar" lang="ar">{shown(word)}</span>}
        </div>
        {r && r.kind !== 'exact' && !outcome.overridden && (
          <div className="rv-compare">
            <div>
              <small className="muted">You typed</small>
              <Diff parts={r.typedDiff} ar={arDiff} side="typed" />
            </div>
            <div>
              <small className="muted">{fix ? 'Spelling fix' : 'Correct answer'}</small>
              <Diff parts={r.expectedDiff.length ? r.expectedDiff : [...r.expected].map((ch) => ({ ch, op: 'same' as const }))} ar={arDiff || (r.script === 'latin' && !r.expectedDiff.length)} side="expected" />
            </div>
          </div>
        )}
        <FullAnswer word={word} speak={speak} />
        <Score g={outcome.grade} line={reason(outcome.grade, { ...outcome, kind: r?.kind ?? 'wrong' })} />
        <div className="rv-actions">
          <button className="btn rv-cta" onClick={next} autoFocus>{outcome.grade === 1 ? 'Next: type it once' : 'Next'}</button>
          {outcome.grade === 1 && !outcome.skipped && (
            <button className="btn ghost" onClick={iWasRight}>I was right</button>
          )}
        </div>
      </div>
    )
  } else {
    // retype once: a missed word sticks better after typing it correctly
    const target = en ? stripHarakat(word.arabic[0] ?? '') : word.english
    body = (
      <div className={`card rv-card rv-retype${retypeOk ? ' rv-ok' : ''}`} key={`r-${card.id}`}>
        <div className="rv-kicker">Type it once to help it stick</div>
        <div className="rv-q">
          {en ? <span>{word.english}</span> : <span className="ar" lang="ar">{shown(word)}</span>}
        </div>
        <div className={`rv-target${en ? ' ar' : ''}`} lang={en ? 'ar' : undefined}>{target}</div>
        {en && word.translit[0] && <div className="rv-translit">{word.translit[0]}</div>}
        <form
          className="rv-form"
          onSubmit={(e) => {
            e.preventDefault()
            retypeCheck(typed, true)
          }}
        >
          <input
            ref={inputRef}
            className={`rv-input${typingArabic ? ' ar' : ''}${shake ? ' rv-shake' : ''}`}
            value={typed}
            onAnimationEnd={() => setShake(false)}
            onChange={(e) => {
              setTyped(e.target.value)
              retypeCheck(e.target.value, false)
            }}
            dir="auto"
            lang={en ? 'ar' : 'en'}
            inputMode={en && keys ? 'none' : 'text'}
            enterKeyHint="done"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={retypeOk}
            aria-label="Type the answer"
          />
          {en && keys && !retypeOk && <ArabicKeys onKey={(ch) => retypeCheck(insert(ch), false)} onBack={backspace} />}
          {retypeOk ? (
            <div className="rv-retype-ok" role="status"><span className="rv-mark" aria-hidden>✓</span> Got it</div>
          ) : (
            <button type="button" className="btn ghost rv-cta" onClick={advance}>Skip</button>
          )}
        </form>
      </div>
    )
  }

  return (
    <div className="rv">
      <Progress done={idx + (phase === 'feedback' || phase === 'retype' ? 1 : 0)} total={queue.length} />
      {body}
    </div>
  )
}

function SessionEnd({ tally }: { tally: Tally }) {
  const share = tally.reviewed ? tally.right / tally.reviewed : 0
  const icon = share >= 0.9 ? '🌸' : share >= 0.6 ? '🌿' : '🌱'
  const title = share >= 0.9 ? 'Beautiful work' : share >= 0.6 ? 'Well done' : 'Every review helps'
  return (
    <div className="rv">
      <div className="card rv-end">
        <div className="rv-end-icon" aria-hidden>{icon}</div>
        <h2 className="rv-end-title">{title}</h2>
        <p className="muted">Session complete{tally.reviewed > 0 ? ' · your plant has been watered 💧' : ''}</p>
        <div className="rv-stats">
          <div><b>{tally.reviewed}</b><small>reviewed</small></div>
          <div className="rv-stat-ok"><b>{tally.right}</b><small>right</small></div>
          <div className="rv-stat-fix"><b>{tally.fixes}</b><small>spelling fixes</small></div>
        </div>
        {tally.missed.length > 0 && (
          <div className="rv-watch">
            <h3>Words to watch</h3>
            <ul>
              {tally.missed.map(({ word, direction }) => (
                <li key={`${word.id}:${direction}`}>
                  <span className="ar" lang="ar">{shown(word)}</span>
                  <span>{word.english}</span>
                </li>
              ))}
            </ul>
            <p className="muted rv-watch-note">They will come back soon for another try.</p>
          </div>
        )}
        <Link to="/" className="btn rv-cta">Back home</Link>
      </div>
    </div>
  )
}
