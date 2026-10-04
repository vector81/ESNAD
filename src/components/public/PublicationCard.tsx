import { Link } from 'react-router-dom'
import {
  formatCurrency,
  getPublicationAuthor,
  getPublicationCategoryLabel,
  getPublicationTitle,
  getShareSlug,
} from '../../lib/publications'
import { optimizeCloudinaryUrl } from '../../lib/cloudinary'
import { publicationSeo } from '../../lib/seoMetadata.js'
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
    <article className="card publication-card" data-publication-id={publication.id}>
      <Link className="card__link" to={getPublicationPath(publication, language)}>
        <div className="card__media">
          {publication.cover_image?.trim() ? (
            <img
              alt={getPublicationTitle(publication, language)}
              src={optimizeCloudinaryUrl(publication.cover_image, { width: 800 })}
              loading="lazy"
              width="800"
              height="450"
              decoding="async"
              style={{ objectPosition: 'center top' }}
            />
          ) : (
            <div className="card__fallback" data-category={publication.category} dir="rtl" lang="ar">
              <span className="card__fallback-logo"><img src="/newlogo.png" alt="" width="80" height="80" /></span>
              <span className="card__fallback-category">{getPublicationCategoryLabel(publication.category, 'ar')}</span>
            </div>
          )}
        </div>

        <div className="card__body">
          <h3 className="card__title">{publicationSeo(publication).title.replace(/\s*\|\s*إسناد$/, '')}</h3>
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
          <div className="card__byline">
            <span>{getPublicationAuthor(publication, language)}</span>
            <time dateTime={publication.published_at}>{publishedDate}</time>
          </div>
        </div>
      </Link>
    </article>
  )
}
