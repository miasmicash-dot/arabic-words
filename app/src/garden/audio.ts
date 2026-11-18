// Ambient nature sound for the garden (no music). Web Audio is used because iPhone ignores
// <audio> volume. Sound starts only after the first tap anywhere (an iOS rule) and pauses when hidden.
import { useEffect } from 'react'
import type { Weather } from './types'

type Layer = 'birds' | 'wind' | 'crickets' | 'stream'
const LAYERS: Layer[] = ['birds', 'wind', 'crickets', 'stream']
const ONE_SHOTS = ['owl'] as const

const url = (name: string) => `${import.meta.env.BASE_URL}audio/${name}.mp3`

class Engine {
  ctx: AudioContext | null = null
  master: GainNode | null = null
  gains = new Map<string, GainNode>()
  buffers = new Map<string, AudioBuffer>()
  started = new Set<string>()
  target: Record<Layer, number> = { birds: 0, wind: 0, crickets: 0, stream: 0 }
  muted = true
  visible = true
  wantOwl = false
  owlTimer: ReturnType<typeof setTimeout> | null = null
  unlocked = false
  loading: Promise<void> | null = null
  users = 0

  /** Called on the first user gesture. */
  unlock = () => {
    if (this.unlocked) return
    this.unlocked = true
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(this.ctx.destination)
    // a silent buffer played inside the gesture fully unlocks iOS
    const b = this.ctx.createBuffer(1, 1, 22050)
    const s = this.ctx.createBufferSource()
    s.buffer = b
    s.connect(this.ctx.destination)
    s.start(0)
    this.load()
    this.apply()
  }

  load() {
    if (this.loading || !this.ctx) return this.loading
    const ctx = this.ctx
    this.loading = Promise.all(
      [...LAYERS, ...ONE_SHOTS].map(async (name) => {
        try {
          const res = await fetch(url(name))
          if (!res.ok) return
          const data = await res.arrayBuffer()
          const buf = await ctx.decodeAudioData(data)
          this.buffers.set(name, buf)
        } catch {
          /* a missing sound just stays silent */
        }
      }),
    ).then(() => this.apply())
    return this.loading
  }

  startLoop(name: Layer) {
    if (!this.ctx || !this.master || this.started.has(name)) return
    const buf = this.buffers.get(name)
    if (!buf) return
    const g = this.ctx.createGain()
    g.gain.value = 0
    g.connect(this.master)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    // skip the tiny silence an MP3 encoder adds at both ends, so the loop has no gap
    src.loopStart = Math.min(0.06, buf.duration / 4)
    src.loopEnd = Math.max(src.loopStart + 0.5, buf.duration - 0.06)
    src.connect(g)
    // start each loop at a random point so layers never line up the same way
    src.start(0, 0.06 + Math.random() * (buf.duration - 0.2))
    this.gains.set(name, g)
    this.started.add(name)
  }

  playOwl() {
    if (!this.ctx || !this.master) return
    const buf = this.buffers.get('owl')
    if (!buf) return
    const g = this.ctx.createGain()
    g.gain.value = 0.35 + Math.random() * 0.25
    g.connect(this.master)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.connect(g)
    src.start()
  }

  scheduleOwl() {
    if (this.owlTimer) clearTimeout(this.owlTimer)
    this.owlTimer = null
    if (!this.wantOwl) return
    this.owlTimer = setTimeout(() => {
      if (this.wantOwl && this.visible && !this.muted) this.playOwl()
      this.scheduleOwl()
    }, 18000 + Math.random() * 40000)
  }

  apply() {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const audible = !this.muted && this.visible && this.users > 0
    const now = ctx.currentTime
    if (audible) {
      if (ctx.state !== 'running') ctx.resume().catch(() => {})
      for (const name of LAYERS) if (this.target[name] > 0) this.startLoop(name)
    }
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(audible ? 0.9 : 0, now + (audible ? 2.5 : 0.6))
    for (const name of LAYERS) {
      const g = this.gains.get(name)
      if (!g) continue
      g.gain.cancelScheduledValues(now)
      g.gain.setValueAtTime(g.gain.value, now)
      g.gain.linearRampToValueAtTime(this.target[name], now + 4)
    }
    if (!audible) {
      setTimeout(() => {
        if (this.ctx && (this.muted || !this.visible || this.users === 0)) this.ctx.suspend().catch(() => {})
      }, 800)
    }
  }
}

const engine = new Engine()
if (import.meta.env.DEV) (window as unknown as { __gardenAudio: Engine }).__gardenAudio = engine

function mixFor(weather: Weather, night: number): Record<Layer, number> {
  const day = 1 - night
  return {
    birds: weather === 'sunny' ? 0.55 * day : weather === 'partly-cloudy' ? 0.1 * day : 0,
    wind: { sunny: 0.1, 'partly-cloudy': 0.18, overcast: 0.42, drought: 0.12 }[weather] * (1 - night * 0.3),
    crickets: weather === 'drought' ? 0 : (weather === 'overcast' ? 0.12 : 0.4) * Math.max(0, night * 1.4 - 0.4),
    stream: weather === 'drought' ? 0 : 0.12,
  }
}

export function useGardenAudio({ muted, weather, night, visible }: { muted: boolean; weather: Weather; night: number; visible: boolean }) {
  useEffect(() => {
    engine.users++
    const unlock = () => {
      engine.unlock()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchend', unlock)
      window.removeEventListener('keydown', unlock)
    }
    if (!engine.unlocked) {
      window.addEventListener('pointerdown', unlock)
      window.addEventListener('touchend', unlock)
      window.addEventListener('keydown', unlock)
    }
    engine.apply()
    return () => {
      engine.users--
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchend', unlock)
      window.removeEventListener('keydown', unlock)
      engine.apply()
    }
  }, [])

  useEffect(() => {
    engine.muted = muted
    engine.visible = visible
    engine.target = mixFor(weather, night)
    engine.wantOwl = night > 0.6 && (weather === 'sunny' || weather === 'partly-cloudy')
    engine.scheduleOwl()
    engine.apply()
  }, [muted, weather, Math.round(night * 20), visible]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Play one owl hoot now (when the owl is tapped), if sound is on. */
export function playOwlNow() {
  if (!engine.muted && engine.ctx?.state === "running") engine.playOwl()
}
