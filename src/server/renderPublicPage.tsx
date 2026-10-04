import { renderToString } from 'react-dom/server'
import { Suspense } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PublicSessionProvider } from '../contexts/PublicSessionContext'
import { CookieConsentBanner } from '../components/public/CookieConsentBanner'
import { ResearchHomePage } from '../pages/public/ResearchHomePage'
import { PublicationPage } from '../pages/public/PublicationPage'
import type { AppLanguage, Publication } from '../types/publication'
export function renderPublicPage({path, language, publications, publication}: {path:string; language:AppLanguage; publications?:Publication[]; publication?:Publication}) {
  return renderToString(<MemoryRouter initialEntries={[path]}><PublicSessionProvider>
    <Suspense fallback={<div className="container" style={{ minHeight: '100vh' }} aria-busy="true">جار التحميل…</div>}><Routes>
      <Route path="/" element={<ResearchHomePage language={language} initialPublications={publications} />} />
      <Route path="/en" element={<ResearchHomePage language={language} initialPublications={publications} />} />
      <Route path="/library/:slug" element={<PublicationPage language={language} initialPublication={publication} />} />
      <Route path="/en/library/:slug" element={<PublicationPage language={language} initialPublication={publication} />} />
      <Route path="/books/:slug" element={<PublicationPage language={language} initialPublication={publication} />} />
      <Route path="/en/books/:slug" element={<PublicationPage language={language} initialPublication={publication} />} />
    </Routes></Suspense>
    <CookieConsentBanner />
  </PublicSessionProvider></MemoryRouter>)
}
