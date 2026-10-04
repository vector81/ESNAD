// Local screenshot and layout checks. Every image is served from disk.
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { ARTICLE_IMAGE_ASSETS } from '../src/lib/articleImageAssets.js'
import { ARTICLE_COVER_FALLBACKS } from '../src/lib/articleCoverFallbacks.js'
import { getPublicationImage, createArticleStructuredData } from '../src/lib/structuredData.js'
import { publicationSeo, publicationPublicId } from '../src/lib/seoMetadata.js'
import { cleanAuthor } from '../src/lib/cleanAuthor.js'
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const bytes = await readFile('api/_data/publication-snapshot.json')
const { publications } = JSON.parse(bytes)
const directory = process.argv[2] || 'audit/paper-cleanup-job-c'
const articleCoverCheck = process.argv.includes('--article-cover')
await mkdir(directory, { recursive: true })
for (const publication of publications) {
  const expected = publication.cover_image || ARTICLE_COVER_FALLBACKS[publication.id] || ''
  assert.equal(getPublicationImage(publication), expected ? new URL(expected, 'https://esnads.net').href : '')
  assert.equal(createArticleStructuredData(publication, { url: 'https://esnads.net/library/test' }).image[0], getPublicationImage(publication) || undefined)
  assert.equal(createArticleStructuredData(publication, { url: 'https://esnads.net/library/test' }).author.name, cleanAuthor(publication.author_ar || publication.author_en))
}
assert.equal(cleanAuthor('اسم الكاتب [1] [٢] '), 'اسم الكاتب')
assert.equal(cleanAuthor('Writer [2]'), 'Writer')
assert.equal(cleanAuthor('Writer [2] and colleague'), 'Writer [2] and colleague')
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
    for (const [name, path, expectedCount] of (articleCoverCheck ? [['library', '/library', 34]] : [['homepage', '/', 6], ['library', '/library', 34]])) {
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
        imagePosition: el.querySelector('.card__media > img') ? getComputedStyle(el.querySelector('.card__media > img')).objectPosition : null,
        tagGap: el.querySelector('.card__meta').getBoundingClientRect().top - el.querySelector('.card__title').getBoundingClientRect().bottom,
        masthead: el.querySelector('.card__fallback-masthead')?.textContent,
        fallbackLogo: !!el.querySelector('.card__fallback-logo'),
        stripe: el.querySelector('.card__fallback') ? getComputedStyle(el.querySelector('.card__fallback')).borderRightWidth : null,
      })))
      assert.deepEqual(errors, [])
      assert.ok(Math.max(...cards.map(c => c.height)) - Math.min(...cards.map(c => c.height)) < 1, 'All grid cards have equal height')
      for (const card of cards) {
        const pub = publications.find(p => p.id === card.id)
        assert.equal(card.fallback, !pub.cover_image.trim())
        assert.equal(card.title, publicationSeo(pub).title.replace(/\s*\|\s*إسناد$/, ''))
        assert.equal(card.lines, '3')
        assert.equal(card.date, pub.published_at)
        assert.equal(card.author, cleanAuthor(pub.author_ar || pub.author_en))
        assert.ok(card.tagGap >= 0 && card.tagGap <= 10, 'Tags immediately follow the title')
        if (card.image) assert.equal(card.imagePosition, '50% 0%')
        if (card.fallback && pub.kind === 'article') {
          assert.equal(card.colour, 'rgb(247, 241, 229)')
          assert.equal(card.masthead, 'مركز إسناد للدراسات والأبحاث')
          assert.equal(card.fallbackLogo, false)
          assert.equal(card.stripe, '4px')
        } else if (card.fallback) {
          assert.equal(card.fallbackLogo, true)
          assert.equal(card.masthead, undefined)
          assert.notEqual(card.colour, 'rgb(247, 241, 229)')
        }
      }
      if (name === 'homepage') {
        const spotlight = await page.evaluate(() => ({ hero: document.querySelector('.home-hero__card').getAttribute('href'), heroPosition: getComputedStyle(document.querySelector('.home-hero__card-media img')).objectPosition, spotlight: document.querySelector('.spotlight-band__copy a').getAttribute('href'), height: document.querySelector('.spotlight-band__media img').getBoundingClientRect().height, fit: getComputedStyle(document.querySelector('.spotlight-band__media img')).objectFit }))
        assert.notEqual(spotlight.hero, spotlight.spotlight)
        const expectedSpotlight = publications.filter(p => p.featured && !spotlight.hero.endsWith('/' + publicationPublicId(p))).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0]
        assert.ok(spotlight.spotlight.endsWith('/' + publicationPublicId(expectedSpotlight)))
        assert.equal(spotlight.heroPosition, '50% 0%')
        assert.ok(spotlight.height <= 520)
        assert.equal(spotlight.fit, 'cover')
      }
      assert.ok(cards.slice(0, 6).filter(c => c.fallback).length >= 2)
      assert.ok(cards.slice(0, 6).filter(c => c.image).length >= 2)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
      const screenshotCount = articleCoverCheck ? Math.max(6, cards.findIndex(c => c.fallback && publications.find(p => p.id === c.id).kind === 'article') + 1) : 6
      for (let i = 0; i < screenshotCount; i++) await page.locator('.publication-card').nth(i).scrollIntoViewIfNeeded()
      await page.waitForFunction(count => [...document.querySelectorAll('.publication-card')].slice(0, count).every(el => { const img = el.querySelector('.card__media > img'); return !img || (img.complete && img.naturalWidth > 0) }), screenshotCount)
      await page.evaluate(() => scrollTo(0, 0))
      if (name === 'homepage') await page.screenshot({ path: `${directory}/${name}-${device}.png`, fullPage: true })
      else {
        const bottom = await page.locator('.publication-card').nth(screenshotCount - 1).evaluate(el => el.getBoundingClientRect().bottom)
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
