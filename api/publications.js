import { rateLimit } from './_lib/rate-limit.js'
import { sendJson, setCorsHeaders } from './_lib/http.js'
import {
  canAccessPublication,
  getPublicationByReference,
  getRequestIdentity,
  listPublishedPublications,
  sanitizePublication,
} from './_lib/publications.js'

export default async function handler(request, response) {
  setCorsHeaders(response, request)

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'method_not_allowed' })
    return
  }

  const limited = rateLimit(request, { maxRequests: 120, keyPrefix: 'publications' })
  if (limited) {
    response.setHeader('Retry-After', String(limited.retryAfter))
    sendJson(response, 429, { error: 'rate_limited' })
    return
  }

  try {
    const identity = await getRequestIdentity(request)
    const reference = typeof request.query.reference === 'string' ? request.query.reference.trim() : ''

    if (reference) {
      const publication = await getPublicationByReference(reference)
      if (!publication) {
        sendJson(response, 404, { publication: null })
        return
      }

      const canAccess = await canAccessPublication(publication, identity)
      sendJson(response, 200, {
        publication: sanitizePublication(publication, canAccess, { includeContent: true }),
      })
      return
    }

    const publications = await listPublishedPublications()
    const sanitized = await Promise.all(
      publications.map(async (publication) => (
        sanitizePublication(publication, await canAccessPublication(publication, identity), { includeContent: false })
      )),
    )

    sendJson(response, 200, { publications: sanitized })
  } catch (error) {
    console.error('[esnad/publications] failed', error)
    sendJson(response, 500, { error: 'publications_failed' })
  }
}

