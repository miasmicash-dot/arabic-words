// The whole app takes its colours from the garden: lush and bright when it thrives, grey and flat when it is
// neglected, sandy in a drought. The last mood is remembered so every page opens in the right colours.
import { mix } from './scene/ink'
import type { Weather } from './types'

export type Mood = 'lush' | 'fair' | 'grey' | 'drought' | 'dead'

export interface MoodState {
  mood: Mood
  /** 0 = dead and grey, 1 = thriving */
  vibe: number
}

export function moodOf(s: { health: number; dead: boolean; weather: Weather } | null): MoodState {
  if (!s) return { mood: 'fair', vibe: 0.8 }
  if (s.dead) return { mood: 'dead', vibe: 0 }
  const cap = { sunny: 1, 'partly-cloudy': 0.8, overcast: 0.5, drought: 0.4 }[s.weather]
  const vibe = Math.max(0, Math.min(1, Math.min(s.health, cap)))
  const mood: Mood = s.weather === 'drought' ? 'drought' : vibe >= 0.8 ? 'lush' : vibe >= 0.5 ? 'fair' : 'grey'
  return { mood, vibe }
}

type Vars = { bg: string; card: string; ink: string; muted: string; accent: string; line: string; glow: string }

// colour sets at vibe 1 (lush), 0.7 (fair), 0.4 (grey) and 0 (dead); drought is blended in on top
const LIGHT: Record<'lush' | 'fair' | 'grey' | 'dead' | 'drought', Vars> = {
  lush: { bg: '#f1f9ea', card: '#ffffff', ink: '#1d2a21', muted: '#5d7965', accent: '#23935a', line: '#d6ebcf', glow: '#cfeeb9' },
  fair: { bg: '#f6f8f1', card: '#ffffff', ink: '#1f2925', muted: '#66766c', accent: '#2f8a6a', line: '#e0e7dc', glow: '#e3efd6' },
  grey: { bg: '#eef0f0', card: '#f8f9f9', ink: '#2a2f33', muted: '#7a8185', accent: '#5f817d', line: '#dbdfe0', glow: '#e3e6e7' },
  dead: { bg: '#e3e3e1', card: '#efefed', ink: '#33353a', muted: '#86888b', accent: '#77797d', line: '#d0d1d0', glow: '#dadad8' },
  drought: { bg: '#f5ead4', card: '#fcf6ea', ink: '#3a2f22', muted: '#8a785e', accent: '#b5742f', line: '#e8d9bc', glow: '#f2d5a0' },
}
const DARK: typeof LIGHT = {
  lush: { bg: '#0e1a12', card: '#15251b', ink: '#e5f3e8', muted: '#93b49c', accent: '#45c47c', line: '#23392a', glow: '#1c3b25' },
  fair: { bg: '#111916', card: '#18221e', ink: '#e3ece6', muted: '#97aa9f', accent: '#3db48a', line: '#26332c', glow: '#1a2c22' },
  grey: { bg: '#15181a', card: '#1d2124', ink: '#d5d9db', muted: '#8d9498', accent: '#76a09a', line: '#2b3034', glow: '#1d2225' },
  dead: { bg: '#151515', card: '#1d1d1e', ink: '#cdcdcd', muted: '#888888', accent: '#8a8a8a', line: '#2b2b2c', glow: '#1a1a1a' },
  drought: { bg: '#1b150f', card: '#251d15', ink: '#ecdfcb', muted: '#ad987a', accent: '#d69a4f', line: '#3a2e21', glow: '#3a2a16' },
}

function blend(a: Vars, b: Vars, t: number): Vars {
  const o = {} as Vars
  for (const k of Object.keys(a) as (keyof Vars)[]) o[k] = mix(a[k], b[k], t)
  return o
}

function varsFor(m: MoodState, dark: boolean): Vars {
  const set = dark ? DARK : LIGHT
  const v = m.vibe
  let base: Vars
  if (m.mood === 'dead') base = set.dead
  else if (v >= 0.7) base = blend(set.fair, set.lush, (v - 0.7) / 0.3)
  else if (v >= 0.4) base = blend(set.grey, set.fair, (v - 0.4) / 0.3)
  else base = blend(set.dead, set.grey, v / 0.4)
  return m.mood === 'drought' ? blend(base, set.drought, 0.8) : base
}

const KEY = 'garden-mood'
let current: MoodState = loadMood()

function loadMood(): MoodState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (v && typeof v.vibe === 'number' && typeof v.mood === 'string') return v
  } catch {
    /* storage can be unavailable */
  }
  return { mood: 'fair', vibe: 0.8 }
}

/** The mood the app is showing right now. */
export function currentMood(): MoodState {
  return current
}

function paint(m: MoodState) {
  if (typeof document === 'undefined') return
  const dark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  const v = varsFor(m, dark)
  const root = document.documentElement
  for (const [k, val] of Object.entries(v)) root.style.setProperty(`--${k}`, val)
  root.dataset.mood = m.mood
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', v.bg)
}

/** Paint the app in the garden's colours. `remember` = false for previews (the playground). */
export function applyMood(m: MoodState, remember = true) {
  if (remember) {
    current = m
    try {
      localStorage.setItem(KEY, JSON.stringify(m))
    } catch {
      /* ignore */
    }
  }
  paint(m)
}

/** Go back to the real garden's colours (after a preview). */
export function restoreMood() {
  paint(current)
}

/** Call once at start-up: paints the remembered mood straight away and follows light/dark changes. */
export function initTheme() {
  paint(current)
  if (typeof matchMedia !== 'undefined') matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => paint(current))
}
