// Usage: npx tsx scripts/simulate-activity.ts
// Simulates study personas over 120 days with the real FSRS scheduler and the real garden logic,
// then prints a results table and writes results/simulation.json.
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card } from 'ts-fsrs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { forgottenStats } from '../src/garden/activity'
import { GARDEN } from '../src/garden/config'
import { evaluateDay, newGarden, stageFor } from '../src/garden/state'
import type { Weather } from '../src/garden/types'

const DAYS = 120
const POOL = 400 // cards (about 200 words x 2 directions)
const NEW_PER_DAY = 10
const MAX_REVIEWS = 80

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Persona = { name: string; studies: (d: number, r: () => number) => boolean }
const personas: Persona[] = [
  { name: 'Daily', studies: () => true },
  { name: '5 days a week', studies: (d) => d % 7 < 5 },
  { name: 'Weekends only', studies: (d) => d % 7 >= 5 },
  { name: 'Random 60% of days', studies: (_d, r) => r() < 0.6 },
  { name: 'Daily, 3-day break (day 40)', studies: (d) => !(d >= 40 && d < 43) },
  { name: 'Daily, 1-week break (day 40)', studies: (d) => !(d >= 40 && d < 47) },
  { name: 'Daily, 2-week break (day 40)', studies: (d) => !(d >= 40 && d < 54) },
  { name: 'Daily, 1-month break (day 30)', studies: (d) => !(d >= 30 && d < 60) },
  { name: 'Fades out over 100 days', studies: (d, r) => r() < Math.max(0, 1 - d / 100) },
  { name: 'Cram 14 days then quit', studies: (d) => d < 14 },
  { name: 'Quits after 30 days', studies: (d) => d < 30 },
]

const f = fsrs(generatorParameters({ enable_fuzz: false }))
const DAY = 86_400_000
const key = (t: number) => new Date(t).toISOString().slice(0, 10)

interface Row {
  day: number
  studied: boolean
  weather: Weather
  score: number
  health: number
  forgotten: number
  learned: number
  stage: number
  dead: boolean
}

function run(p: Persona, seed: number) {
  const r = rng(seed)
  const t0 = Date.UTC(2026, 0, 1, 12)
  const cards: Card[] = Array.from({ length: POOL }, () => createEmptyCard(new Date(t0)))
  let introduced = 0
  let g = newGarden(100, key(t0 - DAY), 0)
  const rows: Row[] = []
  for (let d = 0; d < DAYS; d++) {
    const now = new Date(t0 + d * DAY)
    let reviews = 0
    if (p.studies(d, r)) {
      const due = cards
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.state !== State.New && c.due.getTime() <= now.getTime())
        .sort((a, b) => a.c.due.getTime() - b.c.due.getTime())
        .slice(0, MAX_REVIEWS)
      for (const { c, i } of due) {
        const recalled = r() < f.retrievability(c, now)
        cards[i] = f.next(c, now, recalled ? Rating.Good : Rating.Again).card
        reviews++
      }
      for (let k = 0; k < NEW_PER_DAY && introduced < POOL; k++, introduced++) {
        cards[introduced] = f.next(cards[introduced], now, Rating.Good).card
        reviews++
      }
    }
    const end = new Date(t0 + d * DAY + 11 * 3600_000)
    const fs = forgottenStats(cards, end)
    const learned = cards.filter((c) => c.state !== State.New && c.stability >= GARDEN.learnedStabilityDays).length
    const res = evaluateDay(g, { reviewsToday: reviews, forgottenRatio: fs.ratio, learnedTotal: learned, dayKey: key(now.getTime()) })
    g = res.state
    rows.push({
      day: d,
      studied: reviews > 0,
      weather: res.activity.weather,
      score: +res.activity.score.toFixed(3),
      health: +g.health.toFixed(3),
      forgotten: +fs.ratio.toFixed(3),
      learned,
      stage: stageFor(learned, g.goalWords),
      dead: g.dead,
    })
  }
  return rows
}

const out: { persona: string; rows: Row[] }[] = []
console.log('Persona'.padEnd(32), 'Sun Part Over Drou', ' minHealth  died  stage  learned  forgotten@end')
for (const p of personas) {
  const rows = run(p, 42)
  out.push({ persona: p.name, rows })
  const c = (w: Weather) => rows.filter((x) => x.weather === w).length
  const died = rows.find((x) => x.dead)?.day
  const last = rows[rows.length - 1]
  console.log(
    p.name.padEnd(32),
    String(c('sunny')).padStart(3),
    String(c('partly-cloudy')).padStart(4),
    String(c('overcast')).padStart(4),
    String(c('drought')).padStart(4),
    String(Math.min(...rows.map((x) => x.health)).toFixed(2)).padStart(10),
    String(died ?? '-').padStart(5),
    String(last.stage).padStart(6),
    String(last.learned).padStart(8),
    String(last.forgotten).padStart(14),
  )
}
const letter = (r: Row) => (r.dead ? 'X' : { sunny: 'S', 'partly-cloudy': 'P', overcast: 'O', drought: 'D' }[r.weather])
console.log('\nWeather by day (S sunny, P partly cloudy, O overcast, D drought, X dead), days 36-75:')
for (const o of out.filter((x) => /break/.test(x.persona))) {
  console.log(o.persona.padEnd(32), o.rows.slice(36, 76).map(letter).join(''))
}
mkdirSync('results', { recursive: true })
writeFileSync('results/simulation.json', JSON.stringify({ config: GARDEN, days: DAYS, results: out }))
console.log('\nWrote results/simulation.json')

// Human-readable results page
const colors: Record<string, string> = { S: '#f2c230', P: '#9cc0d6', O: '#5b6b7b', D: '#b9854b', X: '#1b1b1b' }
const cells = (rows: Row[], f: (r: Row) => string) =>
  rows.map((r) => `<i style="background:${f(r)}" title="Day ${r.day + 1}: ${r.weather}, score ${r.score}, health ${r.health}${r.studied ? ', studied' : ''}"></i>`).join('')
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Garden activity simulation</title>
<style>body{font:15px system-ui;margin:24px;max-width:1100px;background:#faf7f2;color:#1f2937}h1{margin:0 0 4px}.p{margin:18px 0}.n{font-weight:600}
.s{display:flex;height:22px;margin:4px 0}.s i{flex:1;border-right:1px solid #faf7f2}.m{font-size:12px;color:#6b7280}.k span{display:inline-block;margin-right:14px}.k b{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:4px}</style>
<h1>Garden activity simulation (120 days)</h1><p class="m">Each box is one day. Top strip: weather. Middle strip: plant health (dark = low). Bottom strip: black = she studied that day. Hover a box for details.</p>
<p class="k">${Object.entries({ S: 'Sunny', P: 'Partly cloudy', O: 'Overcast', D: 'Drought', X: 'Plant died' }).map(([k, v]) => `<span><b style="background:${colors[k]}"></b>${v}</span>`).join('')}</p>
${out.map((o) => { const rs = o.rows; const died = rs.find((x) => x.dead)?.day; return `<div class="p"><div class="n">${o.persona}</div>
<div class="s">${cells(rs, (r) => colors[letter(r)])}</div>
<div class="s">${cells(rs, (r) => `hsl(120 ${Math.round(r.health * 60)}% ${Math.round(88 - r.health * 45)}%)`)}</div>
<div class="s">${cells(rs, (r) => (r.studied ? '#222' : '#e5e7eb'))}</div>
<div class="m">${died !== undefined ? `Plant died on day ${died + 1}. ` : 'Plant survived. '}Words learned by day 120: ${rs[rs.length - 1].learned}. Lowest health: ${Math.min(...rs.map((x) => x.health)).toFixed(2)}.</div></div>` }).join('')}`
writeFileSync('results/simulation.html', html)
console.log('Wrote results/simulation.html')
