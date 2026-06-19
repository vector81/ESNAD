import anyAscii from 'any-ascii'
import { PUBLICATION_ID_MAP } from './_lib/publication-id-map.js'
import { getPublicationByReference as getPublicationByReferenceFromAdmin } from './_lib/publications.js'

const DEFAULT_SITE_TITLE = 'مركز إسناد للدراسات والأبحاث'
const DEFAULT_SITE_DESCRIPTION =
  'منصة عربية لنشر وأرشفة وبيع الدراسات والأوراق البحثية والكتب.'
const DEFAULT_SITE_URL = 'https://esnads.net'
const DEFAULT_SITE_NAME = 'إسناد'
const ENTRY_JS = '/assets/index.js'
const ENTRY_CSS = '/assets/index.css'
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 675
const OG_IMAGE_TRANSFORM = `f_auto,q_auto,w_${OG_IMAGE_WIDTH},h_${OG_IMAGE_HEIGHT},c_fill,g_auto`
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{6,80}$/

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

function normalizeArabicDigits(value = '') {
  const easternArabicDigits = '٠١٢٣٤٥٦٧٨٩'
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  return String(value).replace(/[٠-٩۰-۹]/g, (digit) => {
    const easternIndex = easternArabicDigits.indexOf(digit)
    if (easternIndex !== -1) return String(easternIndex)
    return String(persianDigits.indexOf(digit))
  })
}

function slugifyArabic(value = '') {
  return normalizeArabicDigits(value)
    .trim()
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{Script=Arabic}\p{N}\s-]/gu, ' ')
    .replace(/[\s_]+/g, '-')
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

function deriveNumericPublicationId(value = '') {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return String(1000000 + ((hash >>> 0) % 9000000))
}

function getPublicPublicationId(pub) {
  const candidates = [
    pub?.public_id,
    pub?.publicId,
    pub?.numeric_id,
    pub?.numericId,
    pub?.article_id,
    pub?.articleId,
    pub?.id,
  ]

  const numericId = candidates
    .map((candidate) => String(candidate || '').trim())
    .find((candidate) => /^\d+$/.test(candidate))

  return numericId || deriveNumericPublicationId(pub?.id || '')
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

async function firestoreGetPublication(projectId, apiKey, id) {
  const encodedId = encodeURIComponent(id)
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/publications/${encodedId}?key=${apiKey}`,
  )

  if (response.status === 403 || response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Firestore document fetch failed (${response.status})`)
  }

  return normalizeDocument(await response.json())
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

function isPublished(pub) {
  return pub?.status === 'published' || pub?.workflow_stage === 'published'
}

async function findById(projectId, apiKey, id) {
  if (!DOCUMENT_ID_PATTERN.test(id)) return null
  const doc = await firestoreGetPublication(projectId, apiKey, id)
  return isPublished(doc) ? doc : null
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
  const normalizedArabicSlug = slugifyArabic(slug)
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
      const arabicCandidates = [
        pub.slug,
        pub.slug_ar,
        pub.slugAr,
        slugifyArabic(pub.title_ar || pub.title_en || pub.slug || ''),
      ]
      return (
        getPublicPublicationId(pub) === slug ||
        latinCandidates.map((item) => String(item || '').trim()).includes(slug) ||
        arabicCandidates
          .map((item) => slugifyArabic(String(item || '').trim()))
          .includes(normalizedArabicSlug)
      )
    }) ?? null
  )
}

async function getPublicationByReference(reference) {
  try {
    const publication = await getPublicationByReferenceFromAdmin(reference)
    if (publication) return publication
  } catch (error) {
    console.error('[esnad/publication-shell] admin publication lookup failed; falling back to REST', error)
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim()
  if (!projectId || !apiKey || !reference) return null

  if (/^\d+$/.test(reference)) {
    const mappedId = PUBLICATION_ID_MAP[reference]
    if (mappedId) {
      const mapped = await findById(projectId, apiKey, mappedId)
      if (mapped) return mapped
    }
  }

  const byId = await findById(projectId, apiKey, reference)
  if (byId) return byId

  const direct = await findBySlugField(projectId, apiKey, reference)
  if (direct) return direct
  return await findByTitleSlug(projectId, apiKey, reference)
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

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim()
}

function renderTextMarks(text, marks = []) {
  return marks.reduce((html, mark) => {
    if (!isPlainObject(mark)) return html

    switch (mark.type) {
      case 'bold':
        return `<strong>${html}</strong>`
      case 'italic':
        return `<em>${html}</em>`
      case 'underline':
        return `<u>${html}</u>`
      case 'strike':
        return `<s>${html}</s>`
      case 'subscript':
        return `<sub>${html}</sub>`
      case 'superscript':
        return `<sup>${html}</sup>`
      case 'code':
        return `<code>${html}</code>`
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : ''
        return href ? `<a href="${escapeHtml(href)}">${html}</a>` : html
      }
      default:
        return html
    }
  }, escapeHtml(text))
}

function renderInlineContent(node) {
  if (!isPlainObject(node)) return ''
  if (node.type === 'text') {
    return renderTextMarks(node.text || '', Array.isArray(node.marks) ? node.marks : [])
  }
  if (node.type === 'hardBreak') return '<br />'
  if (node.type === 'equation') return escapeHtml(node.attrs?.expression || '')
  if (node.type === 'citation') return `<sup>${escapeHtml(node.attrs?.text || '')}</sup>`
  if (Array.isArray(node.content)) return node.content.map(renderInlineContent).join('')
  return ''
}

function renderBlockNode(node) {
  if (!isPlainObject(node)) return ''

  switch (node.type) {
    case 'paragraph': {
      const content = Array.isArray(node.content) ? node.content.map(renderInlineContent).join('') : ''
      return normalizeText(content.replace(/<[^>]+>/g, '')) || content.includes('<br')
        ? `<p>${content}</p>`
        : ''
    }
    case 'heading': {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level || 2)))
      const content = Array.isArray(node.content) ? node.content.map(renderInlineContent).join('') : ''
      return normalizeText(content.replace(/<[^>]+>/g, '')) ? `<h${level}>${content}</h${level}>` : ''
    }
    case 'bulletList':
    case 'orderedList': {
      const tag = node.type === 'orderedList' ? 'ol' : 'ul'
      const items = Array.isArray(node.content) ? node.content.map(renderBlockNode).join('') : ''
      return items ? `<${tag}>${items}</${tag}>` : ''
    }
    case 'listItem': {
      const content = Array.isArray(node.content)
        ? node.content
            .map((child) => {
              if (child?.type === 'paragraph') return renderInlineContent(child)
              return renderBlockNode(child)
            })
            .join('')
        : ''
      return normalizeText(content.replace(/<[^>]+>/g, '')) ? `<li>${content}</li>` : ''
    }
    case 'blockquote': {
      const content = Array.isArray(node.content) ? node.content.map(renderBlockNode).join('') : ''
      return content ? `<blockquote>${content}</blockquote>` : ''
    }
    case 'codeBlock': {
      const content = Array.isArray(node.content) ? node.content.map(extractContentText).join('\n') : ''
      return content ? `<pre><code>${escapeHtml(content)}</code></pre>` : ''
    }
    case 'table': {
      const rows = Array.isArray(node.content) ? node.content.map(renderBlockNode).join('') : ''
      return rows ? `<table><tbody>${rows}</tbody></table>` : ''
    }
    case 'tableRow': {
      const cells = Array.isArray(node.content) ? node.content.map(renderBlockNode).join('') : ''
      return cells ? `<tr>${cells}</tr>` : ''
    }
    case 'tableHeader':
    case 'tableCell': {
      const tag = node.type === 'tableHeader' ? 'th' : 'td'
      const content = Array.isArray(node.content) ? node.content.map(renderInlineContent).join('') : ''
      return `<${tag}>${content}</${tag}>`
    }
    case 'figure': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : ''
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
      const caption = typeof node.attrs?.caption === 'string' ? node.attrs.caption : ''
      if (!src) return caption ? `<p>${escapeHtml(caption)}</p>` : ''
      return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />${
        caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''
      }</figure>`
    }
    case 'image': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : ''
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
      return src ? `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" /></figure>` : ''
    }
    case 'footnote': {
      const label = node.attrs?.id ? `<sup>${escapeHtml(node.attrs.id)}</sup> ` : ''
      const content = typeof node.attrs?.content === 'string' ? node.attrs.content : ''
      return content ? `<p>${label}${escapeHtml(content)}</p>` : ''
    }
    default:
      return Array.isArray(node.content) ? node.content.map(renderBlockNode).join('') : ''
  }
}

function renderContentJson(content) {
  if (!isPlainObject(content) || !Array.isArray(content.content)) return ''
  return content.content.map(renderBlockNode).join('\n')
}

function renderFallbackParagraphs(value = '') {
  return String(value)
    .split(/\n{2,}/)
    .map((paragraph) => normalizeText(paragraph))
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n')
}

function getArticleBodyHtml(pub, language) {
  if (pub.access_tier === 'paid') {
    const preview =
      language === 'en'
        ? pub.abstract_en || pub.description_en || pub.abstract_ar || pub.description_ar || ''
        : pub.abstract_ar || pub.description_ar || pub.abstract_en || pub.description_en || ''

    return renderFallbackParagraphs(preview)
  }

  const renderedContent = renderContentJson(pub.content_json)
  if (renderedContent) return renderedContent

  const fallback =
    language === 'en'
      ? pub.description_en || pub.description_ar || pub.abstract_en || pub.abstract_ar || ''
      : pub.description_ar || pub.description_en || pub.abstract_ar || pub.abstract_en || ''

  return renderFallbackParagraphs(fallback)
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
  return url.replace(/(\/image\/upload\/)(?:(?!v\d+\/)[^/]+\/)?/, `$1${OG_IMAGE_TRANSFORM}/`)
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

function getPublicationSection(pub, requestedSection = 'library') {
  if (pub?.kind === 'book' || pub?.type === 'book' || requestedSection === 'books') return 'books'
  return 'library'
}

function getCanonicalPath(pub, language = 'ar', requestedSection = 'library') {
  const section = getPublicationSection(pub, requestedSection)
  const prefix = language === 'en' ? '/en' : ''
  return `${prefix}/${section}/${getPublicPublicationId(pub)}`
}

function sendPublicationJson(response, pub, language, requestedSection) {
  if (!pub) {
    response.status(404).json({ found: false })
    return
  }

  const canonicalPath = getCanonicalPath(pub, language, requestedSection)
  response.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  response.status(200).json({
    found: true,
    id: pub.id,
    publicId: getPublicPublicationId(pub),
    canonicalPath,
    canonicalUrl: buildAbsoluteUrl(canonicalPath),
    section: getPublicationSection(pub, requestedSection),
    language,
    title: getTitle(pub, language),
    description: getAbstract(pub, language),
    image: optimizeOgImage(pub.cover_image || ''),
  })
}

function renderHtml({ lang, title, description, image, url, ogType, articleTitle, articleAuthor, articlePublishedAt, articleBodyHtml }) {
  const pageTitle =
    title && title !== DEFAULT_SITE_TITLE ? `${title} | ${DEFAULT_SITE_NAME}` : DEFAULT_SITE_TITLE
  const pageDescription = description || DEFAULT_SITE_DESCRIPTION
  const imageMetadata = image
    ? `
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`
    : ''

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
${imageMetadata}
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ar_AR'}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title || DEFAULT_SITE_TITLE)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(image || '')}" />
    <meta name="theme-color" content="#c4302b" />
  </head>
  <body>
    <main>
      <article>
        <h1>${escapeHtml(articleTitle || title || DEFAULT_SITE_TITLE)}</h1>
        ${
          articleAuthor || articlePublishedAt
            ? `<p><small>${[articleAuthor, articlePublishedAt].filter(Boolean).map(escapeHtml).join(' · ')}</small></p>`
            : ''
        }
        ${articleBodyHtml || ''}
      </article>
    </main>
    <div id="root" hidden></div>
    <script type="module" src="${ENTRY_JS}"></script>
  </body>
</html>`
}

export default async function handler(request, response) {
  const slug =
    typeof request.query.slug === 'string' ? decodeURIComponent(request.query.slug).trim() : ''
  const section =
    typeof request.query.section === 'string' && request.query.section ? request.query.section.toLowerCase() : 'library'
  const language = normalizeLanguage(
    typeof request.query.lang === 'string' ? request.query.lang : 'ar',
  )
  const wantsJson = request.query.format === 'json'
  const fallbackPath =
    language === 'en' ? `/en/${section}/${slug}` : `/${section}/${slug}`

  try {
    const pub = await getPublicationByReference(slug)

    if (wantsJson) {
      sendPublicationJson(response, pub, language, section)
      return
    }

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
        articleTitle: DEFAULT_SITE_TITLE,
        articleBodyHtml: `<p>${escapeHtml(DEFAULT_SITE_DESCRIPTION)}</p>`,
      }),
    )
      return
    }

    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
    const canonicalPath = getCanonicalPath(pub, language, section)
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
        url: buildAbsoluteUrl(canonicalPath),
        ogType: 'article',
        articleTitle: getTitle(pub, language),
        articleAuthor: language === 'en' ? pub.author_en || pub.author_ar : pub.author_ar || pub.author_en,
        articlePublishedAt: pub.published_at ? new Date(pub.published_at).toISOString().slice(0, 10) : '',
        articleBodyHtml: getArticleBodyHtml(pub, language),
      }),
    )
  } catch (error) {
    console.error('[esnad/publication-shell] failed to render', error)
    if (wantsJson) {
      response.status(500).json({ found: false })
      return
    }
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.status(200).send(
      renderHtml({
        lang: language,
        title: DEFAULT_SITE_TITLE,
        description: DEFAULT_SITE_DESCRIPTION,
        image: '',
        url: buildAbsoluteUrl(fallbackPath),
        ogType: 'website',
        articleTitle: DEFAULT_SITE_TITLE,
        articleBodyHtml: `<p>${escapeHtml(DEFAULT_SITE_DESCRIPTION)}</p>`,
      }),
    )
  }
}
