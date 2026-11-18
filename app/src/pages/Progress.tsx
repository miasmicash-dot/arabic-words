import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getStats, type Stats } from '../scheduler'

export default function Progress() {
  const [s, setS] = useState<Stats | null>(null)
  useEffect(() => {
    getStats(new Date()).then(setS)
  }, [])
  if (!s) return <p className="muted">Loading…</p>

  const maturity = [
    { name: 'New', value: s.newCount },
    { name: 'Learning', value: s.learning },
    { name: 'Mature', value: s.mature },
  ]
  const days = s.reviewsPerDay.slice(-30).map((d) => ({ ...d, label: d.date.slice(5) }))
  const forecast = s.forecast.map((d) => ({ ...d, label: d.date.slice(5) }))
  const retention = s.weeklyRetention
    .filter((w) => w.retention !== null)
    .map((w) => ({ label: w.weekStart.slice(5), pct: Math.round((w.retention as number) * 100) }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Tile label="Streak" value={`${s.streak}d`} />
        <Tile label="Reviews" value={s.totalReviews} />
        <Tile label="Due now" value={s.dueNow} />
      </div>
      <Panel title="Card maturity">
        <div className="grid grid-cols-3 gap-2 text-center">
          {maturity.map((m) => (
            <div key={m.name}>
              <div className="text-xl font-bold">{m.value}</div>
              <div className="text-xs muted">{m.name}</div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Reviews, last 30 days">
        <Chart>
          <BarChart data={days}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#0f766e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </Chart>
      </Panel>
      <Panel title="Retention by week (%)">
        {retention.length ? (
          <Chart>
            <LineChart data={retention}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} width={28} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line dataKey="pct" stroke="#2563eb" strokeWidth={2} dot />
            </LineChart>
          </Chart>
        ) : (
          <p className="muted text-sm">Shows up after your first review-day cards come back around.</p>
        )}
      </Panel>
      <Panel title="Forecast: cards due, next 30 days">
        <Chart>
          <BarChart data={forecast}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#d97706" radius={[3, 3, 0, 0]} />
          </BarChart>
        </Chart>
      </Panel>
    </div>
  )
}

function Chart({ children }: { children: React.ReactElement }) {
  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  )
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 space-y-2">
      <div className="font-semibold text-sm">{title}</div>
      {children}
    </div>
  )
}
function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs muted">{label}</div>
    </div>
  )
}
