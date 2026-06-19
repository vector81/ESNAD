import { isAllowedAdminEmail, requireUser } from './_lib/admin-auth.js'
import { readJsonBody, sendJson, setCorsHeaders } from './_lib/http.js'
import { rateLimit } from './_lib/rate-limit.js'
import {
  canAccessPublication,
  getPublishedPublicationById,
} from './_lib/publications.js'

function getSafeFileName(publication) {
  const raw = publication.title_en || publication.title_ar || publication.id || 'publication'
  const safe = String(raw)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  return `${safe || 'publication'}.pdf`
}

function isDownloadableUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
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

  const limited = rateLimit(request, { maxRequests: 20, keyPrefix: 'publication-download' })
  if (limited) {
    response.setHeader('Retry-After', String(limited.retryAfter))
    sendJson(response, 429, { error: 'rate_limited' })
    return
  }

  try {
    const user = await requireUser(request)
    const body = await readJsonBody(request, { maxBytes: 2048 })
    const publicationId = typeof body?.publicationId === 'string' ? body.publicationId.trim() : ''

    if (!publicationId) {
      sendJson(response, 400, { error: 'missing_publication' })
      return
    }

    const publication = await getPublishedPublicationById(publicationId)
    if (!publication || !publication.pdf_url) {
      sendJson(response, 404, { error: 'publication_not_found' })
      return
    }

    const canAccess = await canAccessPublication(publication, {
      user,
      isAdmin: isAllowedAdminEmail(user.email),
    })
    if (!canAccess) {
      sendJson(response, 403, { error: 'purchase_required' })
      return
    }

    if (!isDownloadableUrl(publication.pdf_url)) {
      sendJson(response, 400, { error: 'invalid_pdf_url' })
      return
    }

    const upstream = await fetch(publication.pdf_url, { redirect: 'follow' })
    if (!upstream.ok) {
      sendJson(response, 502, { error: 'pdf_fetch_failed' })
      return
    }

    const contentType = upstream.headers.get('content-type') || 'application/pdf'
    const buffer = Buffer.from(await upstream.arrayBuffer())

    response.setHeader('Content-Type', contentType)
    response.setHeader('Content-Length', String(buffer.length))
    response.setHeader('Content-Disposition', `attachment; filename="${getSafeFileName(publication)}"`)
    response.status(200).send(buffer)
  } catch (error) {
    if (error instanceof Error && error.message === 'missing_token') {
      sendJson(response, 401, { error: 'unauthorized' })
      return
    }

    console.error('[esnad/publication-download] failed', error)
    sendJson(response, 500, { error: 'download_failed' })
  }
}
