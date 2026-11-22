// Shared contract between the garden logic (state/activity) and the scene art.

/** 1 seed, 2 germination, 3 small stem, 4 first branch, 5 first leaf, 6 few branches,
 *  7 more leaves, 8 full plant, 9 small tree, 10 proper tree, 11 forest. */
export type GrowthStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

/** Sunny: birds + animals. Partly cloudy: no birds/animals. Overcast: dark, no life. Drought: dry, cracked ground. */
export type Weather = 'sunny' | 'partly-cloudy' | 'overcast' | 'drought'

/** A completed or growing tree in the forest (stage 11 scenes draw these around the main plant). */
export interface ForestTree {
  id: string
  /** 0..1 horizontal position in the scene */
  x: number
  /** 0..1 growth of this neighbour tree (0 = seedling, 1 = full tree) */
  growth: number
  /** 0..1 depth: 0 = far background, 1 = foreground */
  depth: number
}

export interface GardenSceneProps {
  stage: GrowthStage
  /** 0 = dying/bare, 1 = thriving. Low values wilt the plant, drop leaves and lose branches. */
  health: number
  /** true when the plant has died: draw a stump / bare dead trunk, no leaves */
  dead: boolean
  /** how well she has been studying lately (from activity): only 'drought' changes the look (dry ground) */
  weather: Weather
  /** the real sky where she is (looks only). Defaults to clear. */
  sky?: 'clear' | 'cloudy' | 'rain' | 'snow' | 'windy'
  /** Local decimal hour 0..24 from the phone clock, e.g. 18.5 = 18:30. Drives sun, moon, stars, dusk. */
  timeOfDay: number
  /** Neighbour trees for stage 11 and for finished past goals. */
  trees: ForestTree[]
  /** Sound is allowed only after the first user tap on iOS. */
  muted: boolean
  /** Increment to play a short watering/celebration animation (e.g. after a review session). */
  waterPulse?: number
  /** Called when the scene wants to show a celebration (stage-up). Optional. */
  onTap?: () => void
  /** Playground-only overrides for trying every look. */
  dev?: GardenDevOptions
}

export interface GardenDevOptions {
  /** auto = about one clear night in three */
  aurora?: 'auto' | 'on' | 'off'
  /** use the GPU sky (default true when available) */
  shader?: boolean
  /** 0 = new moon, 0.5 = full moon; undefined = today's real phase */
  moonPhase?: number
  /** pretend it is this day (YYYY-MM-DD) for the day-to-day stories */
  today?: string
  /** storage key for the day-to-day stories (the playground keeps its own) */
  eggsKey?: string
  /** change to send this animal on stage now with its story (any id in the cast, e.g. 'rabbit', 'owl', 'duck') */
  story?: { sp: string; id: number }
  /** no automatic visitors: only the ones the playground sends */
  quiet?: boolean
  /** told whenever the wildlife director changes what is on stage */
  onDirector?: (s: DirectorSnapshot) => void
  /** change to make the squirrel come now and bury today's nut */
  squirrel?: number
  /** pretend a cloud covers this much of the sun (0..1), to see the light shafts */
  occlusion?: number
  /** change to show a hidden secret now */
  egg?: { kind: 'rainbow' | 'hearts' | 'hay' | 'clover'; id: number }
  /** change to reload the stories from storage (after a reset) */
  eggsVersion?: number
}

/** What the wildlife director has on stage (for the playground). Times are Date.now() milliseconds. */
export interface DirectorSnapshot {
  visits: { id: number; sp: string; slot: string; at: number }[]
  quiet: Record<string, number>
  caps: Record<string, number>
  total: number
  mode: string
  life: number
}
