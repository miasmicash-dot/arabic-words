// Opening sequence. First launch: ask for the player's name. Every launch after: a black screen that writes
// "<name>'s Garden" in flowing script, then the title glides into its place on the Home page as the garden appears.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { currentMood, type Mood } from '../garden/theme'
import { mix } from '../garden/scene/ink'
import { finishIntro, gardenTitle, getPlayerName, setPlayerName } from './player'
import Tutorial, { tutorialSeen } from './Tutorial'
import './intro.css'

/** Ink for the title, from the first letter to the last, by the garden's mood. */
const INK: Record<Mood, [string, string, string]> = {
  lush: ['#fff1b8', '#ffc94d', '#c9ec8e'],
  fair: ['#fff4cc', '#ffd16e', '#f0ad55'],
  grey: ['#f1f4f6', '#b9c4cc', '#e2e7ea'],
  drought: ['#ffe2a6', '#e39a48', '#f4c487'],
  dead: ['#ececec', '#a6a6a6', '#d4d4d4'],
}
const inkAt = (m: Mood, t: number) => (t < 0.5 ? mix(INK[m][0], INK[m][1], t * 2) : mix(INK[m][1], INK[m][2], t * 2 - 1))

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function Motes({ n = 16 }: { n?: number }) {
  return (
    <div className="intro-motes" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ left: `${(i * 61) % 100}%`, top: `${(i * 37 + 11) % 100}%`, animationDelay: `${-(i * 0.7) % 6}s`, animationDuration: `${5 + (i % 5)}s` }} />
      ))}
    </div>
  )
}

function NamePrompt({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState('')
  const ok = name.trim().length > 0
  return (
    <div className="intro intro-ask" role="dialog" aria-label="Welcome">
      <Motes />
      <form
        className="intro-card"
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onDone(name.trim())
        }}
      >
        <div className="intro-hello">Welcome</div>
        <p className="intro-sub">A little garden grows here as you learn. What should we call you?</p>
        <input
          className="intro-input"
          autoFocus
          maxLength={30}
          autoComplete="given-name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="intro-go" disabled={!ok}>
          Begin 🌱
        </button>
      </form>
    </div>
  )
}

function Splash({ name, onDone }: { name: string; onDone: () => void }) {
  const title = gardenTitle(name)
  const letters = Array.from(title)
  const mood = currentMood().mood
  const quick = reducedMotion()
  const [step, setStep] = useState<'wait' | 'write' | 'morph' | 'fade'>('wait')
  const [move, setMove] = useState<CSSProperties>({})
  const text = useRef<HTMLDivElement>(null)

  // wait for the script font (briefly), then write the title
  useEffect(() => {
    let live = true
    const go = () => live && setStep((s) => (s === 'wait' ? 'write' : s))
    const t = setTimeout(go, 700)
    document.fonts?.load('64px "Great Vibes"').then(go, go)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (step === 'write') {
      const t = setTimeout(() => setStep('morph'), quick ? 900 : 500 + letters.length * 60 + 1100)
      return () => clearTimeout(t)
    }
    if (step === 'morph') {
      // glide the title onto the heading of the page underneath, if there is one in view
      const target = document.querySelector<HTMLElement>('[data-intro-target]')
      const el = text.current
      if (target && el) {
        const a = el.getBoundingClientRect()
        const b = target.getBoundingClientRect()
        if (b.width && b.bottom > 0 && b.top < innerHeight) {
          const s = parseFloat(getComputedStyle(target).fontSize) / parseFloat(getComputedStyle(el).fontSize)
          setMove({ transform: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${s})` })
        } else setMove({ transform: 'scale(1.25)', filter: 'blur(6px)', opacity: 0 })
      } else setMove({ transform: 'scale(1.25)', filter: 'blur(6px)', opacity: 0 })
      const t = setTimeout(() => setStep('fade'), quick ? 300 : 1250)
      return () => clearTimeout(t)
    }
    if (step === 'fade') {
      document.documentElement.classList.remove('intro-playing')
      const t = setTimeout(onDone, 600)
      return () => clearTimeout(t)
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => setStep((s) => (s === 'wait' || s === 'write' ? 'morph' : s === 'morph' ? 'fade' : s))

  return (
    <div className={`intro intro-splash intro-${step}${quick ? ' intro-quick' : ''}`} onClick={skip} aria-label={title} role="img">
      <div className="intro-black" />
      <Motes n={22} />
      <div className="intro-stage">
        <div ref={text} className="intro-title" style={{ ...move, ['--glow' as string]: INK[mood][1] }}>
          {step !== 'wait' &&
            letters.map((ch, i) => (
              <span key={i} className="intro-letter" style={{ animationDelay: `${quick ? 0 : 0.35 + i * 0.06}s`, color: inkAt(mood, letters.length > 1 ? i / (letters.length - 1) : 0.5) }}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

export default function Intro() {
  const [name, setName] = useState(getPlayerName)
  const replayed = useRef(false)
  const [phase, setPhase] = useState<'ask' | 'tour' | 'play' | 'done'>(() => (!getPlayerName() ? 'ask' : tutorialSeen() ? 'play' : 'tour'))
  // Settings can open the tour again
  useEffect(() => {
    const again = () => {
      replayed.current = true
      setPhase('tour')
    }
    window.addEventListener('show-tutorial', again)
    return () => window.removeEventListener('show-tutorial', again)
  }, [])

  useEffect(() => {
    if (phase === 'play') document.documentElement.classList.add('intro-playing')
  }, [phase])

  if (phase === 'done') return null
  if (phase === 'tour') return <Tutorial name={name} onDone={() => setPhase(replayed.current ? 'done' : 'play')} />
  if (phase === 'ask')
    return (
      <NamePrompt
        onDone={(n) => {
          setPlayerName(n)
          setName(n)
          window.dispatchEvent(new Event('player-name'))
          setPhase('tour')
        }}
      />
    )
  return (
    <Splash
      name={name}
      onDone={() => {
        setPhase('done')
        finishIntro()
      }}
    />
  )
}
