import { INDEXNOW_KEY, INDEXNOW_HOST, INDEXNOW_KEY_URL } from '../../src/lib/indexNowConfig.js'
export async function submitIndexNow(urlList) {
  const urls = [...new Set(urlList)].filter(url => { try { const parsed = new URL(url); return parsed.protocol === 'https:' && parsed.host === INDEXNOW_HOST } catch { return false } })
  if (!urls.length || urls.length > 10000) throw new Error('invalid_indexnow_urls')
  const response = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: INDEXNOW_HOST, key: INDEXNOW_KEY, keyLocation: INDEXNOW_KEY_URL, urlList: urls }), signal: AbortSignal.timeout(20000) })
  if (![200, 202].includes(response.status)) throw new Error(`indexnow_http_${response.status}`)
  return { status: response.status, submitted: urls.length }
}
