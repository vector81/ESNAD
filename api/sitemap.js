import { getAdminDb } from './_lib/firebase-admin.js'

const SITE_URL = 'https://esnads.net'
const SITE_LASTMOD = '2026-06-14T00:21:14.000Z'

const STATIC_URLS = [
  { path: '/', language: 'ar', alternateGroup: 'home', changefreq: 'daily', priority: '1.0', lastmod: SITE_LASTMOD },
  { path: '/en', language: 'en', alternateGroup: 'home', changefreq: 'daily', priority: '0.9', lastmod: SITE_LASTMOD },
  { path: '/library', language: 'ar', alternateGroup: 'library', changefreq: 'daily', priority: '0.9', lastmod: SITE_LASTMOD },
  { path: '/en/library', language: 'en', alternateGroup: 'library', changefreq: 'daily', priority: '0.8', lastmod: SITE_LASTMOD },
  { path: '/books', language: 'ar', alternateGroup: 'books', changefreq: 'daily', priority: '0.8', lastmod: SITE_LASTMOD },
  { path: '/en/books', language: 'en', alternateGroup: 'books', changefreq: 'daily', priority: '0.7', lastmod: SITE_LASTMOD },
  { path: '/articles', language: 'ar', alternateGroup: 'articles', changefreq: 'daily', priority: '0.8', lastmod: SITE_LASTMOD },
  { path: '/en/articles', language: 'en', alternateGroup: 'articles', changefreq: 'daily', priority: '0.7', lastmod: SITE_LASTMOD },
  { path: '/about', language: 'ar', alternateGroup: 'about', changefreq: 'monthly', priority: '0.8', lastmod: SITE_LASTMOD },
  { path: '/en/about', language: 'en', alternateGroup: 'about', changefreq: 'monthly', priority: '0.7', lastmod: SITE_LASTMOD },
  { path: '/contact', language: 'ar', alternateGroup: 'contact', changefreq: 'monthly', priority: '0.7', lastmod: SITE_LASTMOD },
  { path: '/en/contact', language: 'en', alternateGroup: 'contact', changefreq: 'monthly', priority: '0.6', lastmod: SITE_LASTMOD },
  { path: '/llms.txt', changefreq: 'monthly', priority: '0.3', lastmod: SITE_LASTMOD },
]

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return undefined
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(decodeFirestoreValue)
  }
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, child]) => [
        key,
        decodeFirestoreValue(child),
      ]),
    )
  }
  return undefined
}

function normalizeDocument(document) {
  const fields = Object.entries(document.fields ?? {})
  const data = Object.fromEntries(fields.map(([key, value]) => [key, decodeFirestoreValue(value)]))
  return { id: document.name?.split('/').pop() ?? '', ...data }
}

function deriveNumericPublicationId(value = '') {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return String(1000000 + ((hash >>> 0) % 9000000))
}

function getPublicPublicationId(publication) {
  const candidates = [
    publication?.public_id,
    publication?.publicId,
    publication?.numeric_id,
    publication?.numericId,
    publication?.article_id,
    publication?.articleId,
    publication?.id,
  ]

  const numericId = candidates
    .map((candidate) => String(candidate || '').trim())
    .find((candidate) => /^\d+$/.test(candidate))

  return numericId || deriveNumericPublicationId(publication?.id || '')
}

async function firestoreQuery(projectId, apiKey, body) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  )

  if (!response.ok) {
    throw new Error(`Firestore query failed (${response.status})`)
  }

  const payload = await response.json()
  return payload.filter((item) => item.document).map((item) => normalizeDocument(item.document))
}

async function listPublishedPublicationsFromAdmin() {
  const db = getAdminDb()
  const seen = new Map()

  for (const publishedField of ['status', 'workflow_stage']) {
    const snapshot = await db.collection('publications').where(publishedField, '==', 'published').get()

    for (const doc of snapshot.docs) {
      if (!seen.has(doc.id)) seen.set(doc.id, { id: doc.id, ...doc.data() })
    }
  }

  return [...seen.values()]
}

async function listPublishedPublicationsFromRest() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim()

  if (!projectId || !apiKey) {
    return []
  }

  const seen = new Map()

  for (const publishedField of ['status', 'workflow_stage']) {
    const docs = await firestoreQuery(projectId, apiKey, {
      structuredQuery: {
        from: [{ collectionId: 'publications' }],
        where: {
          fieldFilter: {
            field: { fieldPath: publishedField },
            op: 'EQUAL',
            value: { stringValue: 'published' },
          },
        },
      },
    })

    for (const doc of docs) {
      if (!seen.has(doc.id)) seen.set(doc.id, doc)
    }
  }

  return [...seen.values()]
}

async function listPublishedPublications() {
  try {
    return await listPublishedPublicationsFromAdmin()
  } catch (error) {
    console.error('[esnad/sitemap] admin firestore list failed; falling back to REST', error)
    return await listPublishedPublicationsFromRest()
  }
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value || '').trim()).replace(/%2F/gi, '-')
}

function getPublicationSection(publication) {
  return publication.kind === 'book' ? 'books' : 'library'
}

function getPublicationLanguages(publication) {
  if (publication.language_mode === 'ar') return ['ar']
  if (publication.language_mode === 'en') return ['en']
  return ['ar', 'en']
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
  const date = new Date(value || Date.now())
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function buildPublicationUrls(publications) {
  return publications.flatMap((publication) => {
    const section = getPublicationSection(publication)
    const id = encodePathSegment(getPublicPublicationId(publication))
    if (!id) return []

    return getPublicationLanguages(publication).map((language) => ({
      path: language === 'en' ? `/en/${section}/${id}` : `/${section}/${id}`,
      language,
      alternateGroup: `${section}:${id}`,
      changefreq: 'weekly',
      priority: section === 'books' ? '0.7' : '0.8',
      lastmod: getLastModified(publication.updated_at || publication.published_at),
    }))
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

      return `  <url>
    <loc>${escapeXml(toAbsoluteUrl(url.path))}</loc>${lastmod}${alternateLinks}
    <changefreq>${escapeXml(url.changefreq)}</changefreq>
    <priority>${escapeXml(url.priority)}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${renderedUrls}
</urlset>
`
}

export default async function handler(_request, response) {
  try {
    const publications = await listPublishedPublications()
    const urls = [...STATIC_URLS, ...buildPublicationUrls(publications)]

    response.setHeader('content-type', 'application/xml; charset=utf-8')
    response.setHeader('cache-control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
    response.status(200).send(renderSitemap(urls))
  } catch (error) {
    console.error('[esnad/sitemap] failed to build dynamic sitemap', error)
    response.setHeader('content-type', 'application/xml; charset=utf-8')
    response.setHeader('cache-control', 'public, max-age=0, s-maxage=300')
    response.status(200).send(renderSitemap(STATIC_URLS))
  }
}
