// Weather that leaves traces: the ground stays wet for a while after rain, and snow settles while it snows and
// melts afterwards (faster when it is warm or raining). Remembered between visits, so opening the app after a
// snowy night still shows the snow melting away.
import { useEffect, useRef, useState } from 'react'

export type TraceSky = 'clear' | 'cloudy' | 'rain' | 'snow' | 'windy'
export interface Traces {
  /** 0..1 wet ground: darker earth, a sheen and puddles on the path */
  wet: number
  /** 0..1 settled snow on the ground, bushes, plant and fence */
  snow: number
}

const KEY = 'garden-traces-v1'
const MIN = 60_000

interface Saved extends Traces { at: number }

function load(key: string): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (v && typeof v.wet === 'number' && typeof v.snow === 'number' && typeof v.at === 'number') return v
  } catch {
    /* storage can be unavailable */
  }
  return { wet: 0, snow: 0, at: Date.now() }
}

/** Advance the traces by `dt` minutes of this weather. Pure, so it can be tested. */
export function stepTraces(t: Traces, sky: TraceSky, dt: number, temp?: number, day = true): Traces {
  const ease = (from: number, to: number, tau: number) => to + (from - to) * Math.exp(-dt / tau)
  let { wet, snow } = t
  if (sky === 'rain') {
    // rain wets the ground straight away and washes snow away quickly
    wet = Math.max(0.7, ease(wet, 1, 3))
    snow = ease(snow, 0, 25)
  } else if (sky === 'snow') {
    // snow settles: a light dusting at once, a full white cover after about twenty minutes
    snow = Math.max(0.35, ease(snow, 1, 12))
    wet = ease(wet, 0.35, 20)
  } else {
    // the ground dries (faster in the sun and wind) and snow melts (much faster above freezing)
    wet = ease(wet, 0, sky === 'windy' ? 30 : day ? 55 : 140)
    const warm = temp === undefined ? 2 : temp
    const melt = warm > 6 ? 45 : warm > 2 ? 90 : warm > 0 ? 200 : 900
    const before = snow
    snow = ease(snow, 0, day ? melt : melt * 2)
    // melting snow keeps the ground wet
    wet = Math.min(1, Math.max(wet, wet + (before - snow) * 0.8))
  }
  return { wet: wet < 0.01 ? 0 : wet, snow: snow < 0.01 ? 0 : snow }
}

/** Wet ground and settled snow, following the sky over time. */
export function useWeatherTraces(sky: TraceSky, temp: number | undefined, day: boolean, running: boolean, key = KEY): Traces {
  const [t, setT] = useState<Traces>(() => {
    const s = load(key)
    // time away: the weather then is unknown, so only drying and melting are applied
    const away = Math.max(0, (Date.now() - s.at) / MIN)
    return stepTraces(s, sky === 'rain' || sky === 'snow' ? 'cloudy' : sky, away, temp, day)
  })
  const latest = useRef({ sky, temp, day })
  latest.current = { sky, temp, day }
  // react to a change in the sky at once (rain wets, snow dusts), then keep stepping while visible
  useEffect(() => {
    setT((p) => stepTraces(p, sky, 0.01, temp, day))
  }, [sky]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running) return
    let last = Date.now()
    const tick = () => {
      const now = Date.now()
      const dt = (now - last) / MIN
      last = now
      const v = latest.current
      setT((p) => {
        const n = stepTraces(p, v.sky, dt, v.temp, v.day)
        try {
          localStorage.setItem(key, JSON.stringify({ ...n, at: now }))
        } catch {
          /* ignore */
        }
        const same = Math.abs(n.wet - p.wet) < 0.005 && Math.abs(n.snow - p.snow) < 0.005
        return same ? p : n
      })
    }
    const id = setInterval(tick, 20_000)
    return () => {
      clearInterval(id)
      tick()
    }
  }, [running, key])
  return t
}
