import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePublicSession } from '../../contexts/PublicSessionContext'
import { buildLocalizedPath } from '../../lib/navigation'
import type { AppLanguage } from '../../types/publication'

function getNavItems(language: AppLanguage) {
  return [
    { path: '/', label: language === 'ar' ? 'الرئيسية' : 'Home' },
    { path: '/library', label: language === 'ar' ? 'المكتبة' : 'Library' },
    { path: '/articles', label: language === 'ar' ? 'مقالات' : 'Articles' },
    { path: '/about', label: language === 'ar' ? 'من نحن' : 'About' },
  ]
}

export function PublicSiteShell({
  language,
  children,
}: {
  language: AppLanguage
  children: ReactNode
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOutUser } = usePublicSession()
  const navItems = getNavItems(language)
  const [searchValue, setSearchValue] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileNavOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [mobileNavOpen])

  const alternateLanguage = language === 'ar' ? 'en' : 'ar'
  const alternatePath =
    language === 'ar'
      ? `/en${location.pathname === '/' ? '' : location.pathname}${location.search}`
      : `${location.pathname.replace(/^\/en/, '') || '/'}${location.search}`

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchValue.trim()
    const target = buildLocalizedPath(language, '/library')
    navigate(query ? `${target}?q=${encodeURIComponent(query)}` : target)
  }

  return (
    <div className="page" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="header">
        <div className="container header__inner">
          <Link
            className="brand-lockup"
            to={buildLocalizedPath(language, '/')}
            aria-label={language === 'ar' ? 'مركز إسناد للدراسات والأبحاث' : 'Esnad Center for Studies and Research'}
          >
            <img
              className="brand-lockup__logo"
              src="/newlogo.png"
              alt={language === 'ar' ? 'شعار مركز إسناد' : 'Esnad logo'}
            />
            <span className="brand-lockup__text">
              <span className="brand-lockup__name">
                {language === 'ar' ? 'مركز إسناد' : 'Esnad Center'}
              </span>
              <span className="brand-lockup__sub">
                {language === 'ar' ? 'للدراسات والأبحاث' : 'for Studies and Research'}
              </span>
            </span>
          </Link>

          <nav className="nav">
            {navItems.map((item) => {
              const href = buildLocalizedPath(language, item.path)
              const active =
                href === buildLocalizedPath(language, '/')
                  ? location.pathname === href
                  : location.pathname === href || location.pathname.startsWith(`${href}/`)
              return (
                <Link className={`nav__link${active ? ' nav__link--active' : ''}`} key={item.path} to={href}>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <button
            className="header__menu-toggle"
            type="button"
            aria-label={language === 'ar' ? 'القائمة' : 'Menu'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="header__actions">
            <form className="header__search" onSubmit={handleSearchSubmit}>
              <input
                className="header__search-input"
                type="search"
                placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </form>

            <button
              className="header__lang-toggle"
              onClick={() => navigate(alternatePath)}
              type="button"
            >
              {alternateLanguage.toUpperCase()}
            </button>

            {user ? (
              <>
                <Link className="btn btn--brand btn--sm" to={buildLocalizedPath(language, '/dashboard')}>
                  {language === 'ar' ? 'حسابي' : 'Account'}
                </Link>
                <button className="btn btn--ghost btn--sm" onClick={() => void signOutUser()} type="button">
                  {language === 'ar' ? 'خروج' : 'Sign out'}
                </button>
              </>
            ) : (
              <Link className="btn btn--brand btn--sm" to={buildLocalizedPath(language, '/login')}>
                {language === 'ar' ? 'دخول' : 'Login'}
              </Link>
            )}
          </div>
        </div>
      </header>

      {mobileNavOpen ? (
        <div
          className="mobile-drawer__backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`mobile-drawer${mobileNavOpen ? ' mobile-drawer--open' : ''}`}
        aria-hidden={!mobileNavOpen}
      >
        <nav className="mobile-drawer__nav">
          {navItems.map((item) => {
            const href = buildLocalizedPath(language, item.path)
            const active =
              href === buildLocalizedPath(language, '/')
                ? location.pathname === href
                : location.pathname === href || location.pathname.startsWith(`${href}/`)
            return (
              <Link
                className={`mobile-drawer__link${active ? ' mobile-drawer__link--active' : ''}`}
                key={item.path}
                to={href}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mobile-drawer__actions">
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => {
              setMobileNavOpen(false)
              navigate(alternatePath)
            }}
          >
            {alternateLanguage.toUpperCase()}
          </button>
          {user ? (
            <>
              <Link
                className="btn btn--brand btn--sm"
                to={buildLocalizedPath(language, '/dashboard')}
              >
                {language === 'ar' ? 'حسابي' : 'Account'}
              </Link>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => void signOutUser()}
                type="button"
              >
                {language === 'ar' ? 'خروج' : 'Sign out'}
              </button>
            </>
          ) : (
            <Link
              className="btn btn--brand btn--sm"
              to={buildLocalizedPath(language, '/login')}
            >
              {language === 'ar' ? 'دخول' : 'Login'}
            </Link>
          )}
        </div>
      </aside>

      <main className="main">
        <div className="container">{children}</div>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__brand">
            <strong>Esnad</strong>
            <p>
              {language === 'ar'
                ? 'مركز إسناد للدراسات والأبحاث'
                : 'Esnad Center for Studies and Research'}
            </p>
          </div>
          <div className="footer__links">
            <Link to={buildLocalizedPath(language, '/library')}>
              {language === 'ar' ? 'المكتبة' : 'Library'}
            </Link>
            <Link to={buildLocalizedPath(language, '/articles')}>
              {language === 'ar' ? 'مقالات' : 'Articles'}
            </Link>
            <Link to={buildLocalizedPath(language, '/about')}>
              {language === 'ar' ? 'من نحن' : 'About'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
