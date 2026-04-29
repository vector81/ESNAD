import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured, waitForAuthenticatedUser } from '../../lib/firebase'
import type { Version } from '../../types/studio'

function normalizeVersion(id: string, data: Partial<Version>, publicationId: string): Version {
  return {
    id,
    publication_id: publicationId,
    created_at: data.created_at || new Date().toISOString(),
    created_by: data.created_by || 'unknown',
    label: data.label || '',
    snapshot_json: data.snapshot_json || {},
  }
}

export async function listVersions(publicationId: string): Promise<Version[]> {
  if (!db || !isFirebaseConfigured) {
    return []
  }
  const snapshot = await getDocs(
    query(collection(db, 'publications', publicationId, 'versions'), orderBy('created_at', 'desc'))
  )
  return snapshot.docs.map((d) => normalizeVersion(d.id, d.data() as Partial<Version>, publicationId))
}

export async function saveVersion(publicationId: string, label: string, snapshot: Record<string, unknown>): Promise<Version> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase غير مُفعّل.')
  }
  const currentUser = await waitForAuthenticatedUser()
  if (!currentUser) {
    throw new Error('يجب تسجيل الدخول قبل حفظ النسخ.')
  }
  const id = crypto.randomUUID()
  const normalized = normalizeVersion(id, {
    created_at: new Date().toISOString(),
    created_by: currentUser.email || currentUser.uid,
    label,
    snapshot_json: snapshot,
  }, publicationId)
  await setDoc(doc(db, 'publications', publicationId, 'versions', id), normalized)
  return normalized
}
