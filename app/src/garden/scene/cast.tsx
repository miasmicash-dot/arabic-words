// Everyone who can visit the garden, and the piece of the scene that draws whoever the director has on stage.
import type { Mode, Slot, Visit } from './director'
import { allowed, type Env } from './director'
import type { Ctx, Layer, Species } from './kit'
import { SMALL } from './species-small'
import { WALKERS } from './species-walkers'
import { WILD } from './species-wild'

export const CAST: Record<string, Species> = { ...WALKERS, ...SMALL, ...WILD }

/** Species drawn in the garden, for the count and the playground. */
export const SPECIES = Object.values(CAST).map((s) => s.name).filter((n) => n !== 'horse at the apples' && n !== 'a chase')

export function Cast({ layer, visits, ctx, onDone }: { layer: Layer; visits: Visit[]; ctx: Ctx; onDone: (id: number) => void }) {
  return (
    <>
      {visits.map((v) => {
        const sp = CAST[v.sp]
        if (!sp || sp.layer !== layer) return null
        const C = sp.Comp
        return <C key={v.id} seed={v.seed} ctx={ctx} onDone={() => onDone(v.id)} />
      })}
    </>
  )
}

/**
 * Reduced motion: a calm still picture instead of stories. A couple of visitors, chosen by the day, standing in a
 * quiet moment of their story.
 */
export function stillVisits(env: Env, day: string): Visit[] {
  let h = 0
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) | 0
  const want: [Slot, string[]][] =
    env.mode === 'night'
      ? [['near', ['owl']], ['walker', ['hedgehog']]]
      : [['walker', ['rabbit', 'nova', 'hedgehog', 'fox']], ['near', ['robin', 'ladybird', 'painted butterfly', 'dove']]]
  const out: Visit[] = []
  for (const [slot, ids] of want) {
    const ok = ids.filter((id) => CAST[id] && allowed(CAST[id], env))
    if (!ok.length) continue
    const sp = ok[Math.abs(h) % ok.length]
    out.push({ id: out.length + 1, sp, slot, seed: Math.abs(h) + out.length, at: 0 })
  }
  return out
}

export function modeOf(night: number): Mode {
  return night > 0.6 ? 'night' : night < 0.5 ? 'day' : 'dusk'
}
