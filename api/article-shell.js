import anyAscii from 'any-ascii'

const DEFAULT_SITE_TITLE = 'إسناد | صحافة عربية مستقلة'
const DEFAULT_SITE_DESCRIPTION =
  'إسناد - منصة عربية مستقلة للمقالات والتقارير والتحقيقات. صحافة حرة، بلا حدود، بلا ضغوط.'
const DEFAULT_OG_DESCRIPTION = 'منصة عربية مستقلة للمقالات والتقارير والتحقيقات.'
const DEFAULT_SITE_URL = 'https://esnads.net'
const DEFAULT_SITE_NAME = 'إسناد'
const ENTRY_JS = '/assets/index.js'
const ARABIC_LETTER_PATTERN = /[\u0600-\u06ff]/u
const ARABIC_DIACRITICS_PATTERN = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/gu
const ARABIC_SEQUENCE_REPLACEMENTS = [
  ['ما بعد', 'baad'],
  ['إي', 'i'],
  ['آ', 'aa'],
  ['نئي', 'enei'],
  ['ئي', 'ei'],
  ['ؤ', 'w'],
  ['ى', 'a'],
  ['ة', 'a'],
]
const ARABIC_CHARACTER_MAP = {
  ا: 'a',
  أ: 'a',
  إ: 'i',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'i',
  ئ: 'e',
  ء: '',
}

function normalizeWhitespace(value = '') {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function stripHtml(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  if ('stringValue' in value) {
    return value.stringValue
  }

  if ('timestampValue' in value) {
    return value.timestampValue
  }

  if ('booleanValue' in value) {
    return value.booleanValue
  }

  if ('integerValue' in value) {
    return Number(value.integerValue)
  }

  if ('doubleValue' in value) {
    return Number(value.doubleValue)
  }

  if ('nullValue' in value) {
    return null
  }

  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(decodeFirestoreValue)
  }

  if ('mapValue' in value) {
    const entries = Object.entries(value.mapValue.fields ?? {})
    return Object.fromEntries(entries.map(([key, nestedValue]) => [key, decodeFirestoreValue(nestedValue)]))
  }

  return undefined
}

function normalizeDocument(document) {
  const fields = Object.entries(document.fields ?? {})
  const data = Object.fromEntries(fields.map(([key, value]) => [key, decodeFirestoreValue(value)]))
  return {
    id: document.name?.split('/').pop() ?? '',
    ...data,
  }
}

function getContentType(article) {
  return article?.content_type?.trim() || article?.contentType?.trim() || 'article'
}

function transliterateArabic(value = '') {
  let normalized = normalizeWhitespace(value)
    .replace(ARABIC_DIACRITICS_PATTERN, '')
    .replace(/ـ/gu, '')

  for (const [source, replacement] of ARABIC_SEQUENCE_REPLACEMENTS) {
    normalized = normalized.replaceAll(source, replacement)
  }

  let transliterated = ''

  for (const character of normalized) {
    transliterated += ARABIC_CHARACTER_MAP[character] ?? character
  }

  return transliterated
}

function createSlug(value = '') {
  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return ''
  }

  const transliterated = ARABIC_LETTER_PATTERN.test(normalized)
    ? transliterateArabic(normalized)
    : normalized

  return anyAscii(transliterated)
    .toLowerCase()
    .replace(/['"`´]+/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function createArticleShareSlug(article) {
  const englishSource = normalizeWhitespace(article?.title_en || article?.slug_en)

  if (englishSource) {
    return createSlug(englishSource)
  }

  return (
    createSlug(article?.title_ar || article?.slug_latin || article?.slug_ar || article?.title || '') ||
    normalizeWhitespace(article?.id || '')
  )
}

function getSharePath(article, fallbackSlug = '', language = 'ar') {
  const slug = createArticleShareSlug(article) || fallbackSlug.trim()
  const contentType = getContentType(article)
  const localizedPrefix = language === 'en' ? '/en' : ''

  if (contentType === 'book') {
    return `${localizedPrefix}/books/${slug}`
  }

  if (contentType === 'research') {
    return `${localizedPrefix}/research/${slug}`
  }

  return `${localizedPrefix}/${slug}`
}

async function queryArticle(projectId, apiKey, field, slug) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: field },
                    op: 'EQUAL',
                    value: { stringValue: slug },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'status' },
                    op: 'EQUAL',
                    value: { stringValue: 'published' },
                  },
                },
              ],
            },
          },
          limit: 1,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Firestore query failed with status ${response.status}`)
  }

  const payload = await response.json()
  const match = payload.find((item) => item.document)
  return match?.document ? normalizeDocument(match.document) : null
}

async function queryPublishedArticles(projectId, apiKey) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'published' },
            },
          },
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Firestore published query failed with status ${response.status}`)
  }

  const payload = await response.json()
  return payload.filter((item) => item.document).map((item) => normalizeDocument(item.document))
}

function matchesArticleSlug(article, slug) {
  return [
    article?.slug_en,
    article?.slug_latin,
    article?.slug_ar,
    createArticleShareSlug(article),
    createSlug(article?.title_en || ''),
    createSlug(article?.title_ar || article?.title || ''),
  ]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .includes(slug)
}

function resolveArticleLanguage(article, slug) {
  const englishMatches = [
    article?.slug_en,
    createSlug(article?.title_en || ''),
  ]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)

  return englishMatches.includes(slug) ? 'en' : 'ar'
}

async function getArticleBySlug(slug) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim()

  if (!projectId || !apiKey || !slug) {
    return null
  }

  const englishMatch = await queryArticle(projectId, apiKey, 'slug_en', slug)

  if (englishMatch) {
    return { article: englishMatch, language: 'en' }
  }

  const latinMatch = await queryArticle(projectId, apiKey, 'slug_latin', slug)

  if (latinMatch) {
    return { article: latinMatch, language: resolveArticleLanguage(latinMatch, slug) }
  }

  const arabicMatch = await queryArticle(projectId, apiKey, 'slug_ar', slug)

  if (arabicMatch) {
    return { article: arabicMatch, language: 'ar' }
  }

  const publishedArticles = await queryPublishedArticles(projectId, apiKey)
  const fallbackMatch = publishedArticles.find((article) => matchesArticleSlug(article, slug))

  if (fallbackMatch) {
    return { article: fallbackMatch, language: resolveArticleLanguage(fallbackMatch, slug) }
  }

  return null
}

function normalizeExpectedType(value) {
  return value === 'book' || value === 'research' || value === 'article' ? value : ''
}

function getTitle(article, language) {
  return language === 'en'
    ? article.title_en || article.title_ar || article.title || 'Untitled'
    : article.title_ar || article.title_en || article.title || 'بدون عنوان'
}

function getExcerpt(article, language) {
  const preferred =
    language === 'en'
      ? article.excerpt_en || article.excerpt_ar || article.excerpt || ''
      : article.excerpt_ar || article.excerpt_en || article.excerpt || ''

  if (preferred) {
    return preferred
  }

  const fallbackBody =
    language === 'en'
      ? article.body_en || article.body_ar || article.body || ''
      : article.body_ar || article.body_en || article.body || ''

  return stripHtml(fallbackBody).slice(0, 180)
}

function getFeaturedImage(article) {
  return article.featured_image || article.featuredImage || article.imageUrl || article.image || article.coverImage || ''
}

function getPreferredSlug(article, fallbackSlug = '') {
  return createArticleShareSlug(article) || fallbackSlug.trim()
}

function encodeUrlPath(path = '/') {
  if (!path || path === '/') {
    return ''
  }

  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildAbsoluteSiteUrl(path = '/') {
  if (!path || path === '/') {
    return DEFAULT_SITE_URL
  }

  return `${DEFAULT_SITE_URL}/${encodeUrlPath(path)}`
}

function renderHtml({ lang, title, description, image, url, ogType, robots }) {
  const resolvedTitle = title || DEFAULT_SITE_TITLE
  const pageTitle = title && title !== DEFAULT_SITE_TITLE ? `${title} | ${DEFAULT_SITE_NAME}` : DEFAULT_SITE_TITLE
  const pageDescription = description || DEFAULT_SITE_DESCRIPTION

  return `<!doctype html>
<html dir="${lang === 'en' ? 'ltr' : 'rtl'}" lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDescription)}" />
    <meta name="keywords" content="صحافة عربية، أخبار، تقارير، تحقيقات، مقالات، إسناد" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="shortcut icon" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${escapeHtml(DEFAULT_SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(resolvedTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDescription || DEFAULT_OG_DESCRIPTION)}" />
    <meta property="og:image" content="${escapeHtml(image || '')}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ar_AR'}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(resolvedTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDescription || DEFAULT_OG_DESCRIPTION)}" />
    <meta name="twitter:image" content="${escapeHtml(image || '')}" />
    <meta name="theme-color" content="#c46a2f" />
    <style>body{margin:0;background:#f5f5f5;color:#1a1a2e}</style>
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
  const expectedType = normalizeExpectedType(request.query.type)

  try {
    const result = await getArticleBySlug(slug)

    if (!result || (expectedType && getContentType(result.article) !== expectedType)) {
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.status(404).send(
        renderHtml({
          lang: 'ar',
          title: DEFAULT_SITE_TITLE,
          description: DEFAULT_OG_DESCRIPTION,
          image: '',
          url: buildAbsoluteSiteUrl(slug ? `/${slug}` : '/'),
          ogType: 'website',
          robots: 'noindex, follow',
        }),
      )
      return
    }

    const { article, language } = result
    const title = getTitle(article, language)
    const description = getExcerpt(article, language)
    const image = getFeaturedImage(article)
    const shareUrl = buildAbsoluteSiteUrl(getSharePath(article, getPreferredSlug(article, slug), language))

    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.status(200).send(
      renderHtml({
        lang: language,
        title,
        description,
        image,
        url: shareUrl,
        ogType: 'article',
        robots: 'index, follow',
      }),
    )
  } catch (error) {
    console.error('[esnad/article-shell] failed to render article metadata', error)
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.status(200).send(
      renderHtml({
        lang: 'ar',
        title: DEFAULT_SITE_TITLE,
        description: DEFAULT_OG_DESCRIPTION,
        image: '',
        url: buildAbsoluteSiteUrl(slug ? `/${slug}` : '/'),
        ogType: 'website',
        robots: 'index, follow',
      }),
    )
  }
}
