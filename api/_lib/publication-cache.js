import snapshot from '../_data/publication-snapshot.json' with { type: 'json' }

// Only previously verified, public/free publications. Never cache paid bodies.
// This bounded emergency snapshot expires after 24 hours; live reads take priority.
let quotaUntil = 0
const entries = new Map()
export function recordBackendStatus(status, now = Date.now()) {
  if (status === 429) quotaUntil = now + 60_000
}
export function quotaPublications(now = Date.now()) {
  if (now >= quotaUntil || now >= Date.parse(snapshot.expiresAt)) return null
  return snapshot.publications
}
export async function cachedPublicationRead(key, read) {
  const existing = entries.get(key)
  if (existing && existing.expires > Date.now()) return existing.promise
  const entry = { expires: Date.now() + 60_000, promise: Promise.resolve().then(read) }
  entries.set(key, entry)
  try { return await entry.promise } catch (error) { entries.delete(key); throw error }
}
