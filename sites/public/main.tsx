import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/public-fonts.css'
import PublicApp, { preloadPublicRoute } from '../../src/apps/public/PublicApp'

async function mountApp() {
await preloadPublicRoute(window.location.pathname)
const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <PublicApp />
  </StrictMode>
)
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
}
void mountApp()
