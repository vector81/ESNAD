import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import PublicApp from '../../src/apps/public/PublicApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicApp />
  </StrictMode>,
)
