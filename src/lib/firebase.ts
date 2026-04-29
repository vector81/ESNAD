import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

function parseAdminEmails(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export const adminEmails: string[] = (() => {
  const fromEnv = parseAdminEmails(import.meta.env.VITE_ADMIN_EMAIL)
  const baseline = ['abuali882005@gmail.com', 'info@esnad.com.lb']
  const merged = new Set<string>([...fromEnv, ...baseline])
  return [...merged]
})()

// Backwards compatibility — first entry treated as the canonical admin email.
export const adminEmail = adminEmails[0] ?? ''

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails.includes(email.trim().toLowerCase())
}
export const firebaseProjectId = firebaseConfig.projectId?.trim() ?? ''
export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null

export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null

if (typeof window !== 'undefined') {
  console.info('[esnad/firebase] initialized', {
    projectId: firebaseProjectId || null,
    authDomain: firebaseConfig.authDomain || null,
    hasAuth: Boolean(auth),
    hasDb: Boolean(db),
  })
}

export function logFirebaseDebug(context: string, error?: unknown) {
  const currentUser = auth?.currentUser
  console.info('[esnad/firebase] debug', {
    context,
    projectId: firebaseProjectId || null,
    currentUser: currentUser
      ? {
          uid: currentUser.uid,
          email: currentUser.email,
        }
      : null,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
          }
        : error ?? null,
  })
}

export async function waitForAuthenticatedUser() {
  if (!auth) {
    return null
  }

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
  } else if (!auth.currentUser) {
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe()
        resolve()
      })
    })
  }

  const currentUser: User | null = auth.currentUser

  if (!currentUser) {
    logFirebaseDebug('waitForAuthenticatedUser:no-user')
    return null
  }

  await currentUser.getIdToken()
  logFirebaseDebug('waitForAuthenticatedUser:ready')

  return currentUser
}
