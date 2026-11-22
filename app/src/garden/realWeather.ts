// The sky in the garden follows the real weather where she is (only if she allows location).
// Forecast from Open-Meteo (free, no account). Position is rounded to ~1 km and the result is cached for an hour.
// This is only for looks: the garden's health comes from studying alone.
import { useEffect, useState } from 'react'

export type SkyWeather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'windy'

const KEY = 'real-weather-v1'
const ON_KEY = 'real-weather-on'
const HOUR = 3_600_000

interface Cached { at: number; sky: SkyWeather; temp?: number; wind?: number; south?: boolean }

/** The rest of the real weather the scene uses for looks: wind (km/h) sways grass, trees and clouds; temperature
 *  (°C) decides how fast settled snow melts; `south` flips the seasons. */
export interface RealConditions { wind?: number; temp?: number; south?: boolean }

export function weatherAllowed(): boolean {
  try { return localStorage.getItem(ON_KEY) === '1' } catch { return false }
}

function read(): Cached | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}

/** WMO weather code + wind (km/h) -> the garden's sky. */
export function skyFromCode(code: number, windKmh: number): SkyWeather {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain'
  if (windKmh >= 30) return 'windy'
  if (code >= 2) return 'cloudy'
  return 'clear'
}

const where = () => new Promise<GeolocationPosition>((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, { maximumAge: 6 * HOUR, timeout: 15000 }))

async function fetchSky(): Promise<Cached | null> {
  const pos = await where()
  const lat = pos.coords.latitude.toFixed(2)
  const lon = pos.coords.longitude.toFixed(2)
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,wind_speed_10m,temperature_2m`)
  if (!res.ok) return null
  const j = await res.json()
  const c = j.current ?? {}
  const out: Cached = { at: Date.now(), sky: skyFromCode(+c.weather_code || 0, +c.wind_speed_10m || 0), temp: c.temperature_2m, wind: c.wind_speed_10m, south: pos.coords.latitude < 0 }
  try { localStorage.setItem(KEY, JSON.stringify(out)) } catch { /* ignore */ }
  window.dispatchEvent(new Event('real-weather-data'))
  return out
}

/** Ask for location (from a tap) and turn real weather on. Resolves to true if it worked. */
export async function enableRealWeather(): Promise<boolean> {
  if (!('geolocation' in navigator)) return false
  try {
    const r = await fetchSky()
    try { localStorage.setItem(ON_KEY, '1') } catch { /* ignore */ }
    window.dispatchEvent(new Event('real-weather'))
    return !!r
  } catch {
    return false
  }
}

export function disableRealWeather() {
  try { localStorage.removeItem(ON_KEY) } catch { /* ignore */ }
  window.dispatchEvent(new Event('real-weather'))
}

/** The current real sky, or 'clear' when location is off or unknown. */
export function useRealWeather(): SkyWeather {
  const [sky, setSky] = useState<SkyWeather>(() => (weatherAllowed() ? read()?.sky : null) ?? 'clear')
  useEffect(() => {
    let live = true
    const refresh = async () => {
      if (!weatherAllowed()) return live && setSky('clear')
      const c = read()
      if (c && Date.now() - c.at < HOUR) return live && setSky(c.sky)
      try {
        const n = await fetchSky()
        if (n && live) setSky(n.sky)
      } catch { /* keep what we have */ }
    }
    refresh()
    const t = setInterval(refresh, 10 * 60_000)
    window.addEventListener('real-weather', refresh)
    return () => {
      live = false
      clearInterval(t)
      window.removeEventListener('real-weather', refresh)
    }
  }, [])
  return sky
}

const conditionsNow = (): RealConditions | null => {
  if (!weatherAllowed()) return null
  const c = read()
  return c ? { wind: c.wind, temp: c.temp, south: c.south } : null
}

/** Real wind, temperature and hemisphere from the last forecast (null when location is off or unknown). */
export function useRealConditions(): RealConditions | null {
  const [c, setC] = useState<RealConditions | null>(conditionsNow)
  useEffect(() => {
    const on = () => setC(conditionsNow())
    window.addEventListener('real-weather', on)
    window.addEventListener('real-weather-data', on)
    const t = setInterval(on, 5 * 60_000)
    return () => {
      window.removeEventListener('real-weather', on)
      window.removeEventListener('real-weather-data', on)
      clearInterval(t)
    }
  }, [])
  return c
}
