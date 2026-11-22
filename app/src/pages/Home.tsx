import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, DEFAULT_SETTINGS } from '../db'
import { getSession, getStats, type Stats } from '../scheduler'
import GardenPanel from '../garden/GardenPanel'
import { gardenTitle, getPlayerName } from '../intro/player'
import Icon, { type IconName } from '../ui/Icon'

function greeting(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [due, setDue] = useState(0)
  const [fresh, setFresh] = useState(0)
  const [counted, setCounted] = useState(false)
  const [name, setName] = useState(getPlayerName)
  useEffect(() => {
    const on = () => setName(getPlayerName())
    window.addEventListener('player-name', on)
    return () => window.removeEventListener('player-name', on)
  }, [])

  useEffect(() => {
    ;(async () => {
      const now = new Date()
      const settings = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
      const s = await getSession(now, settings)
      setDue(s.reviews.length)
      setFresh(s.newCards.length)
      setCounted(true)
      setStats(await getStats(now))
    })()
  }, [])

  const total = due + fresh
  const now = new Date()
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const streak = stats?.streak ?? 0

  return (
    <div className="home">
      <header className="home-head">
        <div className="home-meta">
          <span>{date}</span>
          <span className="ar home-hello" lang="ar">مرحباً</span>
        </div>
        <h1 className="garden-title" data-intro-target>
          {gardenTitle(name)}
        </h1>
      </header>

      <GardenPanel waiting={counted ? due + fresh : null} />

      <section className="card raised hero" aria-label="Today">
        <div className="hero-top">
          <div className="min-w-0">
            <div className="eyebrow">
              {greeting(now)}
              {name ? `, ${name}` : ''}
            </div>
            {counted ? (
              total ? (
                <div className="hero-count-row">
                  <span className="hero-count num">{total}</span>
                  <span className="hero-unit">{total === 1 ? 'word' : 'words'}<br />waiting today</span>
                </div>
              ) : (
                <div className="hero-done">
                  <span className="hero-done-icon"><Icon name="check" size={26} strokeWidth={2.4} /></span>
                  <span>
                    <b>All done for today</b>
                    <small>Your garden is watered. See you tomorrow.</small>
                  </span>
                </div>
              )
            ) : (
              <div className="skeleton" style={{ height: 64, width: 150, marginTop: 6 }} />
            )}
          </div>
          <div className={`streak${streak > 0 ? ' lit' : ''}`} title="Day streak">
            <Icon name="flame" size={20} strokeWidth={1.9} fill="currentColor" fillOpacity={streak > 0 ? 0.25 : 0} />
            <b className="num">{streak}</b>
            <small>{streak === 1 ? 'day' : 'days'}</small>
          </div>
        </div>

        {counted && total > 0 && (
          <div className="hero-split">
            <div>
              <span className="dot" style={{ background: 'var(--accent)' }} />
              <b className="num">{due}</b> to review
            </div>
            <div>
              <span className="dot" style={{ background: 'var(--warm)' }} />
              <b className="num">{fresh}</b> new {fresh === 1 ? 'word' : 'words'}
            </div>
          </div>
        )}

        {total > 0 || !counted ? (
          <Link
            to="/review"
            className="btn lg w-full hero-cta"
            aria-disabled={!counted}
            onClick={(e) => !counted && e.preventDefault()}
          >
            <Icon name="play" size={18} fill="currentColor" strokeWidth={1.4} />
            Start review
          </Link>
        ) : (
          <Link to="/words" className="btn ghost w-full">
            <Icon name="book" size={20} />
            Browse your words
          </Link>
        )}
      </section>

      {stats && (
        <div className="grid grid-cols-3 gap-3 stagger">
          <Tile icon="leaf" label="Mature" value={stats.mature} />
          <Tile icon="sprout" label="Learning" value={stats.learning} color="var(--warm)" />
          <Tile icon="checkCircle" label="Reviews" value={stats.totalReviews} color="var(--sky)" />
        </div>
      )}
    </div>
  )
}

function Tile({ icon, label, value, color }: { icon: IconName; label: string; value: number; color?: string }) {
  return (
    <div className="card stat" style={color ? { ['--c' as string]: color } : undefined}>
      <span className="stat-icon"><Icon name={icon} size={18} /></span>
      <span className="stat-value">{value.toLocaleString()}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
