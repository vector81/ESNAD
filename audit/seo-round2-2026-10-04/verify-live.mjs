import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { SEO_ALTERNATE_NAMES, SEO_SITE_NAME, SEO_SITE_URL } from '../../src/lib/structuredData.js'
import { ARTICLE_COVER_FALLBACKS } from '../../src/lib/articleCoverFallbacks.js'

const origin = SEO_SITE_URL
const browser = 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36'
const results = []

async function verifyPage(path, userAgent = 'Googlebot') {
  const response = await fetch(origin + path, {
    headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(30000),
  })
  assert.equal(response.status, 200, path)
  const html = await response.text()
  assert.match(html, /property="og:site_name" content="مركز إسناد للدراسات والأبحاث"/, path)
  if (!path.startsWith('/en')) assert.doesNotMatch(html, /<title>[^<]*(?:Esnad|Esnads)/, path)
  const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]))
  const nodes = blocks.flatMap(data => data['@graph'] || [data])
  const website = nodes.find(node => node['@type'] === 'WebSite')
  const organization = nodes.find(node => node['@type'] === 'Organization')
  const article = nodes.find(node => node['@type'] === 'Article')
  if (path === '/' || path === '/en') {
    assert.ok(website && organization, path)
    assert.deepEqual(website.alternateName, SEO_ALTERNATE_NAMES)
    assert.deepEqual(organization.alternateName, SEO_ALTERNATE_NAMES)
    assert.deepEqual(organization.sameAs, [])
    assert.equal(organization.logo, origin + '/newlogo.png')
    assert.equal(website.publisher['@id'], organization['@id'])
  }
  if (/\/(?:library|reader)\/[^/]+/.test(path)) {
    assert.ok(article, `${path}: missing Article`)
    for (const property of ['headline', 'datePublished', 'dateModified', 'author', 'publisher', 'image']) {
      assert.ok(article[property], `${path}: missing ${property}`)
    }
    assert.equal(article.inLanguage, 'ar')
    assert.ok(Number.isFinite(Date.parse(article.datePublished)), path)
    assert.ok(Number.isFinite(Date.parse(article.dateModified)), path)
    assert.ok(article.author.name, path)
    assert.equal(article.publisher['@id'], origin + '/#organization')
    assert.equal(article.publisher.name, SEO_SITE_NAME)
    assert.deepEqual(article.publisher.sameAs, [])
    assert.ok(article.image.length > 0, `${path}: missing representative image`)
    article.image.forEach(image => assert.match(image, /^https:\/\//, path))
    assert.match(article.url, /^https:\/\/esnads.net\/library\/\d+$/)
  }
  results.push({ path, userAgent, status: response.status, title: html.match(/<title>(.*?)<\/title>/s)?.[1],
    ogSiteName: SEO_SITE_NAME, article: Boolean(article), image: article?.image,
  })
  if (path === '/' && userAgent === 'Googlebot') {
    await writeFile(new URL('./homepage-live.json', import.meta.url), JSON.stringify(blocks[0], null, 2))
    await writeFile(new URL('./homepage-identity-live.json', import.meta.url), JSON.stringify({
      '@context': 'https://schema.org', '@graph': [website, organization],
    }, null, 2))
  }
  if (path === '/library/9547512' && userAgent === 'Googlebot') {
    await writeFile(new URL('./article-9547512-live.json', import.meta.url), JSON.stringify(article, null, 2))
  }
}

const sitemapResponse = await fetch(origin + '/sitemap.xml')
assert.equal(sitemapResponse.status, 200)
const sitemap = await sitemapResponse.text()
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname)
assert.ok(paths.length > 0)
assert.ok(!paths.some(path => path.startsWith('/en')))
const htmlPaths = paths.filter(path => !path.endsWith('.txt'))
// Limit requests to avoid producing a load spike during verification.
let next = 0
await Promise.all(Array.from({length: 3}, async () => {
  while (next < htmlPaths.length) await verifyPage(htmlPaths[next++])
}))
for (const path of ['/', '/library/9547512', '/en/library/9547512', '/reader/9547512', '/en/reader/9547512']) {
  await verifyPage(path, browser)
}
await verifyPage('/en')
const imageChecks = []
for (const path of ['/newlogo.png', ...Object.values(ARTICLE_COVER_FALLBACKS)]) {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('content-type'), /^image\//, path)
  imageChecks.push({path, status: response.status, contentType: response.headers.get('content-type')})
  await response.arrayBuffer()
}
await writeFile(new URL('./production-checks.json', import.meta.url), JSON.stringify({
  verifiedAt: new Date().toISOString(), sitemapUrls: paths.length, results, imageChecks,
}, null, 2))
console.log(`PASS: ${results.length} live pages, ${results.filter(result => result.article).length} Article schemas, ${imageChecks.length} image URLs, ${paths.length} sitemap URLs.`)
