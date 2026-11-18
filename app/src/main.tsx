import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@fontsource/great-vibes/400.css'
import '@fontsource/dancing-script/600.css'
import '@fontsource/caveat/500.css'
import '@fontsource/rock-salt/400.css'
import App from './App.tsx'
import { initTheme } from './garden/theme'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
