import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function getServiceAccountFromEnv() {
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()

  if (rawJson) {
    return parseJson(rawJson)
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    }
  }

  return null
}

function getServiceAccountFromFile() {
  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  const candidatePaths = [configuredPath, resolve(process.cwd(), 'service-account.json')].filter(Boolean)

  for (const candidatePath of candidatePaths) {
    if (candidatePath && existsSync(candidatePath)) {
      return parseJson(readFileSync(candidatePath, 'utf8'))
    }
  }

  return null
}

function getServiceAccount() {
  return getServiceAccountFromEnv() || getServiceAccountFromFile()
}

function getProjectId(serviceAccount) {
  return (
    serviceAccount?.project_id?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    'esnad-ebc17'
  )
}

export function getAdminApp() {
  if (getApps().length) {
    return getApps()[0]
  }

  const serviceAccount = getServiceAccount()

  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId: getProjectId(serviceAccount),
  })
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export { FieldValue }
