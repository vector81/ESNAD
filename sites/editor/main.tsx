import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import 'react-quill/dist/quill.snow.css'
import '../../src/index.css'
import { AdminApp } from '../../src/apps/admin/AdminApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <AdminApp />
    </HelmetProvider>
  </StrictMode>,
)
