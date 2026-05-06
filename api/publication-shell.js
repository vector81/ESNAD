import anyAscii from 'any-ascii'

const DEFAULT_SITE_TITLE = 'مركز إسناد للدراسات والأبحاث'
const DEFAULT_SITE_DESCRIPTION =
  'منصة عربية لنشر وأرشفة وبيع الدراسات والأوراق البحثية والكتب.'
const DEFAULT_SITE_URL = 'https://esnads.net'
const DEFAULT_SITE_NAME = 'إسناد'
const ENTRY_JS = '/assets/index.js'
const ENTRY_CSS = '/assets/index.css'

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function slugifyLatin(value = '') {
  return anyAscii(String(value))
    .trim()
    .toLowerCase()
    .replace(/['"`´]+/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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
      Object.entries(value.mapValue.fields ?? {}).map(([k, v]) => [k, decodeFirestoreValue(v)]),
    )
  }
  return undefined
}

function normalizeDocument(document) {
  const fields = Object.entries(document.fields ?? {})
  const data = Object.fromEntries(fields.map(([key, value]) => [key, decodeFirestoreValue(value)]))
  return { id: document.name?.split('/').pop() ?? '', ...data }
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

function buildPublishedFilter(extraFilter, publishedField) {
  return {
    compositeFilter: {
      op: 'AND',
      filters: [
        {
          fieldFilter: {
            field: { fieldPath: publishedField },
            op: 'EQUAL',
            value: { stringValue: 'published' },
          },
        },
        extraFilter,
      ],
    },
  }
}

async function findBySlugField(projectId, apiKey, slug) {
  for (const slugField of ['slug', 'slug_ar', 'slugAr', 'slug_latin', 'slugLatin', 'slug_en', 'slugEn']) {
    const slugFilter = {
      fieldFilter: {
        field: { fieldPath: slugField },
        op: 'EQUAL',
        value: { stringValue: slug },
      },
    }
    for (const publishedField of ['status', 'workflow_stage']) {
      const docs = await firestoreQuery(projectId, apiKey, {
        structuredQuery: {
          from: [{ collectionId: 'publications' }],
          where: buildPublishedFilter(slugFilter, publishedField),
          limit: 1,
        },
      })
      if (docs[0]) return docs[0]
    }
  }
  return null
}

async function listPublished(projectId, apiKey) {
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

async function findByTitleSlug(projectId, apiKey, slug) {
  const docs = await listPublished(projectId, apiKey)
  return (
    docs.find((pub) => {
      const latinCandidates = [
        pub.slug_latin,
        pub.slugLatin,
        pub.slug_en,
        pub.slugEn,
        slugifyLatin(pub.title_en || pub.title_ar || pub.slug || ''),
      ]
      return latinCandidates.map((item) => String(item || '').trim()).includes(slug)
    }) ?? null
  )
}

async function getPublicationBySlug(slug) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim()
  if (!projectId || !apiKey || !slug) return null

  const direct = await findBySlugField(projectId, apiKey, slug)
  if (direct) return direct
  return await findByTitleSlug(projectId, apiKey, slug)
}

function normalizeLanguage(value) {
  return value === 'en' ? 'en' : 'ar'
}

function getTitle(pub, language) {
  return language === 'en'
    ? pub.title_en || pub.title_ar || DEFAULT_SITE_TITLE
    : pub.title_ar || pub.title_en || DEFAULT_SITE_TITLE
}

// Short headline for share cards / browser tabs. Falls back to the full title
// when the editor hasn't set a headline. This is what controls how the article
// looks on WhatsApp / Twitter / Facebook previews.
function getHeadline(pub, language) {
  const trimmed = (v) => (typeof v === 'string' ? v.trim() : '')
  const candidates =
    language === 'en'
      ? [pub.headline_en, pub.headline_ar, pub.title_en, pub.title_ar]
      : [pub.headline_ar, pub.headline_en, pub.title_ar, pub.title_en]
  return candidates.map(trimmed).find(Boolean) || DEFAULT_SITE_TITLE
}

function extractContentText(node) {
  if (!node || typeof node !== 'object') return ''
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.content)) return node.content.map(extractContentText).join(' ')
  return ''
}

function getAbstract(pub, language) {
  const fields =
    language === 'en'
      ? [pub.abstract_en, pub.abstract_ar, pub.description_en, pub.description_ar]
      : [pub.abstract_ar, pub.abstract_en, pub.description_ar, pub.description_en]
  let value = fields.find((v) => v && String(v).trim()) || ''
  // Last-resort fallback so WhatsApp/Twitter previews never show the generic site
  // description on a real article: pull a snippet from the body.
  if (!value && pub.content_json) value = extractContentText(pub.content_json)
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 200)
}

// WhatsApp's preview crawler skips images larger than ~2 MB and is happiest
// at <300 KB. Cloudinary-hosted assets get an inline transform that delivers
// an optimized JPEG sized for OG cards.
function optimizeOgImage(url) {
  if (!url) return ''
  if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(url)) return url
  if (/\/image\/upload\/[^/]*[fq]_[^/]*\//.test(url)) return url
  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_1200,c_limit/')
}

function buildAbsoluteUrl(path = '/') {
  if (!path || path === '/') return DEFAULT_SITE_URL
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${DEFAULT_SITE_URL}/${segments}`
}

function renderHtml({ lang, title, description, image, url, ogType }) {
  const pageTitle =
    title && title !== DEFAULT_SITE_TITLE ? `${title} | ${DEFAULT_SITE_NAME}` : DEFAULT_SITE_TITLE
  const pageDescription = description || DEFAULT_SITE_DESCRIPTION
  return `<!doctype html>
<html dir="${lang === 'en' ? 'ltr' : 'rtl'}" lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDescription)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="shortcut icon" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <link rel="stylesheet" href="${ENTRY_CSS}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${escapeHtml(DEFAULT_SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(title || DEFAULT_SITE_TITLE)}" />
    <meta property="og:description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:image" content="${escapeHtml(image || '')}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ar_AR'}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title || DEFAULT_SITE_TITLE)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(image || '')}" />
    <meta name="theme-color" content="#c4302b" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${ENTRY_JS}"></script>
  </body>
</html>`
}

export default async function handler(request, response) {
  const slug =
    typeof request.query.slug === 'string' ? decodeURIComponent(request.query.slug).trim() : ''
  const section =
    typeof request.query.section === 'string' && request.query.section ? request.query.section : 'library'
  const language = normalizeLanguage(
    typeof request.query.lang === 'string' ? request.query.lang : 'ar',
  )
  const fallbackPath =
    language === 'en' ? `/en/${section}/${slug}` : `/${section}/${slug}`

  try {
    const pub = await getPublicationBySlug(slug)

    if (!pub) {
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.status(200).send(
        renderHtml({
          lang: language,
          title: DEFAULT_SITE_TITLE,
          description: DEFAULT_SITE_DESCRIPTION,
          image: '',
          url: buildAbsoluteUrl(fallbackPath),
          ogType: 'website',
        }),
      )
      return
    }

    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
    response.status(200).send(
      renderHtml({
        lang: language,
        // Headline (short) for browser tab + share cards; falls back to full
        // title when the editor hasn't set one. The article page itself still
        // renders the long academic title in its h1 — only outbound metadata
        // uses the headline.
        title: getHeadline(pub, language) || getTitle(pub, language),
        description: getAbstract(pub, language),
        image: optimizeOgImage(pub.cover_image || ''),
        url: buildAbsoluteUrl(fallbackPath),
        ogType: 'article',
      }),
    )
  } catch (error) {
    console.error('[esnad/publication-shell] failed to render', error)
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.status(200).send(
      renderHtml({
        lang: language,
        title: DEFAULT_SITE_TITLE,
        description: DEFAULT_SITE_DESCRIPTION,
        image: '',
        url: buildAbsoluteUrl(fallbackPath),
        ogType: 'website',
      }),
    )
  }
}
