import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mobile.css'
import './grid.css'
import './symbols.css'
import './equal-symbols.css'
import './multi.css'
import './length-fix.css'
import './multi-detail.css'
import './colors.css'
import './mega.css'
import './carousel.css'
import './iphone-preview.css'
import './iphone-scroll.css'
import './header-tabs-fix.css'
import './language.css'
import './feed-end.css'
import './drama.css'
import './challenge-results.css'
import './auth.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
