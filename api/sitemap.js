import { listPublishedPublications, getPublicPublicationId } from './_lib/publications.js'
const SITE_URL = 'https://esnads.net'
import { SEO_UPDATED_AT } from '../src/lib/seoMetadata.js'
import { SEO_TOPICS } from '../src/lib/seoTopics.js'
import { getPublicationImage } from '../src/lib/structuredData.js'
const SITE_LASTMOD = SEO_UPDATED_AT

const STATIC_URLS = [
  { path: '/', language: 'ar', alternateGroup: 'home', changefreq: 'daily', priority: '1.0', lastmod: SITE_LASTMOD },
  { path: '/en', language: 'en', alternateGroup: 'home', changefreq: 'daily', priority: '0.6', lastmod: SITE_LASTMOD },
  { path: '/library', language: 'ar', alternateGroup: 'library', changefreq: 'daily', priority: '0.9', lastmod: SITE_LASTMOD },
  { path: '/books', language: 'ar', alternateGroup: 'books', changefreq: 'daily', priority: '0.8', lastmod: SITE_LASTMOD },
  { path: '/articles', language: 'ar', alternateGroup: 'articles', changefreq: 'daily', priority: '0.8', lastmod: SITE_LASTMOD },
  { path: '/about', language: 'ar', alternateGroup: 'about', changefreq: 'monthly', priority: '0.8', lastmod: SITE_LASTMOD },
  { path: '/contact', language: 'ar', alternateGroup: 'contact', changefreq: 'monthly', priority: '0.7', lastmod: SITE_LASTMOD },
  // Last commit modifying this static file; SEO HTML changes do not modify it.
  { path: '/llms.txt', changefreq: 'monthly', priority: '0.3', lastmod: '2026-09-26T11:04:30.000Z' },
]

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value || '').trim()).replace(/%2F/gi, '-')
}

function getPublicationSection(publication) {
  return publication.kind === 'book' ? 'books' : 'library'
}

function toAbsoluteUrl(path) {
  if (path === '/') return SITE_URL
  return `${SITE_URL}${path}`
}

function buildAlternateGroups(urls) {
  const groups = new Map()

  for (const url of urls) {
    if (!url.alternateGroup || !url.language) continue

    const existing = groups.get(url.alternateGroup) || {}
    groups.set(url.alternateGroup, {
      ...existing,
      [url.language]: toAbsoluteUrl(url.path),
    })
  }

  return groups
}

function getLastModified(value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function buildPublicationUrls(publications) {
  return publications.flatMap((publication) => {
    const section = getPublicationSection(publication)
    const id = encodePathSegment(getPublicPublicationId(publication))
    if (!id) return []

    return [{
      path: `/${section}/${id}`,
      language: 'ar',
      alternateGroup: `${section}:${id}`,
      changefreq: 'weekly',
      priority: section === 'books' ? '0.7' : '0.8',
      lastmod: [getLastModified(publication.updated_at || publication.published_at), SEO_UPDATED_AT].filter(Boolean).sort().at(-1),
      image: getPublicationImage(publication),
      imageTitle: publication.title_ar,
    }]
  })
}

function dedupeUrls(urls) {
  const seen = new Set()
  return urls.filter((url) => {
    const absolute = toAbsoluteUrl(url.path)
    if (seen.has(absolute)) return false
    seen.add(absolute)
    return true
  })
}

function renderSitemap(urls) {
  const alternateGroups = buildAlternateGroups(urls)
  const renderedUrls = dedupeUrls(urls)
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : ''
      const alternates = alternateGroups.get(url.alternateGroup)
      const alternateLinks = alternates
        ? Object.entries(alternates)
            .map(
              ([language, href]) =>
                `\n    <xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(href)}" />`,
            )
            .join('') +
          (alternates.ar
            ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(alternates.ar)}" />`
            : '')
        : ''

      const image = url.image ? `\n    <image:image><image:loc>${escapeXml(url.image)}</image:loc><image:title>${escapeXml(url.imageTitle)}</image:title></image:image>` : ''
      return `  <url>
    <loc>${escapeXml(toAbsoluteUrl(url.path))}</loc>${lastmod}${alternateLinks}
    <changefreq>${escapeXml(url.changefreq)}</changefreq>
    <priority>${escapeXml(url.priority)}</priority>${image}
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${renderedUrls}
</urlset>
`
}

export default async function handler(_request, response) {
  try {
    const publications = await listPublishedPublications()
    const latest = [SEO_UPDATED_AT, ...publications.map(pub => getLastModified(pub.updated_at || pub.published_at))].filter(Boolean).sort().at(-1)
    const categories = [...new Set(publications.map(pub => pub.category))].filter(category => SEO_TOPICS[category]).map(category => ({ path: `/topics/${category}`, lastmod: [SEO_UPDATED_AT, ...publications.filter(pub => pub.category === category).map(pub => getLastModified(pub.updated_at || pub.published_at))].filter(Boolean).sort().at(-1), changefreq: 'weekly', priority: '0.7' }))
    const urls = [...STATIC_URLS.map(url => ['/', '/en', '/library', '/articles', '/books'].includes(url.path) ? { ...url, lastmod: latest } : url), ...categories, ...buildPublicationUrls(publications)]

    response.setHeader('content-type', 'application/xml; charset=utf-8')
    response.setHeader('cache-control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
    response.status(200).send(renderSitemap(urls))
  } catch (error) {
    console.error('[esnad/sitemap] failed to build dynamic sitemap', error)
    response.setHeader('content-type', 'application/xml; charset=utf-8')
    response.setHeader('cache-control', 'public, max-age=0, s-maxage=300')
    response.setHeader('retry-after', '60')
    response.status(503).send('Sitemap temporarily unavailable')
  }
}
