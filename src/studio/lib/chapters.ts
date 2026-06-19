import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured, waitForAuthenticatedUser } from '../../lib/firebase'
import type { Chapter } from '../../types/studio'

function normalizeChapter(id: string, data: Partial<Chapter>, publicationId: string): Chapter {
  const now = new Date().toISOString()
  return {
    id,
    publication_id: publicationId,
    order: Number(data.order) || 0,
    title_ar: data.title_ar?.trim() || 'فصل بلا عنوان',
    title_en: data.title_en?.trim() || 'Untitled Chapter',
    slug: data.slug?.trim() || `chapter-${id}`,
    content_json: (data.content_json as Chapter['content_json']) ?? null,
    created_at: data.created_at?.trim() || now,
    updated_at: data.updated_at?.trim() || now,
  }
}

export async function listChapters(publicationId: string): Promise<Chapter[]> {
  if (!db || !isFirebaseConfigured) {
    return []
  }
  const snapshot = await getDocs(
    query(collection(db, 'publications', publicationId, 'chapters'), orderBy('order', 'asc'))
  )
  return snapshot.docs.map((d) => normalizeChapter(d.id, d.data() as Partial<Chapter>, publicationId))
}

export async function listReadableChapters(publicationId: string): Promise<Chapter[]> {
  if (!isFirebaseConfigured || import.meta.env.DEV) {
    return listChapters(publicationId)
  }

  const params = new URLSearchParams({ publicationId })
  const token = await auth?.currentUser?.getIdToken().catch(() => '')
  const response = await fetch(`/api/publication-chapters?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const payload = (await response.json().catch(() => null)) as { chapters?: Chapter[] } | null

  if (!response.ok) {
    return []
  }

  return Array.isArray(payload?.chapters) ? payload.chapters : []
}

export async function saveChapter(publicationId: string, input: Partial<Chapter>, chapterId?: string): Promise<Chapter> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase غير مُفعّل.')
  }
  const currentUser = await waitForAuthenticatedUser()
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول قبل حفظ الفصول.')
  }
  const id = chapterId || crypto.randomUUID()
  const normalized = normalizeChapter(id, input, publicationId)
  await setDoc(doc(db, 'publications', publicationId, 'chapters', id), normalized, { merge: true })
  return normalized
}

export async function deleteChapter(publicationId: string, chapterId: string): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    return
  }
  const currentUser = await waitForAuthenticatedUser()
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول قبل حذف الفصول.')
  }
  await deleteDoc(doc(db, 'publications', publicationId, 'chapters', chapterId))
}

export async function reorderChapters(publicationId: string, orderedIds: string[]): Promise<void> {
  const firestore = db
  if (!firestore || !isFirebaseConfigured) {
    return
  }
  const currentUser = await waitForAuthenticatedUser()
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول قبل إعادة ترتيب الفصول.')
  }
  const batch = writeBatch(firestore)
  orderedIds.forEach((chapterId, index) => {
    const ref = doc(firestore, 'publications', publicationId, 'chapters', chapterId)
    batch.update(ref, { order: index + 1, updated_at: new Date().toISOString() })
  })
  await batch.commit()
}
