import { renderPmJson } from '../lib/render-pm-json'
import type { Publication } from '../../types/publication'

interface ArticleReaderProps {
  publication: Publication
}

export function ArticleReader({ publication }: ArticleReaderProps) {
  return (
    <article className="reader-article">
      <header className="reader-header">
        <h1 className="reader-title">{publication.title_ar}</h1>
        {publication.title_en ? <p className="reader-subtitle">{publication.title_en}</p> : null}
        <div className="reader-meta">
          {publication.author_ar && <span className="reader-author">{publication.author_ar}</span>}
          {publication.published_at && (
            <span className="reader-date">
              {new Date(publication.published_at).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </header>

      {publication.abstract_ar && (
        <div className="reader-abstract">
          <h2>ملخص</h2>
          <p>{publication.abstract_ar}</p>
        </div>
      )}

      <div className="reader-body">
        {publication.content_json ? (
          renderPmJson(publication.content_json)
        ) : (
          <div className="reader-fallback">
            <p>لا يتوفر محتوى منسّق لهذا الإصدار.</p>
            {publication.pdf_url && (
              <a className="btn btn--primary" href={publication.pdf_url} target="_blank" rel="noreferrer">
                فتح PDF
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
