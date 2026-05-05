import anyAscii from 'any-ascii'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import type {
  AccessTier,
  AppLanguage,
  Publication,
  PublicationCategory,
  PublicationInput,
  PublicationKind,
} from '../types/publication'
import { db, isFirebaseConfigured, logFirebaseDebug, waitForAuthenticatedUser } from './firebase'
import { uploadFileToFirebaseStorage } from './storageAssets'

export const PUBLICATION_CATEGORIES: Array<{
  id: PublicationCategory
  label_ar: string
  label_en: string
}> = [
  { id: 'studies', label_ar: 'دراسات', label_en: 'Studies' },
  { id: 'policy-paper', label_ar: 'ورقة سياسية', label_en: 'Policy Paper' },
  { id: 'economic-paper', label_ar: 'ورقة اقتصادية', label_en: 'Economic Paper' },
  { id: 'analytical-paper', label_ar: 'ورقة تحليلية', label_en: 'Analytical Paper' },
  { id: 'reports', label_ar: 'تقارير', label_en: 'Reports' },
  { id: 'strategic-estimate', label_ar: 'تقدير موقف', label_en: 'Strategic Estimate' },
  { id: 'situation-assessment', label_ar: 'تقييم وضعية', label_en: 'Situation Assessment' },
  { id: 'legal-paper', label_ar: 'ورقة قانونية', label_en: 'Legal Paper' },
  { id: 'opinion-article', label_ar: 'مقالات رأي', label_en: 'Opinion Articles' },
  { id: 'foresight', label_ar: 'استشراف', label_en: 'Foresight' },
  { id: 'position-analysis', label_ar: 'تحليل موقف', label_en: 'Position Analysis' },
  { id: 'expert-survey', label_ar: 'استطلاع رأي الخبراء', label_en: 'Expert Survey' },
  { id: 'periodic-reports', label_ar: 'تقارير دورية', label_en: 'Periodic Reports' },
  { id: 'case-monitoring', label_ar: 'متابعة حالة', label_en: 'Case Monitoring' },
  { id: 'media-analysis', label_ar: 'تحليل إعلامي', label_en: 'Media Analysis' },
  { id: 'policy-analysis', label_ar: 'تحليل السياسات', label_en: 'Policy Analysis' },
  { id: 'psychological-studies', label_ar: 'دراسات نفسية', label_en: 'Psychological Studies' },
  { id: 'analysis-summary', label_ar: 'خلاصة تحليلات', label_en: 'Analysis Summary' },
  { id: 'information-file', label_ar: 'ملف معلومات', label_en: 'Information File' },
  { id: 'documents', label_ar: 'وثائق', label_en: 'Documents' },
  { id: 'translations', label_ar: 'ترجمات', label_en: 'Translations' },
  { id: 'profile', label_ar: 'بروفايل', label_en: 'Profile' },
  { id: 'concept', label_ar: 'مفهوم', label_en: 'Concept' },
  { id: 'infographic', label_ar: 'إنفوغرافيك', label_en: 'Infographic' },
]

export interface PublicationFilters {
  kind?: PublicationKind | 'all'
  category?: PublicationCategory | 'all'
  access_tier?: AccessTier | 'all'
  topic?: string
  search?: string
}

const LOCAL_STORAGE_KEY = 'esnad_publications_catalog'

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function slugifyLatin(value: string) {
  return anyAscii(value)
    .trim()
    .toLowerCase()
    .replace(/['"`´]+/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function clampCoverPosition(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 50
  return Math.min(100, Math.max(0, num))
}

const clampCoverPositionY = clampCoverPosition

export function getCoverObjectPosition(
  publication: Pick<Publication, 'cover_position_y'> & Partial<Pick<Publication, 'cover_position_x'>>,
): string {
  const x = clampCoverPosition(publication.cover_position_x ?? 50)
  const y = clampCoverPosition(publication.cover_position_y)
  return `${x}% ${y}%`
}

export function getShareSlug(publication: Publication) {
  // Prefer the editor-set slug (Arabic, by design for an Arabic publication).
  // Browsers and Vercel handle Unicode in URL paths fine; share links auto-encode.
  // Fall back to a Latin transliteration only if no slug was ever set on the doc.
  if (publication.slug) return publication.slug
  return slugifyLatin(publication.title_en || publication.title_ar || '') || publication.id
}

function normalizeTags(value: string[] | string | undefined) {
  if (!value) {
    return []
  }
  const source = Array.isArray(value) ? value : value.split(',')
  return source.map((item) => item.trim()).filter(Boolean)
}

function normalizePublication(id: string, raw: Partial<PublicationInput>): Publication {
  const now = new Date().toISOString()
  const price = Number(raw.price_aud ?? 0)
  const kind: PublicationKind =
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
  const workflowStage: import('../types/publication').WorkflowStage =
    raw.workflow_stage === 'in_review'
      ? 'in_review'
      : raw.workflow_stage === 'needs_revision'
        ? 'needs_revision'
        : raw.workflow_stage === 'approved'
          ? 'approved'
          : raw.workflow_stage === 'published'
            ? 'published'
            : 'draft'
  return {
    id,
    slug: raw.slug?.trim() || slugify(raw.title_en || raw.title_ar || id),
    kind,
    type,
    status: raw.status === 'published' || workflowStage === 'published' ? 'published' : 'draft',
    workflow_stage: workflowStage,
    access_tier: raw.access_tier === 'paid' ? 'paid' : 'free',
    price_aud: Number.isFinite(price) ? Math.max(0, price) : 0,
    category: raw.category ?? 'studies',
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
    cover_position_y: clampCoverPositionY(raw.cover_position_y),
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
    content_json: (raw.content_json as Publication['content_json']) ?? null,
    toc: Array.isArray(raw.toc) ? raw.toc : [],
  }
}

function isPublicationPublic(publication: Pick<Publication, 'status' | 'workflow_stage'>) {
  return publication.status === 'published' || publication.workflow_stage === 'published'
}

function matchesSearch(publication: Publication, search: string) {
  const needle = search.trim().toLowerCase()
  if (!needle) {
    return true
  }
  return [
    publication.title_ar,
    publication.title_en,
    publication.abstract_ar,
    publication.abstract_en,
    publication.author_ar,
    publication.author_en,
    publication.topic_ar,
    publication.topic_en,
    ...publication.tags_ar,
    ...publication.tags_en,
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

function filterPublication(publication: Publication, filters: PublicationFilters) {
  if (!isPublicationPublic(publication)) {
    return false
  }
  if (filters.kind && filters.kind !== 'all' && publication.kind !== filters.kind) {
    return false
  }
  if (filters.category && filters.category !== 'all' && publication.category !== filters.category) {
    return false
  }
  if (filters.access_tier && filters.access_tier !== 'all' && publication.access_tier !== filters.access_tier) {
    return false
  }
  if (filters.topic?.trim()) {
    const topic = filters.topic.trim().toLowerCase()
    if (
      !publication.topic_ar.toLowerCase().includes(topic) &&
      !publication.topic_en.toLowerCase().includes(topic)
    ) {
      return false
    }
  }
  return matchesSearch(publication, filters.search ?? '')
}

async function listPublishedPublicationsFromFirestore() {
  if (!db || !isFirebaseConfigured) {
    return sortByPublished(readLocalPublications()).filter(isPublicationPublic)
  }

  const [publishedByStatus, publishedByWorkflow] = await Promise.all([
    getDocs(query(collection(db, 'publications'), where('status', '==', 'published'))),
    getDocs(query(collection(db, 'publications'), where('workflow_stage', '==', 'published'))),
  ])

  const items = new Map<string, Publication>()

  for (const snapshot of [publishedByStatus, publishedByWorkflow]) {
    for (const item of snapshot.docs) {
      items.set(item.id, normalizePublication(item.id, item.data() as PublicationInput))
    }
  }

  return sortByPublished([...items.values()])
}

function sortByPublished(items: Publication[]) {
  return [...items].sort(
    (left, right) => new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
  )
}

function readLocalPublications() {
  if (typeof window === 'undefined') {
    return []
  }
  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!stored) {
    return []
  }
  try {
    const parsed = JSON.parse(stored) as Publication[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalPublications(items: Publication[]) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
}

export function getPublicationCategoryLabel(category: PublicationCategory, language: AppLanguage) {
  const categoryMeta = PUBLICATION_CATEGORIES.find((item) => item.id === category)
  if (!categoryMeta) {
    return category
  }
  return language === 'ar' ? categoryMeta.label_ar : categoryMeta.label_en
}

export function getPublicationKindLabel(kind: PublicationKind, language: AppLanguage) {
  if (kind === 'book') {
    return language === 'ar' ? 'كتاب' : 'Book'
  }
  if (kind === 'article') {
    return language === 'ar' ? 'مقال' : 'Article'
  }
  return language === 'ar' ? 'ورقة بحثية' : 'Research Paper'
}

export const PUBLICATION_KINDS: PublicationKind[] = ['article', 'research-paper', 'book']

export function getPublicationTitle(publication: Publication, language: AppLanguage) {
  return language === 'ar' ? publication.title_ar : publication.title_en || publication.title_ar
}

// Short headline for cards, social previews, browser tabs. Falls back to the
// full title when no headline has been set on the doc.
export function getPublicationHeadline(publication: Publication, language: AppLanguage) {
  if (language === 'ar') {
    return publication.headline_ar?.trim()
      || publication.headline_en?.trim()
      || publication.title_ar
      || publication.title_en
      || ''
  }
  return publication.headline_en?.trim()
    || publication.headline_ar?.trim()
    || publication.title_en
    || publication.title_ar
    || ''
}

export function getPublicationAbstract(publication: Publication, language: AppLanguage) {
  return language === 'ar'
    ? publication.abstract_ar || publication.abstract_en
    : publication.abstract_en || publication.abstract_ar
}

export function getPublicationDescription(publication: Publication, language: AppLanguage) {
  return language === 'ar'
    ? publication.description_ar || publication.description_en
    : publication.description_en || publication.description_ar
}

export function getPublicationAuthor(publication: Publication, language: AppLanguage) {
  return language === 'ar'
    ? publication.author_ar || publication.author_en
    : publication.author_en || publication.author_ar
}

export function getPublicationTopic(publication: Publication, language: AppLanguage) {
  return language === 'ar' ? publication.topic_ar || publication.topic_en : publication.topic_en || publication.topic_ar
}

export function formatCurrency(amount: number, language: AppLanguage) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export async function listPublications(filters: PublicationFilters = {}) {
  if (!db || !isFirebaseConfigured) {
    return sortByPublished(readLocalPublications()).filter((item) => filterPublication(item, filters))
  }

  const publications = await listPublishedPublicationsFromFirestore()
  return publications.filter((item) => filterPublication(item, filters))
}

export async function getPublicationBySlug(slug: string) {
  const matchSlug = (item: Publication) =>
    item.slug === slug || slugifyLatin(item.title_en || item.title_ar || item.slug) === slug

  if (!db || !isFirebaseConfigured) {
    return readLocalPublications().find(matchSlug) ?? null
  }
  try {
    // Query Firestore directly by slug field — avoids fetching all publications
    // and eliminates stale-cache cross-contamination between articles.
    const [bySlugStatus, bySlugWorkflow] = await Promise.all([
      getDocs(query(collection(db, 'publications'), where('slug', '==', slug), where('status', '==', 'published'))),
      getDocs(query(collection(db, 'publications'), where('slug', '==', slug), where('workflow_stage', '==', 'published'))),
    ])

    for (const snapshot of [bySlugStatus, bySlugWorkflow]) {
      if (!snapshot.empty) {
        const d = snapshot.docs[0]
        return normalizePublication(d.id, d.data() as PublicationInput)
      }
    }

    // Fallback: slug may be a latin-slugified title rather than a stored slug field.
    // In that case pull all and filter — this is rare for new content.
    const publications = await listPublishedPublicationsFromFirestore()
    return publications.find(matchSlug) ?? null
  } catch (error) {
    logFirebaseDebug('getPublicationBySlug:error', error)
    throw error
  }
}

export async function getPublicationById(id: string) {
  if (!db || !isFirebaseConfigured) {
    return readLocalPublications().find((item) => item.id === id) ?? null
  }
  const snapshot = await getDoc(doc(db, 'publications', id))
  return snapshot.exists() ? normalizePublication(snapshot.id, snapshot.data() as PublicationInput) : null
}

export async function listAdminPublications() {
  if (!db || !isFirebaseConfigured) {
    return sortByPublished(readLocalPublications())
  }
  const snapshot = await getDocs(collection(db, 'publications'))
  return [...snapshot.docs.map((item) => normalizePublication(item.id, item.data() as PublicationInput))].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  )
}

export async function savePublication(input: PublicationInput, id?: string) {
  const now = new Date().toISOString()
  const normalized = normalizePublication(id || crypto.randomUUID(), {
    ...input,
    updated_at: now,
    created_at: input.created_at ?? now,
    slug: input.slug?.trim() || slugify(input.title_en || input.title_ar || now),
  })

  if (!db || !isFirebaseConfigured) {
    const existing = readLocalPublications()
    const next = existing.filter((item) => item.id !== normalized.id)
    next.unshift(normalized)
    writeLocalPublications(next)
    return normalized.id
  }

  const currentUser = await waitForAuthenticatedUser()
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول بحساب إداري قبل حفظ الإصدارات.')
  }

  await setDoc(doc(db, 'publications', normalized.id), normalized, { merge: true })
  return normalized.id
}

export async function deletePublication(id: string) {
  if (!db || !isFirebaseConfigured) {
    const next = readLocalPublications().filter((item) => item.id !== id)
    writeLocalPublications(next)
    return
  }

  const currentUser = await waitForAuthenticatedUser()
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول بحساب إداري قبل حذف الإصدارات.')
  }

  await deleteDoc(doc(db, 'publications', id))
}

export async function uploadPublicationPdf(file: File) {
  return uploadFileToFirebaseStorage(file, `publications/pdfs/${Date.now()}-${file.name}`)
}
