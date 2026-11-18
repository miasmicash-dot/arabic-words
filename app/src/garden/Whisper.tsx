// A line of handwriting over the garden that says what is waiting today, in a hand that suits the garden's mood:
// flowing script when it thrives, a plain pencil hand on grey days, a rough scrawl in a drought. It fades after ~3 s.
import { useEffect, useState } from 'react'
import { afterIntro } from '../intro/player'
import type { Mood } from './theme'

export function whisperLine(m: Mood, n: number): string {
  const w = n === 1 ? 'word' : 'words'
  const is = n === 1 ? 'is' : 'are'
  if (m === 'dead') return n ? `Plant a new seed… ${n} ${w} ${is} waiting` : 'Plant a new seed to begin again'
  if (n === 0)
    return {
      lush: 'All watered, your garden is glowing',
      fair: 'All done for today, well tended',
      grey: 'Nothing due today, the sun will return',
      drought: 'All done… rain is on its way',
    }[m]
  return {
    lush: `${n} ${w} ${is} blooming for you today`,
    fair: `${n} ${w} ${is} waiting for you`,
    grey: `${n} ${w} could bring the sun back`,
    drought: `So dry… ${n} ${w} would bring the rain`,
  }[m]
}

/** `waiting` = words to review + new words today (null while still counting). Change `replay` to show it again. */
export default function Whisper({ mood, waiting, replay }: { mood: Mood; waiting: number | null; replay: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const off = afterIntro(() => {
      t = setTimeout(() => setShown(1), 350)
    })
    return () => {
      off()
      if (t) clearTimeout(t)
    }
  }, [])
  useEffect(() => {
    if (replay) setShown(replay)
  }, [replay])
  if (!shown || waiting === null) return null
  return (
    <div key={shown} className={`gp-whisper gp-whisper-${mood}`} aria-live="polite">
      <span>{whisperLine(mood, waiting)}</span>
    </div>
  )
}
