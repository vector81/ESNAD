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
const SHORT_ID_PATTERN = /^\d+$/

export const config = {
  matcher: ['/library/:slug*', '/books/:slug*', '/en/library/:slug*', '/en/books/:slug*'],
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

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || ''
  const normalizedUserAgent = userAgent.toLowerCase()

  const requestUrl = new URL(request.url)
  const match = requestUrl.pathname.match(ROUTE_PATTERN)

  if (!match) {
    return next()
  }

  const [, languagePrefix, section, slug] = match
  const language = languagePrefix === 'en' ? 'en' : 'ar'

  if (!SHORT_ID_PATTERN.test(slug)) {
    const canonicalPath = await resolveCanonicalPath(request, section, language, slug)
    if (canonicalPath && canonicalPath !== requestUrl.pathname) {
      const redirectUrl = new URL(canonicalPath, request.url)
      redirectUrl.search = requestUrl.search
      return Response.redirect(redirectUrl, 301)
    }
  }

  const isExplicitCrawler = CRAWLER_USER_AGENT_TOKENS.some((token) => normalizedUserAgent.includes(token))
  const isKnownRealBrowser = REAL_BROWSER_USER_AGENT_PATTERN.test(userAgent)

  if (!isExplicitCrawler && isKnownRealBrowser) {
    return next()
  }

  const metadataUrl = new URL('/api/publication-shell', request.url)
  metadataUrl.searchParams.set('section', section.toLowerCase())
  metadataUrl.searchParams.set('lang', language)
  metadataUrl.searchParams.set('slug', slug)

  return rewrite(metadataUrl)
}
