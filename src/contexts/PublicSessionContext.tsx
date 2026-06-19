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
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { getLibrarySnapshot } from '../lib/library'
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
    !auth || !isFirebaseConfigured ? getDemoUser() : null,
  )
  const [library, setLibrary] = useState<LibrarySnapshot>(() => emptyLibrarySnapshot())
  const [loading, setLoading] = useState(() => Boolean(auth && isFirebaseConfigured))

  const refreshLibrary = useCallback(async () => {
    const snapshot = user ? await getLibrarySnapshot(user) : emptyLibrarySnapshot()
    setLibrary(snapshot)
  }, [user])

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      return undefined
    }

    return onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        setUser(mapFirebaseUser(nextUser))
      } else {
        setUser(null)
        setLibrary(emptyLibrarySnapshot())
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return undefined

    let cancelled = false
    void getLibrarySnapshot(user)
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
    if (!auth || !isFirebaseConfigured) {
      const demoUser = {
        uid: `demo-${email.toLowerCase()}`,
        email: email.toLowerCase(),
        displayName: email.split('@')[0],
      }
      setDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    const credentials = await signInWithEmailAndPassword(auth, email, password)
    setUser(mapFirebaseUser(credentials.user))
  }, [])

  const registerUser = useCallback(async (name: string, email: string, password: string) => {
    if (!auth || !isFirebaseConfigured) {
      const demoUser = {
        uid: `demo-${email.toLowerCase()}`,
        email: email.toLowerCase(),
        displayName: name.trim() || email.split('@')[0],
      }
      setDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    const credentials = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credentials.user, {
      displayName: name.trim(),
    })
    setUser(mapFirebaseUser(credentials.user))
  }, [])

  const signOutUser = useCallback(async () => {
    if (!auth || !isFirebaseConfigured) {
      setDemoUser(null)
      setUser(null)
      setLibrary(emptyLibrarySnapshot())
      return
    }

    await signOut(auth)
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
