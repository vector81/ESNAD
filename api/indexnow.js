import { getRequestIdentity, getPublicationByReference } from './_lib/publications.js'
import { setCorsHeaders, readJsonBody } from './_lib/http.js'
import { submitIndexNow } from './_lib/indexnow.js'
import { publicationPath } from '../src/lib/seoMetadata.js'
export default async function handler(request, response) {
  setCorsHeaders(response, request)
  response.setHeader('Cache-Control', 'no-store')
  if (request.method === 'OPTIONS') { response.status(204).end(); return }
  if (request.method !== 'POST') { response.status(405).json({ error: 'method_not_allowed' }); return }
  try {
    const identity = await getRequestIdentity(request)
    if (!identity.isAdmin) { response.status(403).json({ error: 'admin_required' }); return }
    const body = await readJsonBody(request)
    const publication = typeof body.reference === 'string' ? await getPublicationByReference(body.reference) : null
    if (!publication) { response.status(404).json({ error: 'published_publication_required' }); return }
    const result = await submitIndexNow([`https://esnads.net${publicationPath(publication)}`, 'https://esnads.net', 'https://esnads.net/library', 'https://esnads.net/feed.xml', 'https://esnads.net/sitemap.xml', `https://esnads.net/topics/${publication.category}`])
    response.status(200).json(result)
  } catch (error) { console.error('[esnad/indexnow]', error); response.status(503).json({ error: 'indexnow_failed' }) }
}
