import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import { db, isFirebaseConfigured } from '../../lib/firebase'
import { buildLocalizedPath, buildPublicationPath } from '../../lib/navigation'
import {
  PUBLICATION_CATEGORIES,
  getCoverObjectPosition,
  getPublicationAbstract,
  getPublicationCategoryLabel,
  getPublicationTitle,
  listPublications,
} from '../../lib/publications'
import type { AppLanguage, Publication, PublicationCategory } from '../../types/publication'

interface SiteStats {
  publications: string
  authors: string
  years: string
  categories: string
}

function formatNumber(value: number, language: AppLanguage) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-AU').format(value)
}

function getStatsLabels(language: AppLanguage) {
  return {
    publications: language === 'ar' ? 'إصدار منشور' : 'Publications',
    authors: language === 'ar' ? 'باحث ومؤلف' : 'Researchers',
    years: language === 'ar' ? 'سنة من الخبرة' : 'Years of work',
    categories: language === 'ar' ? 'تصنيفاً بحثياً' : 'Research categories',
  }
}

function computeStats(items: Publication[], language: AppLanguage): SiteStats {
  const publicationsCount = items.length

  const authors = new Set<string>()
  for (const item of items) {
    const a = (item.author_ar || item.author_en || '').trim()
    if (a) authors.add(a)
  }

  let earliestYear = new Date().getFullYear()
  for (const item of items) {
    const stamp = item.published_at || item.created_at
    if (!stamp) continue
    const year = new Date(stamp).getFullYear()
    if (Number.isFinite(year) && year > 1900 && year < earliestYear) {
      earliestYear = year
    }
  }
  const yearsActive = Math.max(1, new Date().getFullYear() - earliestYear + 1)

  const usedCategories = new Set<string>()
  for (const item of items) {
    if (item.category) usedCategories.add(item.category)
  }

  return {
    publications: formatNumber(publicationsCount, language),
    authors: formatNumber(authors.size, language),
    years: formatNumber(yearsActive, language),
    categories: formatNumber(usedCategories.size, language),
  }
}

export function ResearchHomePage({ language }: { language: AppLanguage }) {
  const [items, setItems] = useState<Publication[]>([])
  const [activeCategory, setActiveCategory] = useState<PublicationCategory | 'all'>('all')
  const [email, setEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  useEffect(() => {
    listPublications({ kind: 'all' }).then(setItems).catch(() => setItems([]))
  }, [])

  const stats = useMemo<SiteStats>(() => computeStats(items, language), [items, language])

  const heroFeature = useMemo(() => items.find((item) => item.featured) ?? items[0], [items])
  const spotlight = useMemo(
    () => items.find((item) => item.featured) ?? items[0],
    [items],
  )
  const latest = useMemo(() => items.slice(0, 4), [items])

  const filteredCategories = useMemo(
    () => PUBLICATION_CATEGORIES.slice(0, 9),
    [],
  )

  const statsLabels = getStatsLabels(language)

  const handleNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = email.trim()
    if (!value) {
      return
    }
    setNewsletterStatus('submitting')
    try {
      if (db && isFirebaseConfigured) {
        await addDoc(collection(db, 'newsletter_subscribers'), {
          email: value,
          language,
          created_at: serverTimestamp(),
        })
      }
      setNewsletterStatus('success')
      setEmail('')
    } catch {
      setNewsletterStatus('error')
    }
  }

  return (
    <PublicSiteShell language={language}>
      <section className="home-hero">
        <div className="home-hero__copy">
          <span className="home-badge">
            {language === 'ar' ? 'مركز إسناد للدراسات والأبحاث' : 'Esnad Center for Studies and Research'}
          </span>
          <h1 className="home-hero__title">
            {language === 'ar'
              ? 'مكتبة بحثية عربية للدراسات والأوراق والكتب'
              : 'An Arabic research library for studies, papers, and books'}
          </h1>
          <p className="home-hero__sub">
            {language === 'ar'
              ? 'منصة متخصصة في نشر وأرشفة وبيع الإصدارات البحثية. تجمع بين الوصول المفتوح والمحتوى المدفوع في تجربة تصفح نظيفة ومركزة.'
              : 'A specialized platform for publishing, archiving, and selling research publications.'}
          </p>
          <div className="home-hero__actions">
            <Link className="btn btn--brand" to={buildLocalizedPath(language, '/library')}>
              {language === 'ar' ? 'تصفح المكتبة' : 'Browse library'}
            </Link>
            <Link className="btn btn--brand-outline" to={buildLocalizedPath(language, '/articles')}>
              {language === 'ar' ? 'استكشف المقالات' : 'Explore articles'}
            </Link>
          </div>
        </div>

        {heroFeature ? (
          <Link
            className="home-hero__card"
            to={buildPublicationPath(heroFeature, language)}
          >
            <div className="home-hero__card-media">
              {heroFeature.cover_image ? (
                <img
                  alt={getPublicationTitle(heroFeature, language)}
                  src={heroFeature.cover_image}
                  style={{ objectPosition: getCoverObjectPosition(heroFeature) }}
                />
              ) : (
                <div className="home-hero__card-media-placeholder" />
              )}
            </div>
            <div className="home-hero__card-body">
              <span className="home-tag">
                {getPublicationCategoryLabel(heroFeature.category, language)}
              </span>
              <h3 className="home-hero__card-title">
                {getPublicationTitle(heroFeature, language)}
              </h3>
            </div>
          </Link>
        ) : (
          <div className="home-hero__card home-hero__card--empty" />
        )}
      </section>

      <section className="categories-strip" aria-label={language === 'ar' ? 'التصنيفات' : 'Categories'}>
        <Link
          className={`category-pill${activeCategory === 'all' ? ' category-pill--active' : ''}`}
          to={buildLocalizedPath(language, '/library')}
          onClick={() => setActiveCategory('all')}
        >
          {language === 'ar' ? 'الكل' : 'All'}
        </Link>
        {filteredCategories.map((category) => (
          <Link
            key={category.id}
            className={`category-pill${activeCategory === category.id ? ' category-pill--active' : ''}`}
            to={buildLocalizedPath(language, `/library?category=${category.id}`)}
            onClick={() => setActiveCategory(category.id)}
          >
            {getPublicationCategoryLabel(category.id, language)}
          </Link>
        ))}
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <h2 className="home-section__title">
            {language === 'ar' ? 'أحدث الإصدارات' : 'Latest releases'}
          </h2>
          <Link className="home-section__link" to={buildLocalizedPath(language, '/library')}>
            {language === 'ar' ? 'عرض الكل ←' : 'View all →'}
          </Link>
        </div>
        <div className="latest-grid">
          {latest.map((publication) => (
            <Link
              key={publication.id}
              className="latest-card"
              to={buildPublicationPath(publication, language)}
            >
              <div className="latest-card__media">
                {publication.cover_image ? (
                  <img
                    alt={getPublicationTitle(publication, language)}
                    src={publication.cover_image}
                    style={{ objectPosition: getCoverObjectPosition(publication) }}
                  />
                ) : (
                  <div className="latest-card__media-placeholder" />
                )}
              </div>
              <div className="latest-card__body">
                <span className="home-tag">
                  {getPublicationCategoryLabel(publication.category, language)}
                </span>
                <h3 className="latest-card__title">
                  {getPublicationTitle(publication, language)}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {spotlight ? (
        <section className="spotlight-band">
          <div className="container spotlight-band__inner">
            <div className="spotlight-band__media">
              {spotlight.cover_image ? (
                <img
                  alt={getPublicationTitle(spotlight, language)}
                  src={spotlight.cover_image}
                  style={{ objectPosition: getCoverObjectPosition(spotlight) }}
                />
              ) : null}
            </div>
            <div className="spotlight-band__copy">
              <span className="spotlight-band__eyebrow">
                {language === 'ar' ? 'مختارات المركز' : 'Featured spotlight'}
              </span>
              <h2 className="spotlight-band__title">
                {getPublicationTitle(spotlight, language)}
              </h2>
              <p className="spotlight-band__excerpt">
                {getPublicationAbstract(spotlight, language) ||
                  (language === 'ar'
                    ? 'إصدار مميز من سلسلة دراسات وأوراق المركز.'
                    : 'A featured release from the center.')}
              </p>
              <Link
                className="btn btn--brand"
                to={buildPublicationPath(spotlight, language)}
              >
                {language === 'ar' ? 'اقرأ الإصدار' : 'Read publication'}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="stats-band">
        <div className="stat-block">
          <span className="stat-number">{stats.publications}</span>
          <span className="stat-label">{statsLabels.publications}</span>
        </div>
        <div className="stat-block">
          <span className="stat-number">{stats.authors}</span>
          <span className="stat-label">{statsLabels.authors}</span>
        </div>
        <div className="stat-block">
          <span className="stat-number">{stats.years}</span>
          <span className="stat-label">{statsLabels.years}</span>
        </div>
        <div className="stat-block">
          <span className="stat-number">{stats.categories}</span>
          <span className="stat-label">{statsLabels.categories}</span>
        </div>
      </section>

      <section className="newsletter-strip">
        <h2 className="newsletter-strip__title">
          {language === 'ar' ? 'اشتراك مجاني' : 'Free subscription'}
        </h2>
        <p className="newsletter-strip__sub">
          {language === 'ar'
            ? 'احصل على أحدث الإصدارات والتقارير مباشرة إلى بريدك.'
            : 'Receive the latest releases and reports straight to your inbox.'}
        </p>
        <form className="newsletter-strip__form" onSubmit={handleNewsletter}>
          <input
            className="newsletter-strip__input"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
          />
          <button
            className="btn btn--brand"
            type="submit"
            disabled={newsletterStatus === 'submitting'}
          >
            {language === 'ar' ? 'اشترك' : 'Subscribe'}
          </button>
        </form>
        {newsletterStatus === 'success' ? (
          <p className="newsletter-strip__feedback newsletter-strip__feedback--ok">
            {language === 'ar' ? 'تم الاشتراك بنجاح.' : 'Subscribed successfully.'}
          </p>
        ) : null}
        {newsletterStatus === 'error' ? (
          <p className="newsletter-strip__feedback newsletter-strip__feedback--err">
            {language === 'ar' ? 'تعذر إتمام الاشتراك. حاول لاحقاً.' : 'Subscription failed. Try again.'}
          </p>
        ) : null}
      </section>
    </PublicSiteShell>
  )
}
