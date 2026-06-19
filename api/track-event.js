import { readJsonBody, sendJson, setCorsHeaders } from './_lib/http.js'
import { rateLimit } from './_lib/rate-limit.js'

const ALLOWED_EVENTS = new Set([
  '$pageview',
  'article_viewed',
  'publication_viewed',
  'article_read_time',
  'publication_read_time',
])

function getPostHogHost() {
  return (
    process.env.POSTHOG_INGEST_HOST?.trim() ||
    process.env.VITE_POSTHOG_HOST?.trim() ||
    'https://us.i.posthog.com'
  ).replace(/\/+$/, '')
}

function getClientIp(request) {
  const forwardedFor = request.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.socket?.remoteAddress || ''
}

function cleanProperties(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => typeof key === 'string' && key.length > 0 && key.length < 80)
      .filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item) || item === null)
      .map(([key, item]) => [
        key,
        typeof item === 'string' ? item.slice(0, 500) : item,
      ]),
  )
}

export default async function handler(request, response) {
  setCorsHeaders(response, request)

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'method_not_allowed' })
    return
  }

  const limited = rateLimit(request, { maxRequests: 60, keyPrefix: 'track-event' })
  if (limited) {
    response.setHeader('Retry-After', String(limited.retryAfter))
    sendJson(response, 429, { error: 'rate_limited' })
    return
  }

  try {
    const token = process.env.VITE_POSTHOG_TOKEN?.trim()
    if (!token) {
      sendJson(response, 200, { ok: false, configured: false })
      return
    }

    const body = await readJsonBody(request, { maxBytes: 16 * 1024 })
    const event = typeof body?.event === 'string' ? body.event.trim() : ''
    const distinctId = typeof body?.distinct_id === 'string' ? body.distinct_id.trim() : ''

    if (!ALLOWED_EVENTS.has(event) || !distinctId) {
      sendJson(response, 400, { error: 'invalid_event' })
      return
    }

    const properties = {
      ...cleanProperties(body?.properties),
      $ip: getClientIp(request),
      source: 'esnad_server_capture',
    }

    const posthogResponse = await fetch(`${getPostHogHost()}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: token,
        event,
        distinct_id: distinctId,
        properties,
      }),
    })

    if (!posthogResponse.ok) {
      const message = await posthogResponse.text().catch(() => '')
      sendJson(response, 502, { error: 'posthog_capture_failed', message })
      return
    }

    sendJson(response, 200, { ok: true })
  } catch (error) {
    sendJson(response, 500, {
      error: 'track_event_failed',
      message: error instanceof Error ? error.message : 'Failed to track event.',
    })
  }
}
