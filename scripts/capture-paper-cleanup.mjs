import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { publicationPublicId } from '../src/lib/seoMetadata.js'
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const stage = process.argv[2] || 'after'
const directory = 'audit/paper-cleanup-job-a'
await mkdir(directory, { recursive: true })
const { publications } = JSON.parse(await readFile('api/_data/publication-snapshot.json', 'utf8'))
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH })
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 1 })
await context.addInitScript(() => localStorage.setItem('esnad_analytics_consent_v2', 'rejected'))
await context.addInitScript(items => localStorage.setItem('esnad_publications_catalog', JSON.stringify(items)), publications)
const external = new Set()
await context.route('**/*', route => {
  const url = new URL(route.request().url())
  if (url.hostname === 'localhost' || url.protocol === 'data:') return route.continue()
  external.add(url.hostname)
  return route.abort()
})
const results = []
for (const prefix of ['6d6b83d5', '01899275', 'e532cf7f', '64e97193']) {
  const pub = publications.find(p => p.id.startsWith(prefix))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://localhost:4178/library/${publicationPublicId(pub)}`, { waitUntil: 'networkidle' })
  await page.locator('.detail-meta').waitFor()
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.detail-layout')).display === 'grid')
  await page.evaluate(() => document.fonts.ready)
  // Keep the cookie prompt out of the comparison without enabling analytics.
  await page.addStyleTag({ content: '.cookie-modal { display: none !important; }' })
  await page.screenshot({ path: `${directory}/${prefix}-${stage}.png` })
  const evidence = await page.evaluate(() => ({
    abstract: [...document.querySelectorAll('.publication-abstract__block')].map(el => ({ text: el.querySelector('p')?.textContent, dir: el.getAttribute('dir'), lang: el.getAttribute('lang'), align: getComputedStyle(el).textAlign, color: getComputedStyle(el.querySelector('p')).color })),
    sidebar: document.querySelector('.detail-meta')?.textContent,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    jsonLd: JSON.parse(document.querySelector('#publication-jsonld')?.textContent || '{}').description,
    body: document.querySelector('.pub-pdf-source')?.innerHTML,
  }))
  const { body, ...metadata } = evidence
  results.push({ id: pub.id, ...metadata, bodySha256: createHash('sha256').update(body || '').digest('hex'), errors })
  await page.close()
}
await writeFile(`${directory}/${stage}-browser.json`, JSON.stringify({ results, blockedExternalHosts: [...external], firestoreReads: 0 }, null, 2))
await browser.close()
console.log(`Captured ${stage}: 4 local screenshots; all external requests blocked.`)
