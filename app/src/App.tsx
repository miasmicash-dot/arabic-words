import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { boot } from './boot'
import Home from './pages/Home'
import Review from './pages/Review'
import Progress from './pages/Progress'
import Words from './pages/Words'
import Settings from './pages/Settings'
import Intro from './intro/Intro'
import { syncGarden } from './garden/service'
import { applyMood, moodOf } from './garden/theme'
import Icon, { type IconName } from './ui/Icon'
import './App.css'
import './ui/screens.css'

const GardenPreview = lazy(() => import('./pages/GardenPreview'))

const tabs: readonly (readonly [string, string, IconName])[] = [
  ['/', 'Home', 'home'],
  ['/words', 'Words', 'book'],
  ['/progress', 'Progress', 'chart'],
  ['/settings', 'Settings', 'gear'],
]

/** Pages that take the whole screen, without the tab bar. */
const FOCUS = ['/review', '/garden-preview']

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    boot().then(() => {
      setReady(true)
      // paint every page in the garden's current colours, whichever page the app opens on
      // (Home does this itself)
      const home = location.hash === '' || location.hash === '#/' || location.hash.startsWith('#/?')
      if (!home) syncGarden(new Date()).then((v) => applyMood(moodOf(v?.state ?? null)), () => {})
    })
  }, [])
  return (
    <>
      {/* the intro stays mounted while the app loads underneath it */}
      <Intro />
      {ready ? (
        <Main />
      ) : (
        <div className="app-loading" aria-busy="true" aria-label="Loading">
          <Icon name="sprout" size={34} />
        </div>
      )}
    </>
  )
}

function Main() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}

function Shell() {
  const loc = useLocation()
  const focus = FOCUS.includes(loc.pathname)
  // a new page starts at the top
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [loc.pathname])
  return (
    <>
      <main className={`app-main${focus ? ' app-focus' : ''}`}>
        <div key={loc.pathname} className="page-enter">
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/review" element={<Review />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/words" element={<Words />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/garden-preview" element={<Suspense fallback={null}><GardenPreview /></Suspense>} />
          </Routes>
        </div>
      </main>
      {!focus && (
        <nav className="tabbar" aria-label="Main">
          <div className="tabbar-inner glass">
            {tabs.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => `tab${isActive ? ' on' : ''}`}>
                {({ isActive }) => (
                  <>
                    <span className="tab-icon">
                      <Icon name={icon} size={24} strokeWidth={isActive ? 2 : 1.8} fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.16 : 0} />
                    </span>
                    <span className="tab-label">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}
