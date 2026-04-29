import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured, waitForAuthenticatedUser } from '../../lib/firebase'
import type { Comment } from '../../types/studio'

function normalizeComment(id: string, data: Partial<Comment>, publicationId: string): Comment {
  const now = new Date().toISOString()
  return {
    id,
    publication_id: publicationId,
    chapter_id: data.chapter_id || null,
    thread_id: data.thread_id || id,
    author: data.author || { uid: 'unknown', name: 'Unknown' },
    text: data.text || '',
    range: data.range || { from: 0, to: 0 },
    resolved: Boolean(data.resolved),
    created_at: data.created_at || now,
    updated_at: data.updated_at || now,
  }
}

export async function listComments(publicationId: string, chapterId?: string | null): Promise<Comment[]> {
  if (!db || !isFirebaseConfigured) {
    return []
  }
  const q = chapterId
    ? query(collection(db, 'publications', publicationId, 'comments'), orderBy('created_at', 'asc'))
    : query(collection(db, 'publications', publicationId, 'comments'), orderBy('created_at', 'asc'))
  const snapshot = await getDocs(q)
  const all = snapshot.docs.map((d) => normalizeComment(d.id, d.data() as Partial<Comment>, publicationId))
  return chapterId ? all.filter((c) => c.chapter_id === chapterId) : all.filter((c) => !c.chapter_id)
}

export async function saveComment(publicationId: string, input: Partial<Comment>): Promise<Comment> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase غير مُفعّل.')
  }
  const currentUser = await waitForAuthenticatedUser()
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول قبل إضافة تعليق.')
  }
  const id = input.id || crypto.randomUUID()
  const normalized = normalizeComment(id, {
    ...input,
    author: input.author || { uid: currentUser.uid, name: currentUser.email || currentUser.uid },
    updated_at: new Date().toISOString(),
  }, publicationId)
  await setDoc(doc(db, 'publications', publicationId, 'comments', id), normalized, { merge: true })
  return normalized
}

export async function resolveComment(publicationId: string, commentId: string, resolved: boolean): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    return
  }
  await updateDoc(doc(db, 'publications', publicationId, 'comments', commentId), {
    resolved,
    updated_at: new Date().toISOString(),
  })
}
