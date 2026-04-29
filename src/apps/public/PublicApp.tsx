import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PublicSessionProvider } from '../../contexts/PublicSessionContext'
import { AboutCenterPage } from '../../pages/public/AboutCenterPage'
import { AuthPage } from '../../pages/public/AuthPage'
import { ArticlesPage } from '../../pages/public/ArticlesPage'
import { BooksStorePage } from '../../pages/public/BooksStorePage'
import { ContactCenterPage } from '../../pages/public/ContactCenterPage'
import { DashboardPage } from '../../pages/public/DashboardPage'
import { LibraryPage } from '../../pages/public/LibraryPage'
import { PublicationPage } from '../../pages/public/PublicationPage'
import { ResearchHomePage } from '../../pages/public/ResearchHomePage'
import { ReaderPage } from '../../reader/pages/ReaderPage'

export default function PublicApp() {
  return (
    <BrowserRouter>
      <PublicSessionProvider>
        <Routes>
          <Route path="/" element={<ResearchHomePage language="ar" />} />
          <Route path="/en" element={<ResearchHomePage language="en" />} />
          <Route path="/library" element={<LibraryPage language="ar" />} />
          <Route path="/en/library" element={<LibraryPage language="en" />} />
          <Route path="/library/:slug" element={<PublicationPage language="ar" />} />
          <Route path="/en/library/:slug" element={<PublicationPage language="en" />} />
          <Route path="/books" element={<BooksStorePage language="ar" />} />
          <Route path="/en/books" element={<BooksStorePage language="en" />} />
          <Route path="/books/:slug" element={<PublicationPage language="ar" />} />
          <Route path="/en/books/:slug" element={<PublicationPage language="en" />} />
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
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </PublicSessionProvider>
    </BrowserRouter>
  )
}
