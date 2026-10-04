/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadPublicAuth } from '../lib/publicAuth'
import { isFirebaseConfigured } from '../lib/firebaseConfig'
import type { LibrarySnapshot, SessionUser } from '../types/publication'

const DEMO_USER_STORAGE_KEY = 'esnad_demo_public_user'

interface PublicSessionContextValue {
  user: SessionUser | null
  loading: boolean
  library: LibrarySnapshot
  refreshLibrary: () => Promise<void>
  signInUser: (email: string, password: string) => Promise<void>
  registerUser: (name: string, email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
}

const PublicSessionContext = createContext<PublicSessionContextValue | undefined>(undefined)

function emptyLibrarySnapshot(): LibrarySnapshot {
  return {
    saved_item_ids: [],
    purchased_item_ids: [],
  }
}

function getDemoUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(DEMO_USER_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as SessionUser) : null
  } catch {
    return null
  }
}

function setDemoUser(user: SessionUser | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!user) {
    window.localStorage.removeItem(DEMO_USER_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user))
}

function mapFirebaseUser(user: {
  uid: string
  email: string | null
  displayName: string | null
}): SessionUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName?.trim() || user.email?.split('@')[0] || 'Esnad Reader',
  }
}

export function PublicSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() =>
    !isFirebaseConfigured ? getDemoUser() : null,
  )
  const [library, setLibrary] = useState<LibrarySnapshot>(() => emptyLibrarySnapshot())
  const [loading, setLoading] = useState(() => Boolean(isFirebaseConfigured))

  const refreshLibrary = useCallback(async () => {
    const { getLibrarySnapshot } = await import('../lib/library')
    const snapshot = user ? await getLibrarySnapshot(user) : emptyLibrarySnapshot()
    setLibrary(snapshot)
  }, [user])

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined
    }
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let idleId: number | undefined
    let timerId: number | undefined
    const restoreSession = async () => {
      const [instance, { onAuthStateChanged }] = await Promise.all([loadPublicAuth(), import('firebase/auth')])
      if (cancelled || !instance) return
      unsubscribe = onAuthStateChanged(instance, (nextUser) => {
      if (nextUser) {
        setUser(mapFirebaseUser(nextUser))
      } else {
        setUser(null)
        setLibrary(emptyLibrarySnapshot())
      }
      setLoading(false)
    })
    }
    const restore = () => void restoreSession().catch(error => {
      console.warn('[esnad] Session restoration unavailable', error)
      if (!cancelled) setLoading(false)
    })
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(restore, { timeout: 1500 })
      else timerId = window.setTimeout(restore, 0)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      cancelled = true
      unsubscribe?.()
      window.removeEventListener('load', schedule)
      if (idleId !== undefined) window.cancelIdleCallback(idleId)
      if (timerId !== undefined) window.clearTimeout(timerId)
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined

    let cancelled = false
    void import('../lib/library').then(({ getLibrarySnapshot }) => getLibrarySnapshot(user))
      .then((snapshot) => {
        if (!cancelled) setLibrary(snapshot)
      })
      .catch(() => {
        if (!cancelled) setLibrary(emptyLibrarySnapshot())
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const signInUser = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      const demoUser = {
        uid: `demo-${email.toLowerCase()}`,
        email: email.toLowerCase(),
        displayName: email.split('@')[0],
      }
      setDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    const [instance, { signInWithEmailAndPassword }] = await Promise.all([loadPublicAuth(), import('firebase/auth')])
    if (!instance) throw new Error('تعذر تحميل تسجيل الدخول.')
    const credentials = await signInWithEmailAndPassword(instance, email, password)
    setUser(mapFirebaseUser(credentials.user))
  }, [])

  const registerUser = useCallback(async (name: string, email: string, password: string) => {
    if (!isFirebaseConfigured) {
      const demoUser = {
        uid: `demo-${email.toLowerCase()}`,
        email: email.toLowerCase(),
        displayName: name.trim() || email.split('@')[0],
      }
      setDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    const [instance, { createUserWithEmailAndPassword, updateProfile }] = await Promise.all([loadPublicAuth(), import('firebase/auth')])
    if (!instance) throw new Error('تعذر تحميل تسجيل الدخول.')
    const credentials = await createUserWithEmailAndPassword(instance, email, password)
    await updateProfile(credentials.user, {
      displayName: name.trim(),
    })
    setUser(mapFirebaseUser(credentials.user))
  }, [])

  const signOutUser = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setDemoUser(null)
      setUser(null)
      setLibrary(emptyLibrarySnapshot())
      return
    }

    const [instance, { signOut }] = await Promise.all([loadPublicAuth(), import('firebase/auth')])
    if (instance) await signOut(instance)
    setUser(null)
    setLibrary(emptyLibrarySnapshot())
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      library,
      refreshLibrary,
      signInUser,
      registerUser,
      signOutUser,
    }),
    [user, loading, library, refreshLibrary, signInUser, registerUser, signOutUser],
  )

  return <PublicSessionContext.Provider value={value}>{children}</PublicSessionContext.Provider>
}

export function usePublicSession() {
  const context = useContext(PublicSessionContext)

  if (!context) {
    throw new Error('usePublicSession must be used inside PublicSessionProvider')
  }

  return context
}
