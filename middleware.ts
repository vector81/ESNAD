import { next, rewrite } from '@vercel/functions'
import { renderPageError } from './api/_lib/page-error.js'
import { serializeStructuredData, getPublicationImage } from './src/lib/structuredData.js'
import { PAGE_SEO } from './src/lib/seoMetadata.js'
import { articleImageUrl, priorityArticleImage, articleImageSrcSet, ARTICLE_IMAGE_SIZES } from './src/lib/articleImages.js'

const CRAWLER_USER_AGENT_TOKENS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'claude-web',
  'Google-Extended',
  'Googlebot',
  'PerplexityBot',
  'Perplexity-User',
  'bingbot',
  'Amazonbot',
  'Applebot',
  'Applebot-Extended',
  'meta-externalagent',
  'Bytespider',
  'MistralAI-User',
  'DuckAssistBot',
  'CCBot',
  'facebookexternalhit',
  'WhatsApp',
  'Twitterbot',
  'Telegram',
  'Slackbot',
  'LinkedInBot',
  'Discordbot',
].map((token) => token.toLowerCase())

const REAL_BROWSER_USER_AGENT_PATTERN =
  /(Chrome|CriOS|Firefox|FxiOS|Safari|Edg|OPR|Opera|SamsungBrowser|DuckDuckGo|YaBrowser|iPhone|iPad|Android)/i

const ROUTE_PATTERN = /^\/(?:(en)\/)?(library|books)\/([^/?#]+)\/?$/i
const CATALOG_ROUTE_PATTERN = /^(?:\/(en))?(?:\/(articles|library|books))?\/?$/i

export const config = { matcher: ['/:path*'] }

function pageError(status: 404 | 503, language: string) {
  return new Response(renderPageError(status, language), {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, follow',
      ...(status === 503 ? { 'retry-after': '60' } : {}),
    },
  })
}

async function resolvePublication(request: Request, section: string, language: string, slug: string) {
  const resolverUrl = new URL('/api/publication-shell', request.url)
  resolverUrl.searchParams.set('section', section.toLowerCase())
  resolverUrl.searchParams.set('lang', language)
  resolverUrl.searchParams.set('slug', slug)
  resolverUrl.searchParams.set('format', 'json')

  try {
    const response = await fetch(resolverUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 404) return { status: 404 as const, canonicalPath: '' }
    if (!response.ok) return { status: 503 as const, canonicalPath: '' }

    const payload = await response.json() as { canonicalPath?: string; articleJsonLd?: Record<string, unknown>; breadcrumbJsonLd?: Record<string, unknown>; title?: string; description?: string; image?: string; publication?: Record<string, unknown>; initialHtml?: string }
    if (!payload.canonicalPath) return { status: 503 as const, canonicalPath: '' }
    return { status: 200 as const, ...payload, canonicalPath: payload.canonicalPath }
  } catch {
    return { status: 503 as const, canonicalPath: '' }
  }
}

// Render route-specific canonical metadata before the client app starts.
async function renderAppShell(request: Request, pathname: string, language = 'en', articleJsonLd?: Record<string, unknown>, metadata?: {title?: string; description?: string; image?: string; breadcrumbJsonLd?: Record<string, unknown>; publication?: Record<string, unknown>; publications?: unknown[]; jsonLd?: Record<string, unknown>; initialHtml?: string}) {
  const shell = await fetch(new URL('/index.html', request.url)).catch(() => null)
  if (!shell?.ok) return pageError(503, language)
  const path = pathname === '/en' ? '/en' : pathname.replace(/^\/en(?=\/|$)/, '') || '/'
  const meta: typeof metadata = metadata || PAGE_SEO[path]
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
  const canonical = `https://esnads.net${path === '/' ? '' : path}`
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
  let html = (await shell.text())
    .replace(/<link\b[^>]*hreflang="[^"]*"[^>]*>/gi, '')
    .replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*/gi, (_match, prefix) => `${prefix}${canonical}`)
    .replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*/gi, (_match, prefix) => `${prefix}${canonical}`)
    .replace(/(<link\b[^>]*hreflang="(?:ar|x-default)"[^>]*href=")[^"]*/gi, (_match, prefix) => `${prefix}${canonical}`)
  if (metadata?.jsonLd || (path !== '/' && path !== '/en')) html = html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, '')
  if (meta?.title) html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(meta.title)}</title>`).replace(/(<meta\b[^>]*(?:property="og:title"|name="twitter:title")[^>]*content=")[^"]*/g, (_match, prefix) => `${prefix}${escape(meta.title!)}`)
  if (meta?.description) html = html.replace(/(<meta\b[^>]*(?:name="description"|property="og:description"|name="twitter:description")[^>]*content=")[^"]*/g, (_match, prefix) => `${prefix}${escape(meta.description!)}`)
  if (meta?.image) html = html.replace(/(<meta\b[^>]*(?:property="og:image"|name="twitter:image")[^>]*content=")[^"]*/g, (_match, prefix) => `${prefix}${escape(meta.image!)}`)
  if (articleJsonLd) html = html.replace('property="og:type" content="website"', 'property="og:type" content="article"')
  const publications = metadata?.publications as Array<{ id?: string; cover_image?: string; featured?: boolean }> | undefined
  const feature = path === '/' || path === '/en' ? publications?.find(pub => pub.featured) || publications?.[0] : metadata?.publication
  const homeImage = !metadata?.publication && feature ? getPublicationImage(feature) : ''
  let preloadImage = homeImage ? articleImageUrl(homeImage, true) : ''
  const firstArticleImage = priorityArticleImage(metadata?.publication?.content_json)
  if (firstArticleImage) preloadImage = articleImageUrl(firstArticleImage, true)
  const responsiveImage = articleImageSrcSet(firstArticleImage || homeImage)
  const responsiveSizes = homeImage ? '(max-width: 800px) calc(100vw - 58px), 480px' : ARTICLE_IMAGE_SIZES
  if (preloadImage) html = html.replace('</head>', `<link rel="preload" as="image" fetchpriority="high" href="${escape(preloadImage)}"${responsiveImage ? ` imagesrcset="${escape(responsiveImage)}" imagesizes="${escape(responsiveSizes)}"` : ''} /></head>`)
  const extra = `${articleJsonLd ? `<script id="publication-jsonld" type="application/ld+json">${serializeStructuredData(articleJsonLd)}</script>` : ''}${metadata?.breadcrumbJsonLd ? `<script id="publication-breadcrumb-jsonld" type="application/ld+json">${serializeStructuredData(metadata.breadcrumbJsonLd)}</script>` : ''}${metadata?.jsonLd ? `<script type="application/ld+json">${serializeStructuredData(metadata.jsonLd)}</script>` : ''}${metadata?.publications ? `<script id="initial-catalog-data" type="application/json">${serializeStructuredData(metadata.publications)}</script>` : ''}${metadata?.publication ? `<script id="initial-publication-data" type="application/json">${serializeStructuredData(metadata.publication)}</script>` : ''}${path === '/' || path === '/en' ? '<link rel="alternate" hreflang="ar" href="https://esnads.net" /><link rel="alternate" hreflang="en" href="https://esnads.net/en" /><link rel="alternate" hreflang="x-default" href="https://esnads.net" />' : ''}`
  html = html.replace('</head>', `${extra}</head>`).replace('<html lang="ar">', `<html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}">`)
  if (metadata?.initialHtml && !/^\/(?:en\/)?reader\//.test(new URL(request.url).pathname)) html = html.replace('<div id="root"></div>', `<div id="root">${metadata.initialHtml}</div><script>try { if (localStorage.getItem('esnad_analytics_consent_v2') === 'accepted') document.querySelector('#root > .cookie-modal')?.remove() } catch {}</script>`)
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' },
  })
}

export default async function middleware(request: Request) {
  // This middleware belongs to the public frontend, not the editor deployment.
  if (process.env.VERCEL_PROJECT_ID === 'prj_oUbhx3NJJTS9ltbBExkBNVIHgSST') return next()
  const userAgent = request.headers.get('user-agent') || ''
  const normalizedUserAgent = userAgent.toLowerCase()

  const requestUrl = new URL(request.url)
  if (/^\/(?:api|assets|data|_vercel)(?:\/|$)/.test(requestUrl.pathname) ||
      /^\/(?:index\.html|favicon\.svg|logo\.png|newlogo\.png|robots\.txt|sitemap\.xml|feed\.xml|[a-f0-9]{32}\.txt|llms?\.(?:txt|text))$/.test(requestUrl.pathname)) return next()
  const isEnglishRoute = /^\/en(?:\/|$)/.test(requestUrl.pathname)
  const isExplicitCrawler = CRAWLER_USER_AGENT_TOKENS.some((token) => normalizedUserAgent.includes(token))
  const isKnownRealBrowser = REAL_BROWSER_USER_AGENT_PATTERN.test(userAgent)
  const shouldServeBrowserApp = !isExplicitCrawler && isKnownRealBrowser

  const topicMatch = requestUrl.pathname.match(/^\/topics\/([a-z-]+)\/?$/)
  const catalogMatch = requestUrl.pathname.match(CATALOG_ROUTE_PATTERN)
  if (catalogMatch || topicMatch) {
    const [, languagePrefix, section] = catalogMatch || []
    const metadataUrl = new URL('/api/publication-shell', request.url)
    metadataUrl.searchParams.set('mode', 'catalog')
    metadataUrl.searchParams.set('lang', languagePrefix === 'en' ? 'en' : 'ar')
    metadataUrl.searchParams.set('section', topicMatch?.[1] || section?.toLowerCase() || 'home')
    if (!shouldServeBrowserApp) return rewrite(metadataUrl)
    metadataUrl.searchParams.set('format', 'json')
    const catalog = await fetch(metadataUrl, { signal: AbortSignal.timeout(20000) }).catch(() => null)
    if (catalog?.status === 404) return pageError(404, 'ar')
    if (!catalog?.ok) return pageError(503, isEnglishRoute ? 'en' : 'ar')
    const data = await catalog.json() as { meta: {title:string; description:string}; publications: unknown[]; jsonLd: Record<string, unknown>; initialHtml?: string }
    const title = data.meta.title.includes(' | ') || /^(?:مركز إسناد|Esnad Center)/.test(data.meta.title) ? data.meta.title : `${data.meta.title} | إسناد`
    return renderAppShell(request, requestUrl.pathname, isEnglishRoute ? 'en' : 'ar', undefined, { ...data.meta, title, publications: data.publications, jsonLd: data.jsonLd, initialHtml: data.initialHtml })
  }

  const match = requestUrl.pathname.match(ROUTE_PATTERN)

  if (!match) {
    const reader = requestUrl.pathname.match(/^\/(?:en\/)?reader\/([^/]+)\/?$/)
    if (reader) {
      const result = await resolvePublication(request, 'library', isEnglishRoute ? 'en' : 'ar', reader[1])
      if (result.status !== 200) return pageError(result.status, isEnglishRoute ? 'en' : 'ar')
      return renderAppShell(request, result.canonicalPath, isEnglishRoute ? 'en' : 'ar', result.articleJsonLd, result)
    } else if (!catalogMatch && !/^\/(?:en\/)?(?:about|contact|login|register|dashboard)\/?$/.test(requestUrl.pathname)) {
      return pageError(404, isEnglishRoute ? 'en' : 'ar')
    }
    return renderAppShell(request, requestUrl.pathname, isEnglishRoute ? 'en' : 'ar')
  }

  const [, languagePrefix, section, slug] = match
  const language = languagePrefix === 'en' ? 'en' : 'ar'

  const result = await resolvePublication(request, section, language, slug)
  if (result.status !== 200) return pageError(result.status, language)

  if (!isEnglishRoute) {
    const canonicalPath = result.canonicalPath
    if (canonicalPath && canonicalPath !== requestUrl.pathname.replace(/\/$/, '')) {
      const redirectUrl = new URL(canonicalPath, request.url)
      redirectUrl.search = requestUrl.search
      return Response.redirect(redirectUrl, 301)
    }
  }

  if (shouldServeBrowserApp) {
    return renderAppShell(request, result.canonicalPath, language, result.articleJsonLd, result)
  }

  const metadataUrl = new URL('/api/publication-shell', request.url)
  metadataUrl.searchParams.set('section', section.toLowerCase())
  metadataUrl.searchParams.set('lang', language)
  metadataUrl.searchParams.set('slug', slug)

  return rewrite(metadataUrl)
}
