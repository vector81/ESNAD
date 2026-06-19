const ALLOWED_ORIGINS = [
  'https://esnads.net',
  'https://www.esnads.net',
  'https://editor.esnads.net',
  process.env.VITE_PUBLIC_SITE_URL,
  process.env.VITE_EDITOR_SITE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
].filter(Boolean)

const DEFAULT_MAX_JSON_BYTES = 64 * 1024

export function setCorsHeaders(response, request) {
  const origin = request?.headers?.origin || ''
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    process.env.NODE_ENV === 'development'

  response.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : ALLOWED_ORIGINS[0])
  response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Vary', 'Origin')
}

export function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload)
}

export async function readJsonBody(request, { maxBytes = DEFAULT_MAX_JSON_BYTES } = {}) {
  if (request.body && typeof request.body === 'object') {
    const approximateSize = Buffer.byteLength(JSON.stringify(request.body), 'utf8')
    if (approximateSize > maxBytes) {
      throw new Error('payload_too_large')
    }
    return request.body
  }

  if (typeof request.body === 'string' && request.body.trim()) {
    if (Buffer.byteLength(request.body, 'utf8') > maxBytes) {
      throw new Error('payload_too_large')
    }
    return JSON.parse(request.body)
  }

  const chunks = []
  let totalBytes = 0

  for await (const chunk of request) {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    totalBytes += Buffer.byteLength(text, 'utf8')
    if (totalBytes > maxBytes) {
      throw new Error('payload_too_large')
    }
    chunks.push(text)
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
