import { useEffect } from 'react'
import { getShareSlug } from '../lib/publications'
import { optimizeCloudinaryUrl } from '../lib/cloudinary'
import { createArticleStructuredData, serializeStructuredData, SEO_SITE_URL } from '../lib/structuredData.js'
import type { Publication } from '../types/publication'
import { publicationBreadcrumbs } from '../lib/seoMetadata.js'

export function useArticleStructuredData(publication: Publication | null) {
  useEffect(() => {
    if (!publication || publication.kind === 'book') return
    const data = createArticleStructuredData(publication, {
      url: `${SEO_SITE_URL}/library/${getShareSlug(publication)}`,
      image: publication.cover_image ? optimizeCloudinaryUrl(publication.cover_image, { width: 1200 }) : '',
    })
    let script = document.getElementById('publication-jsonld') as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = 'publication-jsonld'
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = serializeStructuredData(data)
    let breadcrumb = document.getElementById('publication-breadcrumb-jsonld') as HTMLScriptElement | null
    if (!breadcrumb) { breadcrumb = document.createElement('script'); breadcrumb.id = 'publication-breadcrumb-jsonld'; breadcrumb.type = 'application/ld+json'; document.head.appendChild(breadcrumb) }
    breadcrumb.textContent = serializeStructuredData(publicationBreadcrumbs(publication))
    return () => { script.remove(); breadcrumb.remove() }
  }, [publication])
}
