import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

type LegacyArticle = {
  title?: string
  excerpt?: string
  content?: string
  slug?: string
  title_ar?: string
  excerpt_ar?: string
  body_ar?: string
  slug_ar?: string
  title_en?: string
  excerpt_en?: string
  body_en?: string
  slug_en?: string
  translation_status?: 'ar_only' | 'en_only' | 'both'
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
}

function parseEnvFile(filePath: string) {
  const values: Record<string, string> = {}

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    values[key] = value
  }

  return values
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  const envPath = resolve(process.cwd(), '.env.local')
  const env = parseEnvFile(envPath)
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? resolve(process.cwd(), 'service-account.json')
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: env.VITE_FIREBASE_PROJECT_ID || 'esnad-ebc17',
    })
  }

  const db = getFirestore()
  const snapshot = await db.collection('articles').get()
  let migratedCount = 0
  let skippedCount = 0

  for (const doc of snapshot.docs) {
    const data = doc.data() as LegacyArticle

    if (data.title_ar) {
      skippedCount += 1
      console.log(`skip ${doc.id}: already migrated`)
      continue
    }

    const titleAr = data.title?.trim() ?? ''
    const excerptAr = data.excerpt?.trim() ?? ''
    const bodyAr = data.content ?? ''
    const slugAr = data.slug?.trim() || createSlug(titleAr)
    const now = new Date().toISOString()

    await doc.ref.set(
      {
        title_ar: titleAr,
        excerpt_ar: excerptAr,
        body_ar: bodyAr,
        slug_ar: slugAr,
        title_en: '',
        excerpt_en: '',
        body_en: '',
        slug_en: '',
        translation_status: 'ar_only',
        created_at: data.created_at ?? data.createdAt ?? now,
        updated_at: now,
      },
      { merge: true },
    )

    migratedCount += 1
    console.log(`migrated ${doc.id}: title -> title_ar, excerpt -> excerpt_ar, content -> body_ar`)
  }

  console.log(`done: migrated=${migratedCount}, skipped=${skippedCount}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
