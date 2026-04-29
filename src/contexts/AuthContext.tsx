/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, isAdminEmail } from '../lib/firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))

  useEffect(() => {
    if (!auth) {
      return undefined
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('إعدادات Firebase Auth غير مكتملة. أضف قيم البيئة أولاً.')
    }

    const credentials = await signInWithEmailAndPassword(auth, email, password)

    if (!isAdminEmail(credentials.user.email)) {
      await signOut(auth)
      throw new Error('هذا الحساب غير مصرح له بالوصول إلى لوحة الإدارة.')
    }
  }

  const signOutUser = async () => {
    if (!auth) {
      return
    }

    await signOut(auth)
  }

  const isAdmin = Boolean(user && isAdminEmail(user.email))

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        signIn,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
