import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { sendArticlePreviewEmail } from '../api/_lib/resend.js'

const PREVIEW_RECIPIENT = 'abuali882005@gmail.com'

function loadEnvFile(relativePath) {
  const absolutePath = resolve(process.cwd(), relativePath)

  if (!existsSync(absolutePath)) {
    return
  }

  const content = readFileSync(absolutePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  if ('stringValue' in value) {
    return value.stringValue
  }

  if ('timestampValue' in value) {
    return value.timestampValue
  }

  if ('booleanValue' in value) {
    return value.booleanValue
  }

  if ('integerValue' in value) {
    return Number(value.integerValue)
  }

  if ('doubleValue' in value) {
    return Number(value.doubleValue)
  }

  if ('nullValue' in value) {
    return null
  }

  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(decodeFirestoreValue)
  }

  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, nestedValue]) => [
        key,
        decodeFirestoreValue(nestedValue),
      ]),
    )
  }

  return undefined
}

function normalizeDocument(document) {
  return {
    id: document.name?.split('/').pop() ?? '',
    ...Object.fromEntries(
      Object.entries(document.fields ?? {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
    ),
  }
}

async function fetchLatestPublishedArticle() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim()

  if (!projectId || !apiKey) {
    throw new Error('Missing Firebase public config for article preview.')
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'published' },
            },
          },
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Firestore published query failed with status ${response.status}`)
  }

  const payload = await response.json()
  const articles = payload
    .filter((item) => item.document)
    .map((item) => normalizeDocument(item.document))
    .sort((a, b) => {
      const left = new Date(b.published_at || b.updated_at || 0).getTime()
      const right = new Date(a.published_at || a.updated_at || 0).getTime()
      return left - right
    })

  return (
    articles.find((article) => article.content_type === 'article') ||
    articles[0] ||
    null
  )
}

loadEnvFile('.env.local')
loadEnvFile('.env')
loadEnvFile('.vercel/.env.production.local')

const article = await fetchLatestPublishedArticle()

if (!article) {
  throw new Error('No published article is available for newsletter preview.')
}

const result = await sendArticlePreviewEmail({
  to: PREVIEW_RECIPIENT,
  article,
})

if (!result?.id) {
  throw new Error('Resend article preview email was not sent.')
}

console.log(`Article preview email sent to ${PREVIEW_RECIPIENT}. Message id: ${result.id}`)
console.log(`Article id: ${article.id}`)
console.log(`Article title: ${article.title_ar || article.title_en || 'Untitled'}`)
