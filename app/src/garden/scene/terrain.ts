// Shape of the land: terrain lines shared by the scenery, the ground effects and the animals.
import { resample, smooth, type P } from './ink'

export const W = 1000
export const H = 720
/** Where the main plant stands. */
export const PLANT_BASE: P = [620, 566]

// ---------- terrain lines ----------

export const LINES = {
  farBack: [[-20, 338], [90, 316], [220, 300], [360, 322], [470, 312], [600, 330], [740, 292], [880, 282], [1020, 306]] as P[],
  far: [[-20, 372], [120, 344], [260, 354], [400, 374], [560, 352], [700, 334], [830, 320], [960, 336], [1020, 344]] as P[],
  mid: [[-20, 402], [100, 392], [230, 404], [380, 430], [520, 452], [700, 446], [860, 428], [1020, 420]] as P[],
  field: [[360, 486], [470, 458], [610, 432], [760, 414], [900, 406], [1020, 404]] as P[],
  midLeft: [[-20, 448], [110, 436], [250, 448], [390, 474], [520, 506]] as P[],
  near: [[-20, 506], [150, 512], [330, 530], [480, 556], [620, 562], [760, 546], [880, 526], [1020, 516]] as P[],
  path: [[-30, 632], [150, 614], [330, 600], [500, 610], [660, 630], [820, 620], [1030, 598]] as P[],
  front: [[-20, 668], [160, 660], [360, 674], [560, 664], [760, 678], [1020, 662]] as P[],
}

/** y of a terrain line at x (linear between resampled points). */
export function yAt(line: P[], x: number): number {
  const s = resample(line, 60)
  for (let i = 0; i < s.length - 1; i++) {
    if (x >= s[i][0] && x <= s[i + 1][0]) {
      const t = (x - s[i][0]) / (s[i + 1][0] - s[i][0] || 1)
      return s[i][1] + (s[i + 1][1] - s[i][1]) * t
    }
  }
  return s[x < s[0][0] ? 0 : s.length - 1][1]
}

export const area = (line: P[], bottom = H + 10) => smooth(line) + `L1030,${bottom} L-30,${bottom} Z`

/** Top and bottom edge of the dirt path (shared with the wet-ground layer). */
export function pathEdges(): { top: P[]; bot: P[] } {
  return {
    top: resample(LINES.path, 40).map(([x, y], i) => [x, y - 13 - Math.sin(i / 4) * 2] as P),
    bot: resample(LINES.path, 40).map(([x, y], i) => [x, y + 15 + Math.cos(i / 5) * 2] as P),
  }
}

