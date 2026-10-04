// Local screenshot and layout checks. Every image is served from disk.
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { ARTICLE_IMAGE_ASSETS } from '../src/lib/articleImageAssets.js'
import { ARTICLE_COVER_FALLBACKS } from '../src/lib/articleCoverFallbacks.js'
import { getPublicationImage, createArticleStructuredData } from '../src/lib/structuredData.js'
import { publicationSeo } from '../src/lib/seoMetadata.js'
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const bytes = await readFile('api/_data/publication-snapshot.json')
const { publications } = JSON.parse(bytes)
const directory = 'audit/paper-cleanup-job-c'
await mkdir(directory, { recursive: true })
for (const publication of publications) {
  const expected = publication.cover_image || ARTICLE_COVER_FALLBACKS[publication.id] || ''
  assert.equal(getPublicationImage(publication), expected ? new URL(expected, 'https://esnads.net').href : '')
  assert.equal(createArticleStructuredData(publication, { url: 'https://esnads.net/library/test' }).image[0], getPublicationImage(publication) || undefined)
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH })
const results = [], blockedExternalHosts = new Set()
try {
  for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
    await context.addInitScript(items => localStorage.setItem('esnad_publications_catalog', JSON.stringify(items)), publications)
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.hostname === 'localhost' || url.protocol === 'data:') return route.continue()
      const key = Object.keys(ARTICLE_IMAGE_ASSETS).find(src => src.split('/').at(-1) === url.pathname.split('/').at(-1))
      if (key) {
        const image = ARTICLE_IMAGE_ASSETS[key][640] || ARTICLE_IMAGE_ASSETS[key][900]
        return route.fulfill({ contentType: 'image/webp', body: await readFile(`public${image}`) })
      }
      blockedExternalHosts.add(url.hostname)
      return route.abort()
    })
    for (const [name, path, expectedCount] of [['homepage', '/', 6], ['library', '/library', 34]]) {
      const page = await context.newPage(), errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`http://localhost:4178${path}`, { waitUntil: 'networkidle' })
      await page.waitForFunction(count => document.querySelectorAll('.publication-card').length === count, expectedCount)
      await page.evaluate(() => document.fonts.ready)
      await page.addStyleTag({ content: '.cookie-modal { display: none !important; }' })
      const cards = await page.locator('.publication-card').evaluateAll(elements => elements.map(el => ({
        id: el.getAttribute('data-publication-id'), height: el.getBoundingClientRect().height,
        title: el.querySelector('.card__title').textContent,
        lines: getComputedStyle(el.querySelector('.card__title')).webkitLineClamp,
        fallback: !!el.querySelector('.card__fallback'),
        colour: el.querySelector('.card__fallback') ? getComputedStyle(el.querySelector('.card__fallback')).backgroundColor : null,
        image: el.querySelector('.card__media > img')?.getAttribute('src'),
        author: el.querySelector('.card__byline > span').textContent,
        date: el.querySelector('time').getAttribute('datetime'),
      })))
      assert.deepEqual(errors, [])
      assert.ok(Math.max(...cards.map(c => c.height)) - Math.min(...cards.map(c => c.height)) < 1, 'All grid cards have equal height')
      for (const card of cards) {
        const pub = publications.find(p => p.id === card.id)
        assert.equal(card.fallback, !pub.cover_image.trim())
        assert.equal(card.title, publicationSeo(pub).title.replace(/\s*\|\s*إسناد$/, ''))
        assert.equal(card.lines, '3')
        assert.equal(card.date, pub.published_at)
        assert.equal(card.author, pub.author_ar || pub.author_en)
      }
      assert.ok(cards.slice(0, 6).filter(c => c.fallback).length >= 2)
      assert.ok(cards.slice(0, 6).filter(c => c.image).length >= 2)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
      for (let i = 0; i < 6; i++) await page.locator('.publication-card').nth(i).scrollIntoViewIfNeeded()
      await page.waitForFunction(() => [...document.querySelectorAll('.publication-card')].slice(0, 6).every(el => { const img = el.querySelector('.card__media > img'); return !img || (img.complete && img.naturalWidth > 0) }))
      await page.evaluate(() => scrollTo(0, 0))
      if (name === 'homepage') await page.screenshot({ path: `${directory}/${name}-${device}.png`, fullPage: true })
      else {
        const bottom = await page.locator('.publication-card').nth(5).evaluate(el => el.getBoundingClientRect().bottom)
        await page.screenshot({ path: `${directory}/${name}-${device}.png`, fullPage: true, clip: { x: 0, y: 0, width: viewport.width, height: Math.ceil(bottom + 24) } })
      }
      results.push({ name, device, viewport, cards, errors })
      await page.close()
    }
    await context.close()
  }
} finally { await browser.close() }
assert.deepEqual(await readFile('api/_data/publication-snapshot.json'), bytes)
await writeFile(`${directory}/validation.json`, JSON.stringify({ results, firestoreReads: 0, imagesServedFromDisk: true, socialImageSelectionUnchanged: true, blockedExternalHosts: [...blockedExternalHosts], snapshotSha256: createHash('sha256').update(bytes).digest('hex') }, null, 2))
console.log('Cards passed: desktop/mobile home and library; equal heights; own images and CSS fallback; unchanged social images; zero Firestore reads.')
