const ALLOWED_ORIGINS = [
  'https://esnads.net',
  'https://www.esnads.net',
  'https://editor.esnads.net',
  process.env.VITE_PUBLIC_SITE_URL,
  process.env.VITE_EDITOR_SITE_URL,
].filter(Boolean)

export function setCorsHeaders(response, request) {
  const origin = request?.headers?.origin || ''
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    process.env.NODE_ENV === 'development'

  response.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : ALLOWED_ORIGINS[0])
  response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Vary', 'Origin')
}

export function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload)
}

export async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body
  }

  if (typeof request.body === 'string' && request.body.trim()) {
    return JSON.parse(request.body)
  }

  const chunks = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'))
  }

  const rawBody = chunks.join('').trim()
  return rawBody ? JSON.parse(rawBody) : {}
}

export function getBearerToken(request) {
  const authorizationHeader = request.headers.authorization || request.headers.Authorization

  if (typeof authorizationHeader !== 'string') {
    return ''
  }

  const [scheme, token] = authorizationHeader.split(' ')
  return scheme === 'Bearer' ? token?.trim() || '' : ''
}
