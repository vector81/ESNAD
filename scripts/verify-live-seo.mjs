import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { publicationPath, publicationPublicId, SEO_UPDATED_AT } from '../src/lib/seoMetadata.js'
import { SEO_SITE_NAME, SEO_ALTERNATE_NAMES } from '../src/lib/structuredData.js'
import { INDEXNOW_KEY, INDEXNOW_KEY_URL } from '../src/lib/indexNowConfig.js'
const origin = 'https://esnads.net'
const directory = process.argv[2] || 'audit/search-2026-10-04/full-pass'
await mkdir(directory, { recursive: true })
const decode = text => String(text).replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>')
async function get(path, userAgent = 'Googlebot') {
  const response = await fetch(path.startsWith('https:') ? path : origin + path, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(45000) })
  assert.equal(response.status, 200, path)
  return response
}
const publications = (await (await get('/api/publications')).json()).publications
const sitemap = await (await get('/sitemap.xml')).text()
const sitemapUrls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => ({url:decode(match[1].match(/<loc>(.*?)<\/loc>/)[1]), xml: match[1]}))
const results = []
async function verify(path, browser = false) {
  const html = await (await get(path, browser ? 'Mozilla/5.0 Chrome/140 Safari/537.36' : 'Googlebot')).text()
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || '')
  const description = decode(html.match(/name="description"\s+content="([^"]*)/)?.[1] || '')
  assert.ok(title && title.length < 60, `${path}: title length ${title.length}`)
  assert.ok(description && description.length < 155, `${path}: description length ${description.length}`)
  if (!path.startsWith('/en')) assert.doesNotMatch(title, /[a-z]/i, path)
  assert.match(html, new RegExp(`property="og:site_name" content="${SEO_SITE_NAME}"`), path)
  assert.match(html, /rel="alternate" type="application\/rss\+xml"/, path)
  assert.doesNotMatch(html, /name="robots" content="noindex/, path)
  const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  const nodes = schemas.flatMap(data => data['@graph'] || [data])
  if (path === '/' || path === '/en') {
    const org = nodes.find(node => node['@type'] === 'Organization')
    const website = nodes.find(node => node['@type'] === 'WebSite')
    assert.deepEqual(org.alternateName, SEO_ALTERNATE_NAMES)
    assert.deepEqual(website.alternateName, SEO_ALTERNATE_NAMES)
    assert.deepEqual(org.sameAs, [])
    assert.equal(org.logo, `${origin}/newlogo.png`)
    assert.equal(website.publisher['@id'], org['@id'])
    for (const [lang, href] of [['ar', origin], ['en', `${origin}/en`], ['x-default', origin]]) assert.ok(html.includes(`hreflang="${lang}" href="${href}"`), `${path}: ${lang}`)
    assert.ok(html.includes(`rel="canonical" href="${path === '/en' ? origin + '/en' : origin}"`), path)
    if (!browser) await writeFile(`${directory}/${path === '/' ? 'homepage' : 'english-homepage'}-live.jsonld.json`, JSON.stringify(schemas.length === 1 ? schemas[0] : schemas, null, 2))
  } else assert.doesNotMatch(html, /hreflang="en"/, path)
  const publication = publications.find(pub => publicationPath(pub) === path.replace(/^\/en/, ''))
  if (publication && publication.kind !== 'book') {
    const article = nodes.find(node => node['@type'] === 'Article')
    assert.ok(article, path)
    for (const key of ['headline', 'description', 'datePublished', 'dateModified', 'author', 'publisher', 'image']) assert.ok(article[key], `${path}: ${key}`)
    assert.equal(article.inLanguage, 'ar')
    assert.equal(article.publisher['@id'], `${origin}/#organization`)
    assert.equal(article.publisher.name, SEO_SITE_NAME)
    assert.ok(article.image.length && article.image.every(url => /^https:\/\//.test(url)), path)
    assert.ok(nodes.some(node => node['@type'] === 'BreadcrumbList'), `${path}: breadcrumbs`)
    if (!browser) {
      const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)]
      assert.equal(headings.length, 1, path)
      assert.equal(decode(headings[0][1]), publication.title_ar, path)
      const related = html.match(/<section aria-label="مقالات ذات صلة">([\s\S]*?)<\/section>/)?.[1] || ''
      const links = [...related.matchAll(/href="(\/library\/\d+)"/g)].map(match => match[1])
      assert.ok(links.length >= 3 && links.length <= 4, `${path}: ${links.length} related links`)
      assert.ok(!links.includes(path), path)
      for (const image of [...html.matchAll(/<img\b[^>]*>/g)]) assert.match(decode(image[0].match(/alt="([^"]*)"/)?.[1] || ''), /[\u0600-\u06ff]/, `${path}: Arabic alt`)
      if (publicationPublicId(publication) === '9928005') await writeFile(`${directory}/article-live.jsonld.json`, JSON.stringify(article, null, 2))
    }
  }
  if (['/library', '/articles', '/books'].includes(path) || path.startsWith('/topics/')) assert.ok(nodes.some(node => node['@type'] === 'BreadcrumbList'), path)
  results.push({path, browser, title, description, status:200})
  return html
}
const paths = [...new Set(sitemapUrls.map(entry => new URL(entry.url).pathname).filter(path => path !== '/llms.txt'))]
for (let index = 0; index < paths.length; index += 5) await Promise.all(paths.slice(index, index + 5).map(path => verify(path)))
for (const path of ['/', '/en', '/library/9928005', '/en/library/7230859', '/topics/studies']) await verify(path, true)
const archive = await (await get('/library')).text()
const home = await (await get('/')).text()
assert.match(home, /href="\/library"/)
for (const pub of publications) {
  if (pub.kind !== 'book') assert.ok(archive.includes(`href="${publicationPath(pub)}"`), `Two-click discovery: ${pub.title_ar}`)
  const entry = sitemapUrls.find(item => item.url === origin + publicationPath(pub))
  assert.ok(entry, publicationPath(pub))
  assert.match(entry.xml, /<image:image><image:loc>https:\/\//)
  const expectedDate = [pub.updated_at || pub.published_at, SEO_UPDATED_AT].filter(Boolean).sort().at(-1)
  assert.ok(entry.xml.includes(`<lastmod>${expectedDate}</lastmod>`), `${publicationPath(pub)}: lastmod`)
}
const feed = await (await get('/feed.xml')).text()
assert.match(feed, /<language>ar<\/language>/)
for (const pub of publications.filter(pub => pub.kind !== 'book')) assert.ok(feed.includes(`<link>${origin}${publicationPath(pub)}</link>`), pub.title_ar)
assert.equal((await (await get(INDEXNOW_KEY_URL)).text()).trim(), INDEXNOW_KEY)
const denied = await fetch(`${origin}/api/indexnow`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({reference:'9928005'})})
assert.equal(denied.status, 403, 'Publish notification requires an admin')
let bodyHashes = []
try {
  const baseline = JSON.parse(await readFile(`${directory}/content-before.json`, 'utf8'))
  for (let index = 0; index < publications.length; index += 5) {
    const batch = await Promise.all(publications.slice(index,index+5).map(async pub => {
      const current = (await (await get(`/api/publications?reference=${publicationPublicId(pub)}`)).json()).publication
      const hash = createHash('sha256').update(JSON.stringify([current.content_json,current.description_ar,current.description_en])).digest('hex')
      const previous = baseline.find(entry => entry.id === pub.id)
      // Firestore can return object keys in a different order between reads.
      assert.deepEqual([current.content_json,current.description_ar,current.description_en], [previous.content_json,previous.description_ar,previous.description_en], `${pub.title_ar}: body unchanged`)
      return {id:pub.id,hash}
    }))
    bodyHashes.push(...batch)
  }
} catch (error) { if (error.code !== 'ENOENT') throw error }
const report = { checkedAt:new Date().toISOString(), pages:results.length, sitemapUrls:sitemapUrls.length, publications:publications.length, feedItems:(feed.match(/<item>/g)||[]).length, bodiesUnchanged:bodyHashes.length, results }
await writeFile(`${directory}/verify-live.json`, JSON.stringify(report,null,2))
console.log(JSON.stringify({pages:report.pages,sitemapUrls:report.sitemapUrls,articles:report.publications,feedItems:report.feedItems,bodiesUnchanged:report.bodiesUnchanged}))
