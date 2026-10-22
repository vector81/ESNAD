import { afterEach, beforeEach, test, mock } from 'node:test'
import assert from 'node:assert/strict'

let writes, notifications, reads
mock.module('../api/_lib/firebase-admin.js', { namedExports: {
  FieldValue: { serverTimestamp: () => 'timestamp' },
  getAdminDb: () => ({ collection: () => ({
    where: () => ({ limit: () => ({ get: async () => { reads++; return { empty: true } } }) }),
    add: async () => { writes++ },
  }) }),
} })
mock.module('../api/_lib/resend.js', { namedExports: {
  sendSubscriberNotification: async () => { notifications++; return { id: 'test' } },
} })
mock.module('../api/_lib/rate-limit.js', { namedExports: { rateLimit: () => null } })
const { default: handler } = await import('../api/subscribe.js')
const originalFetch = globalThis.fetch
const originalSecret = process.env.TURNSTILE_SECRET_KEY

beforeEach(() => { writes = 0; notifications = 0; reads = 0; process.env.TURNSTILE_SECRET_KEY = 'test-secret' })
afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY
  else process.env.TURNSTILE_SECRET_KEY = originalSecret
})
async function submit(turnstileToken) {
  const result = {}
  await handler({ method: 'POST', headers: {}, body: { email: 'test@example.com', language: 'en', turnstileToken } }, {
    setHeader() {}, status(code) { result.status = code; return this }, json(body) { result.body = body },
  })
  return result
}
for (const token of [undefined, '', {}, 'x'.repeat(2049)]) {
  test(`rejects missing or malformed token (${typeof token}) before storage/email`, async () => {
    globalThis.fetch = () => { throw new Error('Must not call verification') }
    assert.equal((await submit(token)).status, 400)
    assert.deepEqual([reads, writes, notifications], [0, 0, 0])
  })
}
test('fails closed when the secret is not configured', async () => {
  delete process.env.TURNSTILE_SECRET_KEY
  assert.equal((await submit('token')).status, 503)
  assert.deepEqual([reads, writes, notifications], [0, 0, 0])
})
for (const result of [
  { success: false, 'error-codes': ['timeout-or-duplicate'] },
  { success: true, hostname: 'attacker.example', action: 'newsletter' },
  { success: true, hostname: 'esnads.net', action: 'login' },
]) {
  test(`rejects invalid/replayed or wrongly bound token ${JSON.stringify(result)}`, async () => {
    globalThis.fetch = async () => Response.json(result)
    assert.equal((await submit('token')).status, 403)
    assert.deepEqual([reads, writes, notifications], [0, 0, 0])
  })
}
test('fails closed when Cloudflare is unavailable', async () => {
  globalThis.fetch = async () => { throw new Error('network timeout') }
  assert.equal((await submit('token')).status, 503)
  assert.deepEqual([reads, writes, notifications], [0, 0, 0])
})
test('fails closed on HTTP error or malformed JSON', async () => {
  for (const response of [new Response('unavailable', { status: 503 }), new Response('invalid json')]) {
    globalThis.fetch = async () => response
    assert.equal((await submit('token')).status, 503)
  }
  assert.deepEqual([reads, writes, notifications], [0, 0, 0])
})
for (const hostname of ['esnads.net', 'www.esnads.net']) {
  test(`allows verified ${hostname} signup only after Siteverify`, async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
      assert.deepEqual(JSON.parse(options.body), { secret: 'test-secret', response: 'valid-token' })
      assert.equal(writes, 0)
      return Response.json({ success: true, hostname, action: 'newsletter' })
    }
    assert.equal((await submit('valid-token')).status, 200)
    assert.deepEqual([reads, writes, notifications], [1, 1, 1])
  })
}
