const buckets = new Map()

const WINDOW_MS = 60_000
const CLEANUP_INTERVAL_MS = 120_000

function getClientIp(request) {
  return (
    request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    request.headers['x-real-ip'] ||
    request.socket?.remoteAddress ||
    'unknown'
  )
}

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS
  for (const [key, entry] of buckets) {
    if (entry.windowStart < cutoff) {
      buckets.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS).unref?.()

export function rateLimit(request, { maxRequests = 5, windowMs = WINDOW_MS } = {}) {
  const ip = getClientIp(request)
  const now = Date.now()
  const entry = buckets.get(ip)

  if (!entry || now - entry.windowStart > windowMs) {
    buckets.set(ip, { windowStart: now, count: 1 })
    return null
  }

  entry.count += 1

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000)
    return { retryAfter }
  }

  return null
}
