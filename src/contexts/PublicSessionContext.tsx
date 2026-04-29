/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
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
  const [user, setUser] = useState<SessionUser | null>(null)
  const [library, setLibrary] = useState<LibrarySnapshot>({
    saved_item_ids: [],
    purchased_item_ids: [],
  })
  const [loading, setLoading] = useState(true)

  const refreshLibrary = async () => {
    if (!user) {
      setLibrary({ saved_item_ids: [], purchased_item_ids: [] })
      return
    }

    setLibrary(await getLibrarySnapshot(user))
  }

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      const demoUser = getDemoUser()
      setUser(demoUser)
      setLoading(false)
      return undefined
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser ? mapFirebaseUser(nextUser) : null)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    void refreshLibrary()
  }, [user])

  const signInUser = async (email: string, password: string) => {
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
  }

  const registerUser = async (name: string, email: string, password: string) => {
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
  }

  const signOutUser = async () => {
    if (!auth || !isFirebaseConfigured) {
      setDemoUser(null)
      setUser(null)
      setLibrary({ saved_item_ids: [], purchased_item_ids: [] })
      return
    }

    await signOut(auth)
    setUser(null)
    setLibrary({ saved_item_ids: [], purchased_item_ids: [] })
  }

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
    [user, loading, library],
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
