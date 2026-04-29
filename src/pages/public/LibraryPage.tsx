import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PublicationCard } from '../../components/public/PublicationCard'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import {
  PUBLICATION_CATEGORIES,
  PUBLICATION_KINDS,
  getPublicationCategoryLabel,
  getPublicationKindLabel,
  listPublications,
} from '../../lib/publications'
import type {
  AccessTier,
  AppLanguage,
  Publication,
  PublicationCategory,
  PublicationKind,
} from '../../types/publication'

export function LibraryPage({ language }: { language: AppLanguage }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Publication[]>([])
  const [loading, setLoading] = useState(true)

  const category = (searchParams.get('category') as PublicationCategory | 'all' | null) ?? 'all'
  const accessTier = (searchParams.get('access') as AccessTier | 'all' | null) ?? 'all'
  const kind = (searchParams.get('kind') as PublicationKind | 'all' | null) ?? 'all'
  const topic = searchParams.get('topic') ?? ''
  const search = searchParams.get('q') ?? ''

  useEffect(() => {
    setLoading(true)
    listPublications({
      category,
      access_tier: accessTier,
      kind: 'all',
      topic,
      search,
    })
      .then(setItems)
      .finally(() => setLoading(false))
  }, [accessTier, category, search, topic])

  const kindCounts = useMemo(() => {
    const base: Record<PublicationKind | 'all', number> = {
      all: items.length,
      article: 0,
      'research-paper': 0,
      book: 0,
    }
    for (const item of items) {
      base[item.kind] = (base[item.kind] ?? 0) + 1
    }
    return base
  }, [items])

  const visibleItems = useMemo(
    () => (kind === 'all' ? items : items.filter((item) => item.kind === kind)),
    [items, kind],
  )

  const setKindParam = (next: PublicationKind | 'all') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('kind')
    else params.set('kind', next)
    setSearchParams(params)
  }

  const topicOptions = useMemo(
    () =>
      [...new Set(items.map((item) => (language === 'ar' ? item.topic_ar : item.topic_en)).filter(Boolean))].slice(0, 8),
    [items, language],
  )

  return (
    <PublicSiteShell language={language}>
      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">{language === 'ar' ? 'المكتبة' : 'Library'}</span>
            <h1 className="title-2">{language === 'ar' ? 'الأرشيف البحثي' : 'Research archive'}</h1>
          </div>
        </div>

        <div className="filters">
          <label className="field">
            <span>{language === 'ar' ? 'بحث' : 'Search'}</span>
            <input
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) {
                  next.set('q', event.target.value)
                } else {
                  next.delete('q')
                }
                setSearchParams(next)
              }}
              placeholder={language === 'ar' ? 'عنوان، كاتب، موضوع...' : 'Title, author, topic...'}
              value={search}
            />
          </label>

          <label className="field">
            <span>{language === 'ar' ? 'التصنيف' : 'Category'}</span>
            <select
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value === 'all') {
                  next.delete('category')
                } else {
                  next.set('category', event.target.value)
                }
                setSearchParams(next)
              }}
              value={category}
            >
              <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All categories'}</option>
              {PUBLICATION_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {getPublicationCategoryLabel(item.id, language)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{language === 'ar' ? 'الوصول' : 'Access'}</span>
            <select
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value === 'all') {
                  next.delete('access')
                } else {
                  next.set('access', event.target.value)
                }
                setSearchParams(next)
              }}
              value={accessTier}
            >
              <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
              <option value="free">{language === 'ar' ? 'مجاني' : 'Free'}</option>
              <option value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</option>
            </select>
          </label>

          <label className="field">
            <span>{language === 'ar' ? 'الموضوع' : 'Topic'}</span>
            <input
              list="topics-list"
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) {
                  next.set('topic', event.target.value)
                } else {
                  next.delete('topic')
                }
                setSearchParams(next)
              }}
              placeholder={language === 'ar' ? 'الأمن، القانون...' : 'Security, law...'}
              value={topic}
            />
            <datalist id="topics-list">
              {topicOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="kind-pills">
          <button
            type="button"
            className={`kind-pill kind-pill--all${kind === 'all' ? ' kind-pill--active' : ''}`}
            onClick={() => setKindParam('all')}
          >
            <span>{language === 'ar' ? 'الكل' : 'All'}</span>
            <span className="kind-pill__count">{kindCounts.all}</span>
          </button>
          {PUBLICATION_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={`kind-pill kind-pill--${k}${kind === k ? ' kind-pill--active' : ''}`}
              onClick={() => setKindParam(k)}
            >
              <span>{getPublicationKindLabel(k, language)}</span>
              <span className="kind-pill__count">{kindCounts[k]}</span>
            </button>
          ))}
        </div>

        <div className="results-bar">
          <strong className="results-bar__count">
            {language === 'ar' ? `عدد النتائج: ${visibleItems.length}` : `${visibleItems.length} results`}
          </strong>
        </div>

        {loading ? (
          <div className="empty">{language === 'ar' ? 'جار التحميل...' : 'Loading...'}</div>
        ) : visibleItems.length === 0 ? (
          <div className="empty">
            {language === 'ar'
              ? 'لا توجد نتائج مطابقة للفلاتر الحالية.'
              : 'No publications match the current filters.'}
          </div>
        ) : (
          <div className="grid-3">
            {visibleItems.map((publication) => (
              <PublicationCard key={publication.id} language={language} publication={publication} />
            ))}
          </div>
        )}
      </section>
    </PublicSiteShell>
  )
}
