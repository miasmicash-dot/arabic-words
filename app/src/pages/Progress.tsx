import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getStats, type Stats } from '../scheduler'
import Icon, { type IconName } from '../ui/Icon'

/** The live theme colours (the garden repaints them), resolved so they can go into SVG attributes. */
function useColors() {
  const read = () => {
    const cs = getComputedStyle(document.documentElement)
    const v = (k: string, f: string) => cs.getPropertyValue(k).trim() || f
    return { accent: v('--accent', '#2f8a6a'), warm: v('--warm', '#d48a2c'), sky: v('--sky', '#4a86c8'), muted: v('--muted', '#66766c'), line: v('--line', '#e0e7dc') }
  }
  const [c, setC] = useState(read)
  useEffect(() => {
    // the mood may be painted a moment after this page opens
    const t = setTimeout(() => setC(read()), 400)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setTimeout(() => setC(read()), 50)
    mq.addEventListener('change', on)
    return () => {
      clearTimeout(t)
      mq.removeEventListener('change', on)
    }
  }, [])
  return c
}

const fmtDay = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export default function Progress() {
  const [s, setS] = useState<Stats | null>(null)
  const c = useColors()
  useEffect(() => {
    getStats(new Date()).then(setS)
  }, [])

  const data = useMemo(() => {
    if (!s) return null
    const days = s.reviewsPerDay.slice(-30).map((d) => ({ ...d, label: fmtDay(d.date) }))
    const forecast = s.forecast.map((d) => ({ ...d, label: fmtDay(d.date) }))
    const retention = s.weeklyRetention
      .filter((w) => w.retention !== null)
      .map((w) => ({ label: fmtDay(w.weekStart), pct: Math.round((w.retention as number) * 100), reviews: w.reviews }))
    const month = days.reduce((a, d) => a + d.count, 0)
    const active = days.filter((d) => d.count > 0).length
    const week = forecast.slice(0, 7).reduce((a, d) => a + d.count, 0)
    const lastRet = retention.length ? retention[retention.length - 1].pct : null
    return { days, forecast, retention, month, active, week, lastRet }
  }, [s])

  if (!s || !data) {
    return (
      <div className="space-y-4">
        <header className="page-head"><h1 className="page-title">Progress</h1></header>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 104 }} />)}
        </div>
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    )
  }

  const total = s.newCount + s.learning + s.mature
  const maturity = [
    { name: 'New', value: s.newCount, color: c.muted },
    { name: 'Learning', value: s.learning, color: c.warm },
    { name: 'Mature', value: s.mature, color: c.accent },
  ]

  return (
    <div className="space-y-4">
      <header className="page-head">
        <div>
          <h1 className="page-title">Progress</h1>
          <p className="page-sub">Every review waters your garden.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 stagger">
        <Tile icon="flame" label="Day streak" value={s.streak} unit={s.streak === 1 ? 'day' : 'days'} color={c.warm} />
        <Tile icon="clock" label="Due now" value={s.dueNow} color={c.sky} />
        <Tile icon="checkCircle" label="Total reviews" value={s.totalReviews} />
        <Tile icon="leaf" label="Mature cards" value={s.mature} />
      </div>

      <Panel title="Card maturity" aside={`${total.toLocaleString()} cards`}>
        <div className="mat-bar" role="img" aria-label={maturity.map((m) => `${m.name} ${m.value}`).join(', ')}>
          {maturity.map((m) =>
            m.value > 0 ? <span key={m.name} style={{ flexGrow: m.value, background: m.color }} title={`${m.name}: ${m.value}`} /> : null,
          )}
          {total === 0 && <span style={{ flexGrow: 1, background: c.line }} />}
        </div>
        <div className="mat-legend">
          {maturity.map((m) => (
            <div key={m.name}>
              <span className="dot" style={{ background: m.color }} />
              <span className="mat-name">{m.name}</span>
              <b className="num">{m.value.toLocaleString()}</b>
              <small className="muted num">{total ? Math.round((m.value / total) * 100) : 0}%</small>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Reviews" sub="Last 30 days" aside={`${data.month.toLocaleString()} on ${data.active} ${data.active === 1 ? 'day' : 'days'}`}>
        {data.month === 0 ? (
          <Empty icon="chart" text="Your daily reviews will show here once you start." />
        ) : (
        <Chart>
          <BarChart data={data.days} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid stroke={c.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
            <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: c.line, opacity: 0.5 }} content={(p) => <Tip active={p.active} payload={p.payload} label={p.label} unit="reviews" />} />
            <Bar dataKey="count" fill={c.accent} radius={[4, 4, 0, 0]} maxBarSize={14} />
          </BarChart>
        </Chart>
        )}
      </Panel>

      <Panel title="Recall" sub="Share of reviews remembered, by week" aside={data.lastRet !== null ? `${data.lastRet}% last week` : undefined}>
        {data.retention.length ? (
          <Chart>
            <AreaChart data={data.retention} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="ret-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.sky} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={c.sky} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} unit="%" width={40} tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ stroke: c.muted, strokeDasharray: '3 3' }} content={(p) => <Tip active={p.active} payload={p.payload} label={p.label} unit="%" />} />
              <Area dataKey="pct" type="monotone" stroke={c.sky} strokeWidth={2} fill="url(#ret-fill)" dot={{ r: 3.5, fill: c.sky, stroke: 'var(--card)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </Chart>
        ) : (
          <Empty icon="trend" text="Shows up once your first words come back around for review." />
        )}
      </Panel>

      <Panel title="Coming up" sub="Cards due, next 30 days" aside={`${data.week.toLocaleString()} this week`}>
        {data.forecast.every((d) => d.count === 0) ? (
          <Empty icon="calendar" text="Nothing scheduled yet. Words you study will be planned here." />
        ) : (
        <Chart>
          <BarChart data={data.forecast} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid stroke={c.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
            <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11, fill: c.muted }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: c.line, opacity: 0.5 }} content={(p) => <Tip active={p.active} payload={p.payload} label={p.label} unit="due" />} />
            <Bar dataKey="count" fill={c.warm} radius={[4, 4, 0, 0]} maxBarSize={14} />
          </BarChart>
        </Chart>
        )}
      </Panel>
    </div>
  )
}

function Empty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="chart-empty">
      <Icon name={icon} size={26} />
      <span>{text}</span>
    </div>
  )
}

function Tip({ active, payload, label, unit }: { active?: boolean; payload?: readonly { value?: unknown }[]; label?: unknown; unit: string }) {
  if (!active || !payload?.length) return null
  const v = String(payload[0].value ?? '')
  return (
    <div className="chart-tip">
      <small>{String(label ?? '')}</small>
      <b className="num">
        {v}
        {unit === '%' ? '%' : ` ${unit}`}
      </b>
    </div>
  )
}

function Chart({ children }: { children: React.ReactElement }) {
  return (
    <div className="chart">
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  )
}

function Panel({ title, sub, aside, children }: { title: string; sub?: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="card panel">
      <div className="panel-head">
        <div className="min-w-0">
          <h2 className="panel-title">{title}</h2>
          {sub && <div className="panel-sub">{sub}</div>}
        </div>
        {aside && <div className="panel-aside num">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

function Tile({ icon, label, value, unit, color }: { icon: IconName; label: string; value: number; unit?: string; color?: string }) {
  return (
    <div className="card stat" style={color ? { ['--c' as string]: color } : undefined}>
      <span className="stat-icon"><Icon name={icon} size={18} /></span>
      <span className="stat-value">
        {value.toLocaleString()}
        {unit && <small className="stat-unit"> {unit}</small>}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
