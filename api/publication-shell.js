import { sendPageError } from './_lib/page-error.js'
import { cleanAuthor } from '../src/lib/cleanAuthor.js'
import { PUBLICATION_ID_MAP } from './_lib/publication-id-map.js'
import {
  createOrganizationStructuredData, createWebsiteStructuredData,
  createArticleStructuredData, serializeStructuredData, getPublicationImage, SEO_SITE_NAME,
} from '../src/lib/structuredData.js'
import {
  getPublicationByReference as getPublicationByReferenceFromAdmin,
  listPublishedPublications,
  sanitizePublication,
} from './_lib/publications.js'
import { publicationSeo, publicationBreadcrumbs, breadcrumbs, relatedPublications, HOME_DESCRIPTION, shortText } from '../src/lib/seoMetadata.js'
import { SEO_TOPICS } from '../src/lib/seoTopics.js'
import { renderPublicPage } from './_generated/public-render.js'

const DEFAULT_SITE_TITLE = 'مركز إسناد للدراسات والأبحاث'
const DEFAULT_SITE_DESCRIPTION =
  HOME_DESCRIPTION
const DEFAULT_SITE_URL = 'https://esnads.net'
const DEFAULT_SITE_NAME = 'إسناد'
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
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, ' ')
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
  return await getPublicationByReferenceFromAdmin(reference)
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
  return shortText(value, 154)
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
  path = path === '/en' ? '/en' : path.replace(/^\/en(?=\/|$)/, '') || '/'
  if (!path || path === '/') return DEFAULT_SITE_URL
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${DEFAULT_SITE_URL}/${segments}`
}

function getPublicationSection(pub) {
  if (pub?.kind === 'book' || (!pub?.kind && pub?.type === 'book')) return 'books'
  return 'library'
}

function getCanonicalPath(pub) {
  const section = getPublicationSection(pub)
  return `/${section}/${getPublicPublicationId(pub)}`
}

function sendPublicationJson(response, pub, language, requestedSection) {
  if (!pub) {
    response.setHeader('cache-control', 'no-store')
    response.setHeader('x-robots-tag', 'noindex, follow')
    response.status(404).json({ found: false })
    return
  }

  const canonicalPath = getCanonicalPath(pub)
  response.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  response.status(200).json({
    found: true,
    id: pub.id,
    publicId: getPublicPublicationId(pub),
    canonicalPath,
    canonicalUrl: buildAbsoluteUrl(canonicalPath),
    section: getPublicationSection(pub),
    language,
    title: publicationSeo(pub).title,
    description: publicationSeo(pub).description,
    breadcrumbJsonLd: publicationBreadcrumbs(pub),
    publication: sanitizePublication(pub, false),
    initialHtml: renderPublicPage({path: language === 'en' ? `/en${canonicalPath}` : canonicalPath, language, publication: sanitizePublication(pub, false)}),
    image: optimizeOgImage(getPublicationImage(pub)),
    articleJsonLd: createArticleStructuredData(pub, {
      url: buildAbsoluteUrl(canonicalPath), image: optimizeOgImage(getPublicationImage(pub)),
    }),
  })
}

function getCatalogMeta(section, language) {
  const isEnglish = language === 'en'
  if (SEO_TOPICS[section]) return { title: SEO_TOPICS[section].title, heading: SEO_TOPICS[section].title, description: SEO_TOPICS[section].intro, path: `/topics/${section}` }
  if (section === 'articles') {
    return {
      title: isEnglish ? 'Articles' : 'المقالات',
      heading: isEnglish ? 'Opinion and analysis articles' : 'مقالات الرأي والتحليل',
      description: isEnglish
        ? 'Latest public Esnad analytical articles with titles, authors, summaries, dates, and canonical links.'
        : 'أحدث مقالات إسناد المنشورة مع العناوين والكتاب والملخصات والتواريخ والروابط الدائمة.',
      path: isEnglish ? '/en/articles' : '/articles',
    }
  }
  if (section === 'books') {
    return {
      title: isEnglish ? 'Books' : 'الكتب',
      heading: isEnglish ? 'Books' : 'الكتب',
      description: isEnglish
        ? 'Published Esnad books with metadata, summaries, and canonical links.'
        : 'كتب إسناد المنشورة مع البيانات التعريفية والملخصات والروابط الدائمة.',
      path: isEnglish ? '/en/books' : '/books',
    }
  }
  if (section === 'library') {
    return {
      title: isEnglish ? 'Research library' : 'المكتبة البحثية',
      heading: isEnglish ? 'Research library' : 'المكتبة البحثية',
      description: isEnglish
        ? 'Published Esnad research papers, studies, reports, and articles.'
        : 'أرشيف إسناد المنشور من الدراسات والأوراق البحثية والتقارير والمقالات.',
      path: isEnglish ? '/en/library' : '/library',
    }
  }
  return {
    title: isEnglish ? 'Esnad Center for Studies and Research' : DEFAULT_SITE_TITLE,
    heading: isEnglish ? 'Esnad Center for Studies and Research' : DEFAULT_SITE_TITLE,
    description: isEnglish
      ? 'A bilingual platform for studies, research papers, books, and analytical articles.'
      : DEFAULT_SITE_DESCRIPTION,
    path: isEnglish ? '/en' : '/',
  }
}

function filterCatalogPublications(publications, section) {
  if (SEO_TOPICS[section]) return publications.filter(pub => pub.category === section)
  if (section === 'articles') return publications.filter((pub) => pub.kind === 'article')
  if (section === 'books') return publications.filter((pub) => pub.kind === 'book')
  if (section === 'library') return publications.filter((pub) => pub.kind !== 'book')
  return publications.slice(0, 12)
}

function getCatalogItemPath(pub, language) {
  const path = getCanonicalPath(pub)
  return language === 'en' ? `/en${path}` : path
}

function renderCatalogNavigation(language) {
  const links = language === 'en'
    ? [
        ['/en', 'Home'],
        ['/en/articles', 'Articles'],
        ['/en/library', 'Library'],
        ['/en/books', 'Books'],
        ['/llms.txt', 'LLMS'],
        ['/sitemap.xml', 'Sitemap'],
      ]
    : [
        ['/', 'الرئيسية'],
        ['/articles', 'المقالات'],
        ['/library', 'المكتبة'],
        ['/books', 'الكتب'],
        ['/llms.txt', 'LLMS'],
        ['/sitemap.xml', 'Sitemap'],
      ]

  return `<nav aria-label="Primary navigation">${links
    .map(([href, label]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join('')}</nav>`
}

function renderCatalogPublication(pub, language) {
  const title = getTitle(pub, language)
  const headline = getHeadline(pub, language) || title
  const abstract = getAbstract(pub, language)
  const path = getCatalogItemPath(pub, language)
  const publishedDate = pub.published_at ? new Date(pub.published_at).toISOString().slice(0, 10) : ''
  const author = cleanAuthor(language === 'en' ? pub.author_en || pub.author_ar : pub.author_ar || pub.author_en)

  return `<article class="catalog-item" itemscope itemtype="https://schema.org/Article">
    ${getPublicationImage(pub) ? `<a href="${escapeHtml(path)}"><img src="${escapeHtml(optimizeOgImage(getPublicationImage(pub)))}" alt="${escapeHtml(title)}" loading="lazy" itemprop="image" /></a>` : ''}
    <div>
      <p class="meta">
        ${author ? `<span itemprop="author">${escapeHtml(author)}</span>` : ''}
        ${publishedDate ? `<time datetime="${escapeHtml(publishedDate)}" itemprop="datePublished">${escapeHtml(publishedDate)}</time>` : ''}
        ${pub.category ? `<span>${escapeHtml(pub.category)}</span>` : ''}
      </p>
      <h2 itemprop="headline"><a href="${escapeHtml(path)}">${escapeHtml(headline)}</a></h2>
      ${headline !== title ? `<p class="full-title" itemprop="name">${escapeHtml(title)}</p>` : ''}
      ${abstract ? `<p itemprop="description">${escapeHtml(abstract)}</p>` : ''}
      <p><a href="${escapeHtml(path)}">${language === 'en' ? 'Read publication' : 'قراءة الإصدار'}</a></p>
    </div>
  </article>`
}

function renderCatalogJsonLd(items, meta, language) {
  const organization = createOrganizationStructuredData()
  const page = {
    '@type': 'CollectionPage',
    name: meta.heading,
    description: meta.description,
    url: buildAbsoluteUrl(meta.path),
    inLanguage: language,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((pub, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: getTitle(pub, language),
        url: buildAbsoluteUrl(getCatalogItemPath(pub, language)),
      })),
    },
    publisher: { '@id': organization['@id'] },
    isPartOf: { '@id': `${DEFAULT_SITE_URL}/#website` },
  }
  return serializeStructuredData({
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      ...(['/','/en'].includes(meta.path) ? [createWebsiteStructuredData()] : []),
      page,
      ...(meta.path !== '/' && meta.path !== '/en' ? [breadcrumbs([['الرئيسية', '/'], [meta.heading, meta.path.replace(/^\/en/, '')]])] : []),
    ],
  })
}

function renderCatalogHtml({ lang, section, publications }) {
  const meta = getCatalogMeta(section, lang)
  const title = meta.title === DEFAULT_SITE_TITLE ? meta.title : `${meta.title} | ${DEFAULT_SITE_NAME}`

  return `<!doctype html>
<html dir="${lang === 'en' ? 'ltr' : 'rtl'}" lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(buildAbsoluteUrl(meta.path))}" />
    ${section === 'home' ? '<link rel="alternate" hreflang="ar" href="https://esnads.net" /><link rel="alternate" hreflang="en" href="https://esnads.net/en" /><link rel="alternate" hreflang="x-default" href="https://esnads.net" />' : ''}
    <link rel="alternate" type="application/rss+xml" title="إصدارات مركز إسناد" href="https://esnads.net/feed.xml" />
    <link rel="stylesheet" href="${ENTRY_CSS}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(SEO_SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${escapeHtml(buildAbsoluteUrl(meta.path))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${renderCatalogJsonLd(publications, meta, lang)}</script>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #fff; }
      main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 56px; }
      nav { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 28px; }
      nav a, article a { color: #9f1d20; text-decoration: none; }
      h1 { font-size: 32px; line-height: 1.2; margin: 0 0 10px; }
      .lede { max-width: 780px; color: #53606f; margin: 0 0 28px; line-height: 1.8; }
      .catalog-item { display: grid; grid-template-columns: minmax(160px, 260px) 1fr; gap: 20px; padding: 22px 0; border-top: 1px solid #e5e7eb; }
      .catalog-item img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: #f3f4f6; }
      .catalog-item h2 { margin: 4px 0 8px; font-size: 22px; line-height: 1.45; }
      .catalog-item p { margin: 0 0 10px; line-height: 1.75; }
      .catalog-item .meta { display: flex; flex-wrap: wrap; gap: 10px; color: #687385; font-size: 14px; }
      .catalog-item .full-title { font-weight: 600; }
      @media (max-width: 700px) { .catalog-item { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      ${renderCatalogNavigation(lang)}
      <nav aria-label="تصنيفات المكتبة">${[...new Set(publications.map(pub => pub.category))].filter(category => SEO_TOPICS[category]).map(category => `<a href="/topics/${category}">${escapeHtml(SEO_TOPICS[category].title)}</a>`).join('')}</nav>
      <header>
        <h1>${escapeHtml(meta.heading)}</h1>
        <p class="lede">${escapeHtml(meta.description)}</p>
      </header>
      <section aria-label="${escapeHtml(meta.heading)}">
        ${publications.length
          ? publications.map((pub) => renderCatalogPublication(pub, lang)).join('\n')
          : `<p>${lang === 'en' ? 'No published items are available.' : 'لا توجد مواد منشورة حالياً.'}</p>`}
      </section>
    </main>
    <div id="root" hidden></div>

  </body>
</html>`
}

function renderArticleJsonLd({ pub, url, image }) {
  return serializeStructuredData(createArticleStructuredData(pub, { url, image }))
}

function renderHtml({ lang, title, description, image, url, ogType, articleTitle, articleAuthor, articlePublishedAt, articleBodyHtml, jsonLd, breadcrumbJsonLd, relatedHtml, initialHtml }) {
  const pageTitle =
    title && title !== DEFAULT_SITE_TITLE ? (title.includes(' | ') ? title : `${title} | ${DEFAULT_SITE_NAME}`) : DEFAULT_SITE_TITLE
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
    <link rel="alternate" type="application/rss+xml" title="إصدارات مركز إسناد" href="https://esnads.net/feed.xml" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="shortcut icon" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <link rel="stylesheet" href="${ENTRY_CSS}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${escapeHtml(SEO_SITE_NAME)}" />
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
    ${jsonLd ? `<script id="publication-jsonld" type="application/ld+json">${jsonLd}</script>` : ''}
    ${breadcrumbJsonLd ? `<script id="publication-breadcrumb-jsonld" type="application/ld+json">${serializeStructuredData(breadcrumbJsonLd)}</script>` : ''}
  </head>
  <body>
    ${initialHtml || `<main>
      <article>
        <h1>${escapeHtml(articleTitle || title || DEFAULT_SITE_TITLE)}</h1>
        ${
          articleAuthor || articlePublishedAt
            ? `<p><small>${[articleAuthor, articlePublishedAt].filter(Boolean).map(escapeHtml).join(' · ')}</small></p>`
            : ''
        }
        ${articleBodyHtml || ''}
      </article>
      ${relatedHtml || ''}
    </main>`}
    <div id="root" hidden></div>

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
  const wantsCatalog = request.query.mode === 'catalog'
  const wantsJson = request.query.format === 'json'

  if (wantsCatalog) {
    try {
      const all = await listPublishedPublications()
      const publications = filterCatalogPublications(all, section)
      if (section !== 'home' && !['library', 'articles', 'books'].includes(section) && (!SEO_TOPICS[section] || !publications.length)) { sendPageError(response, 404, language); return }
      if (wantsJson) {
        const meta = getCatalogMeta(section, language)
        response.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
        const safePublications = all.map(pub => sanitizePublication(pub, false, { includeContent: false }))
        response.status(200).json({ meta, publications: safePublications, jsonLd: JSON.parse(renderCatalogJsonLd(publications, meta, language)), initialHtml: section === 'home' ? renderPublicPage({path:meta.path,language,publications:safePublications}) : '' })
        return
      }
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
      response.status(200).send(renderCatalogHtml({ lang: language, section, publications }))
    } catch (error) {
      console.error('[esnad/publication-shell] failed to render catalog', error)
      sendPageError(response, 503, language)
    }
    return
  }

  try {
    const pub = await getPublicationByReference(slug)

    if (wantsJson) {
      sendPublicationJson(response, pub, language, section)
      return
    }

    if (!pub) {
      sendPageError(response, 404, language)
      return
    }

    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
    const canonicalPath = getCanonicalPath(pub)
    response.status(200).send(
      renderHtml({
        lang: language,
        // Headline (short) for browser tab + share cards; falls back to full
        // title when the editor hasn't set one. The article page itself still
        // renders the long academic title in its h1 — only outbound metadata
        // uses the headline.
        title: publicationSeo(pub).title,
        description: publicationSeo(pub).description,
        initialHtml: renderPublicPage({ path: language === 'en' ? `/en${canonicalPath}` : canonicalPath, language, publication: sanitizePublication(pub, false) }),
        image: optimizeOgImage(getPublicationImage(pub)),
        url: buildAbsoluteUrl(canonicalPath),
        ogType: 'article',
        articleTitle: getTitle(pub, language),
        articleAuthor: cleanAuthor(language === 'en' ? pub.author_en || pub.author_ar : pub.author_ar || pub.author_en),
        articlePublishedAt: pub.published_at ? new Date(pub.published_at).toISOString().slice(0, 10) : '',
        articleBodyHtml: getArticleBodyHtml(pub, language).replace(/<h1\b/g, '<h2').replace(/<\/h1>/g, '</h2>').replace(/alt=""/g, `alt="${escapeHtml(`صورة توضيحية: ${pub.title_ar}`)}"`),
        breadcrumbJsonLd: publicationBreadcrumbs(pub),
        relatedHtml: `<section aria-label="مقالات ذات صلة"><h2>مقالات ذات صلة</h2>${relatedPublications(pub, await listPublishedPublications()).map(item => `<p><a href="${escapeHtml(getCanonicalPath(item))}">${escapeHtml(item.title_ar)}</a></p>`).join('')}</section>`,
        jsonLd: renderArticleJsonLd({
          pub,
          language,
          url: buildAbsoluteUrl(canonicalPath),
          image: optimizeOgImage(getPublicationImage(pub)),
        }),
      }),
    )
  } catch (error) {
    console.error('[esnad/publication-shell] failed to render', error)
    if (wantsJson) {
      response.setHeader('cache-control', 'no-store')
      response.setHeader('x-robots-tag', 'noindex, follow')
      response.status(503).json({ error: 'temporarily_unavailable' })
      return
    }
    sendPageError(response, 503, language)
  }
}
