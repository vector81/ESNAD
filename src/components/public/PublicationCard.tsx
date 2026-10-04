import { Link } from 'react-router-dom'
import {
  formatCurrency,
  getCoverObjectPosition,
  getPublicationAbstract,
  getPublicationAuthor,
  getPublicationCategoryLabel,
  getPublicationHeadline,
  getPublicationTitle,
  getShareSlug,
} from '../../lib/publications'
import { optimizeCloudinaryUrl } from '../../lib/cloudinary'
import { getPublicationImage } from '../../lib/structuredData.js'
import type { AppLanguage, Publication } from '../../types/publication'

function getPublicationPath(publication: Publication, language: AppLanguage) {
  const prefix = language === 'en' ? '/en' : ''
  const section = publication.kind === 'book' ? 'books' : 'library'
  return `${prefix}/${section}/${getShareSlug(publication)}`
}

export function PublicationCard({
  publication,
  language,
}: {
  publication: Publication
  language: AppLanguage
}) {
  const publishedDate = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-AU', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(publication.published_at))

  return (
    <article className="card">
      <Link className="card__link" to={getPublicationPath(publication, language)}>
        <div className="card__media">
          {getPublicationImage(publication) ? (
            <img
              alt={getPublicationTitle(publication, language)}
              src={optimizeCloudinaryUrl(getPublicationImage(publication), { width: 800 })}
              loading="lazy"
              width="800"
              height="450"
              decoding="async"
              style={{ objectPosition: getCoverObjectPosition(publication) }}
            />
          ) : (
            <div
              style={{
                aspectRatio: '16 / 10',
                background: 'var(--bg-subtle)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-muted)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {language === 'ar' ? 'إسناد' : 'Esnad'}
            </div>
          )}
        </div>

        <div className="card__body">
          <div className="card__meta">
            <span>{getPublicationAuthor(publication, language)}</span>
            <span>{publishedDate}</span>
          </div>
          <h3 className="card__title">{getPublicationHeadline(publication, language)}</h3>
          <p className="card__text">{getPublicationAbstract(publication, language)}</p>
          <div className="card__meta">
            <span className="badge badge--accent">{getPublicationCategoryLabel(publication.category, language)}</span>
            <span className="badge badge--neutral">
              {publication.access_tier === 'free'
                ? language === 'ar'
                  ? 'مجاني'
                  : 'Free'
                : formatCurrency(publication.price_aud, language)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
