import { rateLimit } from './_lib/rate-limit.js'
import { sendJson, setCorsHeaders } from './_lib/http.js'
import {
  canAccessPublication,
  getPublishedPublicationById,
  getRequestIdentity,
  listChaptersForPublication,
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

  const limited = rateLimit(request, { maxRequests: 90, keyPrefix: 'publication-chapters' })
  if (limited) {
    response.setHeader('Retry-After', String(limited.retryAfter))
    sendJson(response, 429, { error: 'rate_limited' })
    return
  }

  try {
    const publicationId = typeof request.query.publicationId === 'string' ? request.query.publicationId.trim() : ''
    if (!publicationId) {
      sendJson(response, 400, { error: 'missing_publication' })
      return
    }

    const publication = await getPublishedPublicationById(publicationId)
    if (!publication) {
      sendJson(response, 404, { error: 'publication_not_found' })
      return
    }

    const identity = await getRequestIdentity(request)
    const canAccess = await canAccessPublication(publication, identity)
    if (!canAccess) {
      sendJson(response, 403, { error: 'purchase_required' })
      return
    }

    sendJson(response, 200, { chapters: await listChaptersForPublication(publication.id) })
  } catch (error) {
    console.error('[esnad/publication-chapters] failed', error)
    sendJson(response, 500, { error: 'chapters_failed' })
  }
}

