import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { NotFoundPage } from '../../pages/public/NotFoundPage'
import { AnalyticsIdentityTracker, AnalyticsPageViewTracker } from '../../components/public/AnalyticsTracker'
import { CookieConsentBanner } from '../../components/public/CookieConsentBanner'
import { PublicSessionProvider, usePublicSession } from '../../contexts/PublicSessionContext'
import { AboutCenterPage } from '../../pages/public/AboutCenterPage'
import { ArticlesPage } from '../../pages/public/ArticlesPage'
import { BooksStorePage } from '../../pages/public/BooksStorePage'
import { ContactCenterPage } from '../../pages/public/ContactCenterPage'
import { LibraryPage } from '../../pages/public/LibraryPage'
import { ResearchHomePage } from '../../pages/public/ResearchHomePage'
import { TopicPage } from '../../pages/public/TopicPage'
const AuthPage = lazy(() => import('../../pages/public/AuthPage').then(module => ({ default: module.AuthPage })))
const DashboardPage = lazy(() => import('../../pages/public/DashboardPage').then(module => ({ default: module.DashboardPage })))
const PublicationPage = lazy(() => import('../../pages/public/PublicationPage').then(module => ({ default: module.PublicationPage })))
const ReaderPage = lazy(() => import('../../reader/pages/ReaderPage').then(module => ({ default: module.ReaderPage })))
let initialPublicationPage: typeof import('../../pages/public/PublicationPage').PublicationPage | null = null
// Keep the server-rendered article visible while its route module downloads.
// eslint-disable-next-line react-refresh/only-export-components
export async function preloadPublicRoute(path: string) {
  if (/^\/(?:en\/)?(?:library|books)\/[^/]+\/?$/.test(path)) initialPublicationPage = (await import('../../pages/public/PublicationPage')).PublicationPage
}

function PublicRoutes() {
  const PublicationRoute = initialPublicationPage || PublicationPage
  return (
    <Suspense fallback={<div className="container" style={{ minHeight: '100vh' }} aria-busy="true">جار التحميل…</div>}><Routes>
      <Route path="/topics/:category" element={<TopicPage />} />
      <Route path="/" element={<ResearchHomePage language="ar" />} />
      <Route path="/en" element={<ResearchHomePage language="en" />} />
      <Route path="/library" element={<LibraryPage language="ar" />} />
      <Route path="/en/library" element={<LibraryPage language="en" />} />
      <Route path="/library/:slug" element={<PublicationRoute language="ar" />} />
      <Route path="/en/library/:slug" element={<PublicationRoute language="en" />} />
      <Route path="/books" element={<BooksStorePage language="ar" />} />
      <Route path="/en/books" element={<BooksStorePage language="en" />} />
      <Route path="/books/:slug" element={<PublicationRoute language="ar" />} />
      <Route path="/en/books/:slug" element={<PublicationRoute language="en" />} />
      <Route path="/articles" element={<ArticlesPage language="ar" />} />
      <Route path="/en/articles" element={<ArticlesPage language="en" />} />
      <Route path="/reader/:slug" element={<ReaderPage />} />
      <Route path="/en/reader/:slug" element={<ReaderPage />} />
      <Route path="/about" element={<AboutCenterPage language="ar" />} />
      <Route path="/en/about" element={<AboutCenterPage language="en" />} />
      <Route path="/contact" element={<ContactCenterPage language="ar" />} />
      <Route path="/en/contact" element={<ContactCenterPage language="en" />} />
      <Route path="/login" element={<AuthPage language="ar" />} />
      <Route path="/register" element={<AuthPage language="ar" />} />
      <Route path="/en/login" element={<AuthPage language="en" />} />
      <Route path="/en/register" element={<AuthPage language="en" />} />
      <Route path="/dashboard" element={<DashboardPage language="ar" />} />
      <Route path="/en/dashboard" element={<DashboardPage language="en" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes></Suspense>
  )
}

function PublicSessionApp() {
  return (
    <PublicSessionProvider>
      <PublicSessionContent />
    </PublicSessionProvider>
  )
}

function PublicSessionContent() {
  const { user } = usePublicSession()

  return (
    <>
      <AnalyticsIdentityTracker user={user} />
      <AnalyticsPageViewTracker />
      <PublicRoutes />
      <CookieConsentBanner />
    </>
  )
}

export default function PublicApp() {
  return (
    <BrowserRouter>
      <PublicSessionApp />
    </BrowserRouter>
  )
}
