import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, DEFAULT_SETTINGS } from '../db'
import { getSession, getStats, type Stats } from '../scheduler'

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [due, setDue] = useState(0)
  const [fresh, setFresh] = useState(0)

  useEffect(() => {
    ;(async () => {
      const now = new Date()
      const settings = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
      const s = await getSession(now, settings)
      setDue(s.reviews.length)
      setFresh(s.newCards.length)
      setStats(await getStats(now))
    })()
  }, [])

  const total = due + fresh
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">مرحباً 👋</h1>
      <div className="card p-6 text-center space-y-3">
        <div className="text-5xl font-bold">{total}</div>
        <div className="muted">
          {due} to review · {fresh} new today
        </div>
        <Link to="/review" className="btn inline-block" style={{ pointerEvents: total ? 'auto' : 'none', opacity: total ? 1 : 0.5 }}>
          {total ? 'Start review' : 'All done for today 🎉'}
        </Link>
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <Tile label="Day streak" value={stats.streak} />
          <Tile label="Mature cards" value={stats.mature} />
          <Tile label="Total reviews" value={stats.totalReviews} />
        </div>
      )}
    </div>
  )
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs muted">{label}</div>
    </div>
  )
}
