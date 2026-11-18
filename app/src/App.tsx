import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { boot } from './boot'
import Home from './pages/Home'
import Review from './pages/Review'
import Progress from './pages/Progress'
import Words from './pages/Words'
import Settings from './pages/Settings'

const GardenPreview = lazy(() => import('./pages/GardenPreview'))

const tabs = [
  ['/', 'Home'],
  ['/progress', 'Progress'],
  ['/words', 'Words'],
  ['/settings', 'Settings'],
] as const

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    boot().then(() => setReady(true))
  }, [])
  if (!ready) return <p className="p-6 muted">Loading…</p>
  return (
    <HashRouter>
      <div className="mx-auto max-w-xl px-4 pt-4 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/review" element={<Review />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/words" element={<Words />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/garden-preview" element={<Suspense fallback={null}><GardenPreview /></Suspense>} />
        </Routes>
      </div>
      <nav
        className="fixed bottom-0 inset-x-0 flex justify-around border-t"
        style={{ background: 'var(--card)', borderColor: 'var(--line)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end
            className="py-3 px-2 text-sm font-semibold"
            style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--muted)' })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </HashRouter>
  )
}
