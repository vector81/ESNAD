const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const ALLOWED_HOSTNAMES = new Set(['esnads.net', 'www.esnads.net'])

// Verification is mandatory before any database write or notification email.
// Cloudflare rejects expired and replayed tokens; hostname/action bind the token
// to this form, rather than another widget using the same Cloudflare account.
export async function verifyNewsletterChallenge(token) {
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) {
    return { ok: false, status: 400 }
  }
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return { ok: false, status: 503 }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return { ok: false, status: 503 }
    const result = await response.json()
    if (result.success !== true || result.action !== 'newsletter' || !ALLOWED_HOSTNAMES.has(result.hostname)) {
      return { ok: false, status: 403 }
    }
    return { ok: true, status: 200 }
  } catch {
    return { ok: false, status: 503 }
  }
}
