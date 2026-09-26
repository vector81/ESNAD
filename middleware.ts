import { next, rewrite } from '@vercel/functions'

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
const CATALOG_ROUTE_PATTERN = /^\/(?:(en)(?:\/)?)?(?:(articles|library|books)\/?)?$/i
const SHORT_ID_PATTERN = /^\d+$/

export const config = {
  matcher: [
    '/',
    '/en',
    '/en/:path*',
    '/articles',
    '/en/articles',
    '/library',
    '/en/library',
    '/books',
    '/en/books',
    '/library/:slug*',
    '/books/:slug*',
    '/en/library/:slug*',
    '/en/books/:slug*',
  ],
}

async function resolveCanonicalPath(request: Request, section: string, language: string, slug: string) {
  const resolverUrl = new URL('/api/publication-shell', request.url)
  resolverUrl.searchParams.set('section', section.toLowerCase())
  resolverUrl.searchParams.set('lang', language)
  resolverUrl.searchParams.set('slug', slug)
  resolverUrl.searchParams.set('format', 'json')

  try {
    const response = await fetch(resolverUrl, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return ''

    const payload = await response.json() as { canonicalPath?: string }
    return typeof payload.canonicalPath === 'string' ? payload.canonicalPath : ''
  } catch {
    return ''
  }
}

// English views remain accessible, but their initial HTML identifies the Arabic
// URL even on routes that are not handled by the crawler publication renderer.
async function renderEnglishAppShell(request: Request, pathname: string) {
  const shell = await fetch(new URL('/index.html', request.url))
  if (!shell.ok) return new Response('Unable to load page', { status: 503 })
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
  const userAgent = request.headers.get('user-agent') || ''
  const normalizedUserAgent = userAgent.toLowerCase()

  const requestUrl = new URL(request.url)
  const isEnglishRoute = /^\/en(?:\/|$)/.test(requestUrl.pathname)
  const isExplicitCrawler = CRAWLER_USER_AGENT_TOKENS.some((token) => normalizedUserAgent.includes(token))
  const isKnownRealBrowser = REAL_BROWSER_USER_AGENT_PATTERN.test(userAgent)
  const shouldServeBrowserApp = !isExplicitCrawler && isKnownRealBrowser

  const catalogMatch = requestUrl.pathname.match(CATALOG_ROUTE_PATTERN)
  if (catalogMatch && !shouldServeBrowserApp) {
    const [, languagePrefix, section] = catalogMatch
    const metadataUrl = new URL('/api/publication-shell', request.url)
    metadataUrl.searchParams.set('mode', 'catalog')
    metadataUrl.searchParams.set('lang', languagePrefix === 'en' ? 'en' : 'ar')
    metadataUrl.searchParams.set('section', section?.toLowerCase() || 'home')
    return rewrite(metadataUrl)
  }

  const match = requestUrl.pathname.match(ROUTE_PATTERN)

  if (!match) {
    return isEnglishRoute ? renderEnglishAppShell(request, requestUrl.pathname) : next()
  }

  const [, languagePrefix, section, slug] = match
  const language = languagePrefix === 'en' ? 'en' : 'ar'

  if (!isEnglishRoute && !SHORT_ID_PATTERN.test(slug)) {
    const canonicalPath = await resolveCanonicalPath(request, section, language, slug)
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
