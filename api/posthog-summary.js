import { createHash } from 'node:crypto'
import { getAdminAuth } from './_lib/firebase-admin.js'
import { getBearerToken, sendJson, setCorsHeaders } from './_lib/http.js'

const DEFAULT_POSTHOG_HOST = 'https://us.posthog.com'
const DEFAULT_PROJECT_ID = '404870'
const TRACKED_EVENTS = "('$pageview', 'article_viewed', 'publication_viewed', 'article_read_time', 'publication_read_time')"
const PUBLICATION_EVENTS = "('article_viewed', 'publication_viewed')"
const READ_TIME_EVENTS = "('article_read_time', 'publication_read_time')"

function parseAdminEmails(value) {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

function getAllowedAdminEmails() {
  return new Set([
    'abuali882005@gmail.com',
    'info@esnad.com.lb',
    ...parseAdminEmails(process.env.ADMIN_EMAILS),
    ...parseAdminEmails(process.env.VITE_ADMIN_EMAIL),
  ])
}

async function verifyAdminRequest(request) {
  const token = getBearerToken(request)
  if (!token) {
    return null
  }

  const decodedToken = await getAdminAuth().verifyIdToken(token)
  const email = decodedToken.email?.trim().toLowerCase() || ''
  return getAllowedAdminEmails().has(email) ? decodedToken : null
}

function normalizeHost(value) {
  return (value || DEFAULT_POSTHOG_HOST).trim().replace(/\/+$/, '')
}

async function runHogql({ host, projectId, apiKey, name, query }) {
  const response = await fetch(`${host}/api/projects/${encodeURIComponent(projectId)}/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      query: {
        kind: 'HogQLQuery',
        query,
      },
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const detail = payload?.detail || payload?.error || payload?.message || response.statusText
    throw new Error(`PostHog query failed: ${detail}`)
  }

  return Array.isArray(payload?.results) ? payload.results : []
}

function numberValue(value) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function stringValue(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function rowToSummary(row = []) {
  return {
    total_page_views: numberValue(row[0]),
    publication_views: numberValue(row[1]),
    unique_visitors: numberValue(row[2]),
    page_views_24h: numberValue(row[3]),
  }
}

function rowToPublication(row = []) {
  return {
    publication_id: stringValue(row[0], 'unknown'),
    title: stringValue(row[1], 'بدون عنوان'),
    kind: stringValue(row[2]),
    category: stringValue(row[3]),
    views: numberValue(row[4]),
    visitors: numberValue(row[5]),
    last_seen: stringValue(row[6]),
    locations: [],
    read_sessions: [],
    total_reading_seconds: 0,
    avg_reading_seconds: 0,
  }
}

function rowToLocation(row = []) {
  return {
    publication_id: stringValue(row[0], 'unknown'),
    country: stringValue(row[1], 'غير محدد'),
    city: stringValue(row[2]),
    views: numberValue(row[3]),
    visitors: numberValue(row[4]),
  }
}

function visitorLabel(distinctId) {
  const hash = createHash('sha256').update(distinctId || 'unknown').digest('hex').slice(0, 6).toUpperCase()
  return `زائر ${hash}`
}

function rowToReadSession(row = []) {
  const distinctId = stringValue(row[1], 'unknown')

  return {
    publication_id: stringValue(row[0], 'unknown'),
    visitor: visitorLabel(distinctId),
    read_session_id: stringValue(row[2], distinctId),
    reading_seconds: numberValue(row[3]),
    max_scroll_depth: numberValue(row[4]),
    last_seen: stringValue(row[5]),
    country: stringValue(row[6], 'غير محدد'),
    city: stringValue(row[7]),
  }
}

function attachPublicationLocations(publications, locationRows) {
  const locationsByPublication = new Map()

  for (const row of locationRows) {
    const location = rowToLocation(row)
    const existing = locationsByPublication.get(location.publication_id) || []
    existing.push(location)
    locationsByPublication.set(location.publication_id, existing)
  }

  return publications.map((publication) => ({
    ...publication,
    locations: locationsByPublication.get(publication.publication_id) || [],
  }))
}

function attachPublicationReadTimes(publications, readRows) {
  const readTimesByPublication = new Map()

  for (const row of readRows) {
    const readSession = rowToReadSession(row)
    const existing = readTimesByPublication.get(readSession.publication_id) || []
    existing.push(readSession)
    readTimesByPublication.set(readSession.publication_id, existing)
  }

  return publications.map((publication) => {
    const readSessions = readTimesByPublication.get(publication.publication_id) || []
    const totalReadingSeconds = readSessions.reduce((sum, session) => sum + session.reading_seconds, 0)

    return {
      ...publication,
      read_sessions: readSessions.sort((left, right) => right.reading_seconds - left.reading_seconds),
      total_reading_seconds: totalReadingSeconds,
      avg_reading_seconds: readSessions.length ? totalReadingSeconds / readSessions.length : 0,
    }
  })
}

export default async function handler(request, response) {
  setCorsHeaders(response, request)

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'method_not_allowed' })
    return
  }

  try {
    const admin = await verifyAdminRequest(request)
    if (!admin) {
      sendJson(response, 401, { error: 'unauthorized' })
      return
    }

    const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim()
    const projectId = process.env.POSTHOG_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID
    const host = normalizeHost(process.env.POSTHOG_API_HOST)

    if (!apiKey) {
      sendJson(response, 200, {
        configured: false,
        project_id: projectId,
        host,
        message: 'POSTHOG_PERSONAL_API_KEY is not configured on the editor deployment.',
      })
      return
    }

    const [summaryRows, publicationRows, publicationLocationRows, publicationReadTimeRows] = await Promise.all([
      runHogql({
        host,
        projectId,
        apiKey,
        name: 'editor analytics summary',
        query: `
          SELECT
            countIf(event = '$pageview') AS total_page_views,
            countIf(event IN ${PUBLICATION_EVENTS}) AS publication_views,
            uniqIf(distinct_id, event = '$pageview') AS unique_visitors,
            countIf(event = '$pageview' AND timestamp >= now() - INTERVAL 1 DAY) AS page_views_24h
          FROM events
          WHERE event IN ${TRACKED_EVENTS}
        `,
      }),
      runHogql({
        host,
        projectId,
        apiKey,
        name: 'editor top publications',
        query: `
          SELECT
            properties.publication_id AS publication_id,
            any(properties.publication_title) AS title,
            any(properties.publication_kind) AS kind,
            any(properties.publication_category) AS category,
            count() AS views,
            uniq(distinct_id) AS visitors,
            max(timestamp) AS last_seen
          FROM events
          WHERE event IN ${PUBLICATION_EVENTS}
            AND isNotNull(properties.publication_id)
            AND toString(properties.publication_id) != ''
          GROUP BY publication_id
          ORDER BY views DESC
          LIMIT 25
        `,
      }),
      runHogql({
        host,
        projectId,
        apiKey,
        name: 'editor publication locations',
        query: `
          SELECT
            properties.publication_id AS publication_id,
            properties['$geoip_country_name'] AS country,
            properties['$geoip_city_name'] AS city,
            count() AS views,
            uniq(distinct_id) AS visitors
          FROM events
          WHERE event IN ${PUBLICATION_EVENTS}
            AND isNotNull(properties.publication_id)
            AND toString(properties.publication_id) != ''
          GROUP BY publication_id, country, city
          ORDER BY publication_id ASC, views DESC
          LIMIT 250
        `,
      }),
      runHogql({
        host,
        projectId,
        apiKey,
        name: 'editor publication read time',
        query: `
          SELECT
            properties.publication_id AS publication_id,
            distinct_id,
            toString(properties.read_session_id) AS read_session_id,
            sum(toFloatOrZero(toString(properties.reading_seconds))) AS reading_seconds,
            max(toFloatOrZero(toString(properties.max_scroll_depth))) AS max_scroll_depth,
            max(timestamp) AS last_seen,
            any(properties['$geoip_country_name']) AS country,
            any(properties['$geoip_city_name']) AS city
          FROM events
          WHERE event IN ${READ_TIME_EVENTS}
            AND isNotNull(properties.publication_id)
            AND toString(properties.publication_id) != ''
            AND toFloatOrZero(toString(properties.reading_seconds)) > 0
          GROUP BY publication_id, distinct_id, read_session_id
          ORDER BY last_seen DESC
          LIMIT 500
        `,
      }),
    ])

    const publicationsWithLocations = attachPublicationLocations(publicationRows.map(rowToPublication), publicationLocationRows)

    sendJson(response, 200, {
      configured: true,
      project_id: projectId,
      host,
      generated_at: new Date().toISOString(),
      summary: rowToSummary(summaryRows[0]),
      top_publications: attachPublicationReadTimes(publicationsWithLocations, publicationReadTimeRows),
    })
  } catch (error) {
    sendJson(response, 500, {
      error: 'posthog_summary_failed',
      message: error instanceof Error ? error.message : 'Failed to load analytics.',
    })
  }
}
