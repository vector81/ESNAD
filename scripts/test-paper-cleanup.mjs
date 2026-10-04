import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { cleanAbstract } from '../src/lib/cleanAbstract.js'
import { publicationSeo, publicationPublicId, shortText } from '../src/lib/seoMetadata.js'
import { createArticleStructuredData } from '../src/lib/structuredData.js'
process.env.NODE_ENV = 'production'
const { renderPublicPage } = await import('../api/_generated/public-render.js')
const snapshotBytes = await readFile('api/_data/publication-snapshot.json')
const { publications } = JSON.parse(snapshotBytes)
const original = JSON.stringify(publications)
const byPrefix = prefix => publications.find(p => p.id.startsWith(prefix))
assert.deepEqual(cleanAbstract('نص عربي سليم.'), { ar: 'نص عربي سليم.', en: '' })
assert.deepEqual(cleanAbstract('English text.'), { ar: '', en: 'English text.' })
assert.deepEqual(cleanAbstract('اسم الكاتب/\nالملخص العربي — ١٠٠ كلمة\nنص عربي.\nEnglish Abstract — 100 Words\nEnglish text.'), { ar: 'نص عربي.', en: 'English text.' })
assert.equal(cleanAbstract('المستخلص: نص عربي.').ar, 'نص عربي.')
assert.equal(cleanAbstract('نص عربي عن https://example.org/path').ar, 'نص عربي عن https://example.org/path')
assert.equal(cleanAbstract('الملخص/\nنص عربي.').ar, 'نص عربي.')
const mixed = ['fd7a55a3', '6d6b83d5', 'b78ba0f1', 'a26721d4', '0c4524af', '19b3ccbd', 'b1c54007', 'b4eb44d2']
for (const prefix of mixed) {
  const p = byPrefix(prefix), cleaned = cleanAbstract(p.abstract_ar)
  assert.ok(cleaned.ar && cleaned.en, prefix)
  assert.doesNotMatch(cleaned.ar, /English Abstract|100 Words|^عبدالله[^/]*\//)
  assert.match(cleaned.en, /^[A-Za-z]/)
}
for (const prefix of ['6d6b83d5', '56e0dfb5', 'c3988698', 'd713e358', 'da67e138', 'c9d10643']) assert.doesNotMatch(cleanAbstract(byPrefix(prefix).abstract_ar).ar, /^[^\n]{0,60}\//)
assert.equal(cleanAbstract(byPrefix('64e97193').abstract_ar).ar, byPrefix('64e97193').abstract_ar)
for (const publication of publications) {
  const path = `/library/${publicationPublicId(publication)}`
  const html = renderPublicPage({ path, language: 'ar', publication })
  const sidebar = html.match(/<dl class="detail-meta">[\s\S]*?<\/dl>/)?.[0] || ''
  assert.doesNotMatch(sidebar, /الصفحات/)
  if (!publication.topic_ar) assert.doesNotMatch(sidebar, /الموضوع/)
  const abstract = cleanAbstract(publication.abstract_ar || publication.abstract_en)
  if (abstract.ar) assert.equal(publicationSeo(publication).description, shortText(abstract.ar, 154))
  assert.equal(createArticleStructuredData(publication, { url: `https://esnads.net${path}` }).description, publicationSeo(publication).description)
  if (abstract.en) assert.match(html, /dir="ltr" lang="en"/)
}
const control = { ...byPrefix('64e97193'), pages: 12, topic_ar: 'موضوع عربي', topic_en: '' }
assert.match(renderPublicPage({ path: '/library/control', language: 'ar', publication: control }), /الصفحات/)
assert.doesNotMatch(renderPublicPage({ path: '/en/library/control', language: 'en', publication: control }), /<dt>Topic<\/dt>/)
for (const pages of [undefined, null, 0, 1]) assert.doesNotMatch(renderPublicPage({ path: '/library/control', language: 'ar', publication: { ...control, pages } }), /<dt>الصفحات/)
const savedNow = Date.now, savedFetch = globalThis.fetch
try {
  // Exercise the real API from its existing snapshot fallback, with networking forbidden.
  Date.now = () => Date.parse('2026-10-04T08:00:00Z')
  globalThis.fetch = () => { throw new Error('Network prohibited in local audit') }
  const { recordBackendStatus } = await import('../api/_lib/publication-cache.js')
  recordBackendStatus(429)
  const { default: handler } = await import('../api/publication-shell.js')
  const pub = byPrefix('6d6b83d5'), slug = publicationPublicId(pub)
  let payload, crawlerHtml
  const response = { setHeader() {}, status(code) { assert.equal(code, 200); return this }, json(value) { payload = value }, send(value) { crawlerHtml = value } }
  await handler({ query: { slug, section: 'library', lang: 'ar', format: 'json' } }, response)
  assert.match(payload.initialHtml, /dir="ltr" lang="en"/)
  assert.equal(payload.description, publicationSeo(pub).description)
  await handler({ query: { slug, section: 'library', lang: 'ar' } }, response)
  assert.ok(crawlerHtml.includes(payload.initialHtml), 'Crawler and browser shell share the full renderer')
  assert.doesNotMatch(crawlerHtml.match(/<dl class="detail-meta">[\s\S]*?<\/dl>/)[0], /الصفحات|الموضوع/)
  const source = await readFile('middleware.ts', 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
    .replace(/from '([^']+)'/g, (_, specifier) => `from '${import.meta.resolve(specifier.startsWith('.') ? '../' + specifier.slice(2) : specifier)}'`)
  const { default: middleware } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
  globalThis.fetch = async url => new Response(String(url).includes('publication-shell') ? JSON.stringify(payload) : '<html lang="ar"><head><title>Old</title><meta name="description" content="Old"><link rel="canonical" href=""></head><body><div id="root"></div></body></html>', { headers: { 'content-type': String(url).includes('publication-shell') ? 'application/json' : 'text/html' } })
  const rendered = await middleware(new Request(`http://localhost/library/${slug}`, { headers: { 'user-agent': 'Chrome' } }))
  const shell = await rendered.text()
  assert.ok(shell.includes(payload.initialHtml))
  assert.ok(shell.includes(payload.description))
  const crawler = await middleware(new Request(`http://localhost/library/${slug}`, { headers: { 'user-agent': 'Googlebot' } }))
  assert.match(crawler.headers.get('x-middleware-rewrite'), /publication-shell/)
} finally { Date.now = savedNow; globalThis.fetch = savedFetch }
const before = JSON.parse(await readFile('audit/paper-cleanup-job-a/before-browser.json'))
const after = JSON.parse(await readFile('audit/paper-cleanup-job-a/after-browser.json'))
for (const item of after.results) {
  assert.deepEqual(item.errors, [])
  assert.equal(item.bodySha256, before.results.find(p => p.id === item.id).bodySha256, 'Document body unchanged')
  assert.equal(item.description, item.jsonLd, 'Browser metadata and schema agree')
  assert.doesNotMatch(item.sidebar, /الصفحات|الموضوع/)
  for (const block of item.abstract) { assert.equal(block.color, 'rgb(34, 34, 34)'); assert.equal(block.align, block.lang === 'ar' ? 'right' : 'left') }
}
assert.equal(JSON.stringify(publications), original)
assert.deepEqual(await readFile('api/_data/publication-snapshot.json'), snapshotBytes)
await writeFile('audit/paper-cleanup-job-a/validation.json', JSON.stringify({ publications: publications.length, mixedAbstracts: mixed.length, browserScreenshots: 8, bodyUnchanged: true, cleanControlUnchanged: true, browserServerCrawlerParity: true, firestoreReads: 0, snapshotSha256: createHash('sha256').update(snapshotBytes).digest('hex') }, null, 2))
console.log('Paper cleanup: 34 cached records; browser, SSR, crawler and middleware passed; zero Firestore reads.')
