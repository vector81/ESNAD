import { submitIndexNow } from '../api/_lib/indexnow.js'
import { INDEXNOW_KEY, INDEXNOW_KEY_URL } from '../src/lib/indexNowConfig.js'
const keyResponse = await fetch(INDEXNOW_KEY_URL)
if (!keyResponse.ok || (await keyResponse.text()).trim() !== INDEXNOW_KEY) throw new Error('Live IndexNow key verification failed')
const sitemap = await fetch('https://esnads.net/sitemap.xml')
if (!sitemap.ok) throw new Error(`Sitemap returned ${sitemap.status}`)
const urls = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'))
console.log(JSON.stringify(await submitIndexNow(urls)))
