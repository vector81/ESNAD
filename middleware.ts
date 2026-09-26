import { next, rewrite } from '@vercel/functions'
import { renderPageError } from './api/_lib/page-error.js'

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
const SHORT_ID_PATTERN = /^\d+$/

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

    const payload = await response.json() as { canonicalPath?: string }
    if (!payload.canonicalPath) return { status: 503 as const, canonicalPath: '' }
    return { status: 200 as const, canonicalPath: payload.canonicalPath }
  } catch {
    return { status: 503 as const, canonicalPath: '' }
  }
}

// English views remain accessible, but their initial HTML identifies the Arabic
// URL even on routes that are not handled by the crawler publication renderer.
async function renderEnglishAppShell(request: Request, pathname: string) {
  const shell = await fetch(new URL('/index.html', request.url)).catch(() => null)
  if (!shell?.ok) return pageError(503, 'en')
  const path = pathname.replace(/^\/en(?=\/|$)/, '') || '/'
  const canonical = `https://esnads.net${path === '/' ? '' : path}`
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
  const html = (await shell.text())
    .replace(/<link\b[^>]*hreflang="en"[^>]*>/gi, '')
    .replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*/gi, (_match, prefix) => `${prefix}${canonical}`)
    .replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*/gi, (_match, prefix) => `${prefix}${canonical}`)
    .replace(/(<link\b[^>]*hreflang="(?:ar|x-default)"[^>]*href=")[^"]*/gi, (_match, prefix) => `${prefix}${canonical}`)
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
      /^\/(?:index\.html|favicon\.svg|logo\.png|newlogo\.png|robots\.txt|sitemap\.xml|llms?\.(?:txt|text))$/.test(requestUrl.pathname)) return next()
  const isEnglishRoute = /^\/en(?:\/|$)/.test(requestUrl.pathname)
  const isExplicitCrawler = CRAWLER_USER_AGENT_TOKENS.some((token) => normalizedUserAgent.includes(token))
  const isKnownRealBrowser = REAL_BROWSER_USER_AGENT_PATTERN.test(userAgent)
  const shouldServeBrowserApp = !isExplicitCrawler && isKnownRealBrowser

  const catalogMatch = requestUrl.pathname.match(CATALOG_ROUTE_PATTERN)
  if (catalogMatch) {
    const [, languagePrefix, section] = catalogMatch
    const metadataUrl = new URL('/api/publication-shell', request.url)
    metadataUrl.searchParams.set('mode', 'catalog')
    metadataUrl.searchParams.set('lang', languagePrefix === 'en' ? 'en' : 'ar')
    metadataUrl.searchParams.set('section', section?.toLowerCase() || 'home')
    if (!shouldServeBrowserApp) return rewrite(metadataUrl)
    const catalog = await fetch(metadataUrl, { signal: AbortSignal.timeout(20000) }).catch(() => null)
    if (!catalog?.ok) return pageError(503, isEnglishRoute ? 'en' : 'ar')
  }

  const match = requestUrl.pathname.match(ROUTE_PATTERN)

  if (!match) {
    const reader = requestUrl.pathname.match(/^\/(?:en\/)?reader\/([^/]+)\/?$/)
    if (reader) {
      const result = await resolvePublication(request, 'library', isEnglishRoute ? 'en' : 'ar', reader[1])
      if (result.status !== 200) return pageError(result.status, isEnglishRoute ? 'en' : 'ar')
    } else if (!catalogMatch && !/^\/(?:en\/)?(?:about|contact|login|register|dashboard)\/?$/.test(requestUrl.pathname)) {
      return pageError(404, isEnglishRoute ? 'en' : 'ar')
    }
    return isEnglishRoute ? renderEnglishAppShell(request, requestUrl.pathname) : next()
  }

  const [, languagePrefix, section, slug] = match
  const language = languagePrefix === 'en' ? 'en' : 'ar'

  const result = await resolvePublication(request, section, language, slug)
  if (result.status !== 200) return pageError(result.status, language)

  if (!isEnglishRoute && !SHORT_ID_PATTERN.test(slug)) {
    const canonicalPath = result.canonicalPath
    if (canonicalPath && canonicalPath !== requestUrl.pathname) {
      const redirectUrl = new URL(canonicalPath, request.url)
      redirectUrl.search = requestUrl.search
      return Response.redirect(redirectUrl, 301)
    }
  }

  if (shouldServeBrowserApp) {
    return isEnglishRoute ? renderEnglishAppShell(request, requestUrl.pathname) : next()
  }

  const metadataUrl = new URL('/api/publication-shell', request.url)
  metadataUrl.searchParams.set('section', section.toLowerCase())
  metadataUrl.searchParams.set('lang', language)
  metadataUrl.searchParams.set('slug', slug)

  return rewrite(metadataUrl)
}
