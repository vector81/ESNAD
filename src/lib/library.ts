import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { LibrarySnapshot, SessionUser } from '../types/publication'

const DEMO_LIBRARY_PREFIX = 'esnad_library_'

function getLocalStorageKey(user: SessionUser) {
  return `${DEMO_LIBRARY_PREFIX}${user.uid}`
}

function readLocalSnapshot(user: SessionUser): LibrarySnapshot {
  if (typeof window === 'undefined') {
    return { saved_item_ids: [], purchased_item_ids: [] }
  }

  try {
    const stored = window.localStorage.getItem(getLocalStorageKey(user))
    if (!stored) {
      return { saved_item_ids: [], purchased_item_ids: [] }
    }

    const parsed = JSON.parse(stored) as LibrarySnapshot
    return {
      saved_item_ids: parsed.saved_item_ids ?? [],
      purchased_item_ids: parsed.purchased_item_ids ?? [],
    }
  } catch {
    return { saved_item_ids: [], purchased_item_ids: [] }
  }
}

function writeLocalSnapshot(user: SessionUser, snapshot: LibrarySnapshot) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(getLocalStorageKey(user), JSON.stringify(snapshot))
}

export async function getLibrarySnapshot(user: SessionUser): Promise<LibrarySnapshot> {
  if (!db || !isFirebaseConfigured) {
    return readLocalSnapshot(user)
  }

  const snapshot = await getDoc(doc(db, 'user_libraries', user.uid))

  if (!snapshot.exists()) {
    return { saved_item_ids: [], purchased_item_ids: [] }
  }

  const data = snapshot.data() as Partial<LibrarySnapshot>
  return {
    saved_item_ids: Array.isArray(data.saved_item_ids) ? data.saved_item_ids : [],
    purchased_item_ids: Array.isArray(data.purchased_item_ids) ? data.purchased_item_ids : [],
  }
}

export async function toggleSavedItem(user: SessionUser, publicationId: string, saved: boolean) {
  if (!db || !isFirebaseConfigured) {
    const current = readLocalSnapshot(user)
    const next = saved
      ? {
          ...current,
          saved_item_ids: current.saved_item_ids.includes(publicationId)
            ? current.saved_item_ids
            : [...current.saved_item_ids, publicationId],
        }
      : {
          ...current,
          saved_item_ids: current.saved_item_ids.filter((item) => item !== publicationId),
        }

    writeLocalSnapshot(user, next)
    return next
  }

  const ref = doc(db, 'user_libraries', user.uid)
  await setDoc(
    ref,
    {
      saved_item_ids: saved ? arrayUnion(publicationId) : arrayRemove(publicationId),
      updated_at: serverTimestamp(),
    },
    { merge: true },
  )

  return getLibrarySnapshot(user)
}

export async function grantPurchasedItem(user: SessionUser, publicationId: string) {
  if (!db || !isFirebaseConfigured) {
    const current = readLocalSnapshot(user)
    const next = current.purchased_item_ids.includes(publicationId)
      ? current
      : {
          ...current,
          purchased_item_ids: [...current.purchased_item_ids, publicationId],
        }

    writeLocalSnapshot(user, next)
    return next
  }

  await setDoc(
    doc(db, 'user_libraries', user.uid),
    {
      purchased_item_ids: arrayUnion(publicationId),
      updated_at: serverTimestamp(),
    },
    { merge: true },
  )

  return getLibrarySnapshot(user)
}
