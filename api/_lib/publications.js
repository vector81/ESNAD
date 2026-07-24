import { PUBLICATION_ID_MAP } from './publication-id-map.js'
import { getBearerToken } from './http.js'
import { isAllowedAdminEmail } from './admin-auth.js'

const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{6,120}$/
const SLUG_FIELDS = ['slug', 'slug_ar', 'slugAr', 'slug_latin', 'slugLatin', 'slug_en', 'slugEn']

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function slugifyLatin(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/['"`´]+/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeArabicDigits(value = '') {
  const easternArabicDigits = '٠١٢٣٤٥٦٧٨٩'
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
  return String(value).replace(/[٠-٩۰-۹]/g, (digit) => {
    const easternIndex = easternArabicDigits.indexOf(digit)
    if (easternIndex !== -1) return String(easternIndex)
    return String(persianDigits.indexOf(digit))
  })
}

function slugifyArabic(value = '') {
  return normalizeArabicDigits(value)
    .trim()
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{Script=Arabic}\p{N}\s-]/gu, ' ')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function getFirebaseAdmin() {
  return await import('./firebase-admin.js')
}

function hasRestConfig() {
  return Boolean(process.env.VITE_FIREBASE_PROJECT_ID?.trim() && process.env.VITE_FIREBASE_API_KEY?.trim())
}

function hasAdminConfig() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
      (
        process.env.FIREBASE_PROJECT_ID?.trim() &&
        process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
        process.env.FIREBASE_PRIVATE_KEY?.trim()
      ),
  )
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return undefined
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(decodeFirestoreValue)
  }
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, child]) => [
        key,
        decodeFirestoreValue(child),
      ]),
    )
  }
  return undefined
}

function normalizeFirestoreDocument(document) {
  const fields = Object.entries(document.fields ?? {})
  const data = Object.fromEntries(fields.map(([key, value]) => [key, decodeFirestoreValue(value)]))
  return { id: document.name?.split('/').pop() ?? '', ...data }
}

async function firestoreQuery(projectId, apiKey, body) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  )

  if (!response.ok) {
    throw new Error(`Firestore query failed (${response.status})`)
  }

  const payload = await response.json()
  return payload.filter((item) => item.document).map((item) => normalizeFirestoreDocument(item.document))
}

async function firestoreGetPublication(projectId, apiKey, id) {
  const encodedId = encodeURIComponent(id)
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/publications/${encodedId}?key=${apiKey}`,
  )

  if (response.status === 403 || response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Firestore document fetch failed (${response.status})`)
  }

  return normalizeFirestoreDocument(await response.json())
}

function buildPublishedFilter(extraFilter, publishedField) {
  return {
    compositeFilter: {
      op: 'AND',
      filters: [
        {
          fieldFilter: {
            field: { fieldPath: publishedField },
            op: 'EQUAL',
            value: { stringValue: 'published' },
          },
        },
        extraFilter,
      ],
    },
  }
}

function clampCoverPosition(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50
}

function normalizeTags(value) {
  if (!value) return []
  const source = Array.isArray(value) ? value : String(value).split(',')
  return source.map((item) => String(item || '').trim()).filter(Boolean)
}

function deriveNumericPublicationId(value = '') {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return String(1000000 + ((hash >>> 0) % 9000000))
}

export function getPublicPublicationId(publication) {
  const candidates = [
    publication?.public_id,
    publication?.publicId,
    publication?.numeric_id,
    publication?.numericId,
    publication?.article_id,
    publication?.articleId,
    publication?.id,
  ]

  const numericId = candidates
    .map((candidate) => String(candidate || '').trim())
    .find((candidate) => /^\d+$/.test(candidate))

  return numericId || deriveNumericPublicationId(publication?.id || '')
}

export function normalizePublication(id, raw = {}) {
  const now = new Date().toISOString()
  const price = Number(raw.price_aud ?? 0)
  const kind =
    raw.kind === 'book'
      ? 'book'
      : raw.kind === 'article'
        ? 'article'
        : raw.kind === 'research-paper'
          ? 'research-paper'
          : raw.type === 'book'
            ? 'book'
            : 'research-paper'
  const type = kind === 'book' ? 'book' : 'article'
  const workflowStage =
    raw.workflow_stage === 'in_review' ||
    raw.workflow_stage === 'needs_revision' ||
    raw.workflow_stage === 'approved' ||
    raw.workflow_stage === 'published'
      ? raw.workflow_stage
      : 'draft'

  return {
    id,
    public_id: raw.public_id,
    publicId: raw.publicId,
    numeric_id: raw.numeric_id,
    numericId: raw.numericId,
    article_id: raw.article_id,
    articleId: raw.articleId,
    slug: raw.slug?.trim() || slugify(raw.title_en || raw.title_ar || id),
    slug_ar: raw.slug_ar?.trim() || raw.slugAr?.trim() || raw.slug?.trim() || '',
    slug_latin:
      raw.slug_latin?.trim() ||
      raw.slugLatin?.trim() ||
      raw.slug_en?.trim() ||
      raw.slugEn?.trim() ||
      slugifyLatin(raw.title_en || raw.title_ar || raw.slug || id),
    kind,
    type,
    status: raw.status === 'published' || workflowStage === 'published' ? 'published' : 'draft',
    workflow_stage: workflowStage,
    access_tier: raw.access_tier === 'paid' ? 'paid' : 'free',
    price_aud: Number.isFinite(price) ? Math.max(0, price) : 0,
    category: raw.category || 'studies',
    topic_ar: raw.topic_ar?.trim() || '',
    topic_en: raw.topic_en?.trim() || '',
    title_ar: raw.title_ar?.trim() || 'إصدار بلا عنوان',
    title_en: raw.title_en?.trim() || raw.title_ar?.trim() || 'Untitled publication',
    headline_ar: raw.headline_ar?.trim() || '',
    headline_en: raw.headline_en?.trim() || '',
    abstract_ar: raw.abstract_ar?.trim() || '',
    abstract_en: raw.abstract_en?.trim() || raw.abstract_ar?.trim() || '',
    description_ar: raw.description_ar?.trim() || '',
    description_en: raw.description_en?.trim() || raw.description_ar?.trim() || '',
    author_ar: raw.author_ar?.trim() || 'مركز إسناد',
    author_en: raw.author_en?.trim() || raw.author_ar?.trim() || 'Esnad Center',
    cover_image: raw.cover_image?.trim() || '',
    cover_position_x: clampCoverPosition(raw.cover_position_x ?? 50),
    cover_position_y: clampCoverPosition(raw.cover_position_y),
    pdf_url: raw.pdf_url?.trim() || '',
    featured: Boolean(raw.featured),
    language_mode:
      raw.language_mode === 'ar' || raw.language_mode === 'en' || raw.language_mode === 'both'
        ? raw.language_mode
        : 'both',
    pages: Number.isFinite(Number(raw.pages)) ? Math.max(1, Number(raw.pages)) : 1,
    tags_ar: normalizeTags(raw.tags_ar),
    tags_en: normalizeTags(raw.tags_en),
    published_at: raw.published_at?.trim() || now,
    created_at: raw.created_at?.trim() || now,
    updated_at: raw.updated_at?.trim() || now,
    content_json: raw.content_json ?? null,
    toc: Array.isArray(raw.toc) ? raw.toc : [],
  }
}

export function isPublished(publication) {
  return publication?.status === 'published' || publication?.workflow_stage === 'published'
}

function publicationMatchesReference(publication, reference) {
  const trimmedReference = String(reference || '').trim()
  const normalizedArabicReference = slugifyArabic(trimmedReference)
  const candidates = [
    publication.id,
    getPublicPublicationId(publication),
    publication.slug,
    publication.slug_ar,
    publication.slugAr,
    publication.slug_latin,
    publication.slugLatin,
    publication.slug_en,
    publication.slugEn,
    slugifyLatin(publication.title_en || publication.title_ar || publication.slug),
  ]

  if (candidates.map((candidate) => String(candidate || '').trim()).includes(trimmedReference)) {
    return true
  }

  return [
    publication.slug,
    publication.slug_ar,
    publication.slugAr,
    slugifyArabic(publication.title_ar || publication.title_en || publication.slug || ''),
  ]
    .map((candidate) => slugifyArabic(String(candidate || '').trim()))
    .includes(normalizedArabicReference)
}

function snapshotToPublication(documentSnapshot) {
  if (!documentSnapshot.exists) return null
  return normalizePublication(documentSnapshot.id, documentSnapshot.data() || {})
}

async function listPublishedPublicationsFromAdmin() {
  const { getAdminDb } = await getFirebaseAdmin()
  const db = getAdminDb()
  const seen = new Map()

  for (const publishedField of ['status', 'workflow_stage']) {
    const snapshot = await db.collection('publications').where(publishedField, '==', 'published').get()
    for (const doc of snapshot.docs) {
      if (!seen.has(doc.id)) {
        seen.set(doc.id, normalizePublication(doc.id, doc.data()))
      }
    }
  }

  return [...seen.values()].sort(
    (left, right) => new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
  )
}

async function listPublishedPublicationsFromRest() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim()
  if (!projectId || !apiKey) return []

  const seen = new Map()
  for (const publishedField of ['status', 'workflow_stage']) {
    const documents = await firestoreQuery(projectId, apiKey, {
      structuredQuery: {
        from: [{ collectionId: 'publications' }],
        where: {
          fieldFilter: {
            field: { fieldPath: publishedField },
            op: 'EQUAL',
            value: { stringValue: 'published' },
          },
        },
      },
    })

    for (const document of documents) {
      if (!seen.has(document.id)) {
        seen.set(document.id, normalizePublication(document.id, document))
      }
    }
  }

  return [...seen.values()].sort(
    (left, right) => new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
  )
}

export async function listPublishedPublications() {
  if (hasRestConfig()) {
    try {
      return await listPublishedPublicationsFromRest()
    } catch (error) {
      console.error('[esnad/publications] REST list failed; falling back to admin', error)
    }
  }

  if (hasAdminConfig()) {
    try {
      return await listPublishedPublicationsFromAdmin()
    } catch (error) {
      console.error('[esnad/publications] admin list failed', error)
    }
  }

  return []
}

async function getPublishedPublicationByIdFromAdmin(id) {
  const trimmedId = String(id || '').trim()
  if (!DOCUMENT_ID_PATTERN.test(trimmedId)) return null

  const { getAdminDb } = await getFirebaseAdmin()
  const publication = snapshotToPublication(await getAdminDb().collection('publications').doc(trimmedId).get())
  return isPublished(publication) ? publication : null
}

export async function getPublishedPublicationById(id) {
  if (hasRestConfig()) {
    try {
      const trimmedId = String(id || '').trim()
      if (!DOCUMENT_ID_PATTERN.test(trimmedId)) return null

      const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
      const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim()
      if (!projectId || !apiKey) return null

      const document = await firestoreGetPublication(projectId, apiKey, trimmedId)
      const publication = document ? normalizePublication(document.id, document) : null
      if (isPublished(publication)) return publication
    } catch (error) {
      console.error('[esnad/publications] REST document lookup failed; falling back to admin', error)
    }
  }

  if (hasAdminConfig()) {
    try {
      return await getPublishedPublicationByIdFromAdmin(id)
    } catch (error) {
      console.error('[esnad/publications] admin document lookup failed', error)
    }
  }

  return null
}

async function getPublicationByReferenceFromAdmin(reference) {
  const trimmedReference = String(reference || '').trim()
  if (!trimmedReference) return null

  const mappedId = /^\d+$/.test(trimmedReference) ? PUBLICATION_ID_MAP[trimmedReference] : ''
  if (mappedId) {
    const mappedPublication = await getPublishedPublicationById(mappedId)
    if (mappedPublication) return mappedPublication
  }

  const byId = await getPublishedPublicationById(trimmedReference)
  if (byId) return byId

  const { getAdminDb } = await getFirebaseAdmin()
  const db = getAdminDb()
  for (const slugField of SLUG_FIELDS) {
    for (const publishedField of ['status', 'workflow_stage']) {
      const snapshot = await db
        .collection('publications')
        .where(slugField, '==', trimmedReference)
        .where(publishedField, '==', 'published')
        .limit(1)
        .get()

      if (!snapshot.empty) {
        return normalizePublication(snapshot.docs[0].id, snapshot.docs[0].data())
      }
    }
  }

  const publications = await listPublishedPublications()
  return publications.find((publication) => publicationMatchesReference(publication, trimmedReference)) || null
}

async function getPublicationByReferenceFromRest(reference) {
  const trimmedReference = String(reference || '').trim()
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim()
  if (!projectId || !apiKey || !trimmedReference) return null

  if (/^\d+$/.test(trimmedReference)) {
    const mappedId = PUBLICATION_ID_MAP[trimmedReference]
    if (mappedId) {
      const mappedDocument = await firestoreGetPublication(projectId, apiKey, mappedId)
      const mappedPublication = mappedDocument ? normalizePublication(mappedDocument.id, mappedDocument) : null
      if (isPublished(mappedPublication)) return mappedPublication
    }
  }

  if (DOCUMENT_ID_PATTERN.test(trimmedReference)) {
    const document = await firestoreGetPublication(projectId, apiKey, trimmedReference)
    const publication = document ? normalizePublication(document.id, document) : null
    if (isPublished(publication)) return publication
  }

  for (const slugField of SLUG_FIELDS) {
    const slugFilter = {
      fieldFilter: {
        field: { fieldPath: slugField },
        op: 'EQUAL',
        value: { stringValue: trimmedReference },
      },
    }

    for (const publishedField of ['status', 'workflow_stage']) {
      const documents = await firestoreQuery(projectId, apiKey, {
        structuredQuery: {
          from: [{ collectionId: 'publications' }],
          where: buildPublishedFilter(slugFilter, publishedField),
          limit: 1,
        },
      })

      if (documents[0]) {
        return normalizePublication(documents[0].id, documents[0])
      }
    }
  }

  const publications = await listPublishedPublicationsFromRest()
  return publications.find((publication) => publicationMatchesReference(publication, trimmedReference)) || null
}

export async function getPublicationByReference(reference) {
  if (hasRestConfig()) {
    try {
      const publication = await getPublicationByReferenceFromRest(reference)
      if (publication) return publication
    } catch (error) {
      console.error('[esnad/publications] REST reference lookup failed; falling back to admin', error)
    }
  }

  if (hasAdminConfig()) {
    try {
      const publication = await getPublicationByReferenceFromAdmin(reference)
      if (publication) return publication
    } catch (error) {
      console.error('[esnad/publications] admin reference lookup failed', error)
    }
  }

  return null
}

export async function getRequestIdentity(request) {
  const token = getBearerToken(request)
  if (!token) {
    return { user: null, isAdmin: false }
  }

  const decodedToken = await getFirebaseAdmin()
    .then(({ getAdminAuth }) => getAdminAuth().verifyIdToken(token))
    .catch(() => null)

  if (!decodedToken) {
    return { user: null, isAdmin: false }
  }

  return {
    user: decodedToken,
    isAdmin: isAllowedAdminEmail(decodedToken.email),
  }
}

export async function canAccessPublication(publication, identity) {
  if (!publication || publication.access_tier !== 'paid') return true
  if (identity?.isAdmin) return true
  if (!identity?.user?.uid) return false

  try {
    const { getAdminDb } = await getFirebaseAdmin()
    const snapshot = await getAdminDb().collection('user_libraries').doc(identity.user.uid).get()
    const data = snapshot.exists ? snapshot.data() : null
    const purchasedIds = Array.isArray(data?.purchased_item_ids) ? data.purchased_item_ids.map(String) : []
    return purchasedIds.includes(publication.id) || purchasedIds.includes(getPublicPublicationId(publication))
  } catch (error) {
    console.error('[esnad/publications] paid access check failed', error)
    return false
  }
}

export function sanitizePublication(publication, canAccess, { includeContent = true } = {}) {
  const hasPdf = Boolean(publication?.pdf_url)
  const hasContent = Boolean(publication?.content_json)
  const isPaid = publication?.access_tier === 'paid'
  const shouldExposeContent = includeContent && (!isPaid || canAccess)

  return {
    ...publication,
    content_json: shouldExposeContent ? publication.content_json : null,
    // Paid PDF URLs are never sent to the browser; use /api/publication-download.
    pdf_url: !isPaid && includeContent ? publication.pdf_url : '',
    has_pdf: hasPdf,
    has_content: hasContent,
    can_access: Boolean(canAccess),
    is_locked: Boolean(isPaid && !canAccess),
  }
}

export async function listChaptersForPublication(publicationId) {
  const { getAdminDb } = await getFirebaseAdmin()
  const snapshot = await getAdminDb()
    .collection('publications')
    .doc(publicationId)
    .collection('chapters')
    .orderBy('order', 'asc')
    .get()

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}
