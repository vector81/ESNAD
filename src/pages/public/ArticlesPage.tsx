import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PublicationCard } from '../../components/public/PublicationCard'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import { listPublications } from '../../lib/publications'
import type { AppLanguage, Publication } from '../../types/publication'

export function ArticlesPage({ language }: { language: AppLanguage }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [results, setResults] = useState<{
    key: string
    items: Publication[]
    loaded: boolean
  }>({ key: '', items: [], loaded: false })

  const search = searchParams.get('q') ?? ''
  const isAr = language === 'ar'

  useEffect(() => {
    let cancelled = false
    listPublications({
      category: 'all',
      kind: 'article',
      access_tier: 'all',
      search,
    })
      .then((items) => {
        if (!cancelled) setResults({ key: search, items, loaded: true })
      })
      .catch(() => {
        if (!cancelled) setResults({ key: search, items: [], loaded: true })
      })

    return () => {
      cancelled = true
    }
  }, [search])

  const loading = !results.loaded || results.key !== search
  const items = useMemo(
    () => (results.key === search ? results.items : []),
    [results.items, results.key, search],
  )

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
      ),
    [items],
  )

  return (
    <PublicSiteShell language={language}>
      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">{isAr ? 'المقالات' : 'Articles'}</span>
            <h1 className="title-2">
              {isAr ? 'مقالات الرأي والتحليل' : 'Opinion and analysis articles'}
            </h1>
          </div>
        </div>

        <div className="filters" style={{ gridTemplateColumns: '1fr' }}>
          <label className="field">
            <span>{isAr ? 'بحث' : 'Search'}</span>
            <input
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('q', event.target.value)
                else next.delete('q')
                setSearchParams(next)
              }}
              placeholder={isAr ? 'عنوان أو كاتب...' : 'Title or author...'}
              value={search}
            />
          </label>
        </div>

        <div className="results-bar">
          <strong className="results-bar__count">
            {isAr ? `عدد المقالات: ${sorted.length}` : `${sorted.length} articles`}
          </strong>
        </div>

        {loading ? (
          <div className="empty">{isAr ? 'جار التحميل...' : 'Loading...'}</div>
        ) : sorted.length === 0 ? (
          <div className="empty">
            {isAr ? 'لا توجد مقالات منشورة حالياً.' : 'No articles published yet.'}
          </div>
        ) : (
          <div className="grid-3">
            {sorted.map((publication) => (
              <PublicationCard
                key={publication.id}
                language={language}
                publication={publication}
              />
            ))}
          </div>
        )}
      </section>
    </PublicSiteShell>
  )
}
