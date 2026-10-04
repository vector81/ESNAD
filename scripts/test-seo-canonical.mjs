import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { renderPageError, sendPageError } from '../api/_lib/page-error.js'
import * as structuredData from '../src/lib/structuredData.js'
import * as seoMetadata from '../src/lib/seoMetadata.js'
import * as seoTopics from '../src/lib/seoTopics.js'
import * as articleImages from '../src/lib/articleImages.js'
import { cleanAuthor } from '../src/lib/cleanAuthor.js'
import { getPublicPublicationId } from '../api/_lib/publications.js'

// Exercise the real renderers without connecting to production databases.
function loadFunctions(file, names, globals = {}) {
  const source = readFileSync(file, 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace('export default async function handler', 'async function handler')
  return vm.runInNewContext(`${source}\n;({${names.join(',')}})`, { console: { error() {} }, cleanAuthor, ...structuredData, ...seoMetadata, ...seoTopics, ...globals })
}

const shell = loadFunctions('api/publication-shell.js', [
  'buildAbsoluteUrl', 'getCanonicalPath', 'renderCatalogHtml', 'renderHtml', 'renderArticleJsonLd',
])
const pub = { id: '9547512', kind: 'article', title_ar: 'عنوان', status: 'published' }
const canonical = 'https://esnads.net/library/9547512'
assert.equal(shell.buildAbsoluteUrl('/en/library/9547512'), canonical)
assert.equal(shell.buildAbsoluteUrl('/en'), 'https://esnads.net/en')
assert.equal(shell.buildAbsoluteUrl('/energy'), 'https://esnads.net/energy')
assert.equal(shell.getCanonicalPath(pub, 'en', 'library'), '/library/9547512')
assert.equal(shell.getCanonicalPath(pub, 'ar', 'books'), '/library/9547512')
assert.equal(shell.getCanonicalPath({ ...pub, kind: 'article', type: 'book' }, 'ar', 'books'), '/library/9547512')
assert.equal(shell.getCanonicalPath({ ...pub, kind: 'book' }, 'ar', 'library'), '/books/9547512')
assert.equal(shell.getCanonicalPath({ ...pub, kind: 'book' }, 'en', 'books'), '/books/9547512')
assert.equal(shell.buildAbsoluteUrl('/en/books/9547512'), 'https://esnads.net/books/9547512')

function checkHead(html, url) {
  assert.ok(html.includes(`<link rel="canonical" href="${url}"`), `canonical ${url}`)
  assert.ok(html.includes(`<meta property="og:url" content="${url}"`), `og:url ${url}`)
  if (['https://esnads.net', 'https://esnads.net/en'].includes(url)) assert.match(html, /hreflang="en" href="https:\/\/esnads.net\/en"/)
  else assert.doesNotMatch(html, /hreflang="en"/)
  assert.doesNotMatch(html, /noindex/)
  assert.match(html, /property="og:site_name" content="مركز إسناد للدراسات والأبحاث"/)
}
for (const lang of ['ar', 'en']) {
  for (const section of ['home', 'library', 'articles', 'books']) {
    const url = `https://esnads.net${section === 'home' ? (lang === 'en' ? '/en' : '') : `/${section}`}`
    checkHead(shell.renderCatalogHtml({ lang, section, publications: [pub] }), url)
  }
  checkHead(shell.renderHtml({lang, title: 'Title', description: 'Description', image: '', url: canonical, ogType: 'article'}), canonical)
}

// Keep the public Arabic brand while declaring Latin and Arabic spelling aliases.
for (const html of [
  shell.renderCatalogHtml({ lang: 'ar', section: 'home', publications: [pub] }),
  readFileSync('sites/public/index.html', 'utf8'),
]) {
  assert.match(html, /<title>مركز إسناد للدراسات والأبحاث<\/title>/)
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  const website = data['@graph'].find(node => node['@type'] === 'WebSite')
  const organization = data['@graph'].find(node => node['@type'] === 'Organization')
  assert.equal(website.url, 'https://esnads.net')
  assert.ok(website.alternateName.includes('Esnad'))
  assert.equal(website.name, 'إسناد')
  assert.ok(website.alternateName.includes('اسناد'))
  assert.deepEqual(website.alternateName, structuredData.SEO_ALTERNATE_NAMES)
  assert.deepEqual(organization.alternateName, structuredData.SEO_ALTERNATE_NAMES)
  assert.deepEqual(organization.sameAs, [])
  assert.equal(organization.logo, 'https://esnads.net/newlogo.png')
  assert.ok(data['@graph'].some(node => node['@id'] === website.publisher['@id']))
}
const articleData = JSON.parse(shell.renderArticleJsonLd({ pub, language: 'ar', url: canonical }))
assert.ok(articleData.publisher.alternateName.includes('Esnad'))
assert.equal(articleData.publisher['@id'], 'https://esnads.net/#organization')
const datedPub = { ...pub, headline_ar: 'العنوان المختصر', author_ar: 'اسم الباحث',
  published_at: '2026-09-22T11:57:41.896Z', updated_at: '2026-09-22T12:40:57.035Z',
  cover_image: 'https://example.com/article-cover.png' }
for (const language of ['ar', 'en']) {
  const data = JSON.parse(shell.renderArticleJsonLd({ pub: datedPub, language, url: canonical }))
  assert.equal(data.inLanguage, 'ar')
  assert.equal(data.headline, datedPub.headline_ar)
  assert.equal(data.datePublished, datedPub.published_at)
  assert.equal(data.dateModified, datedPub.updated_at)
  assert.equal(data.author.name, datedPub.author_ar)
  assert.deepEqual(data.image, [datedPub.cover_image])
}
const fallbackPub = { ...datedPub, id: 'd713e358-d198-49fb-8f46-e23c1ee60950', cover_image: '',
  updated_at: 'invalid-date', author_ar: 'مركز إسناد' }
const fallbackData = structuredData.createArticleStructuredData(fallbackPub, { url: canonical })
assert.match(fallbackData.image[0], /^https:\/\/esnads.net\/assets\/article-covers\//)
assert.equal(fallbackData.dateModified, datedPub.published_at)
assert.equal(fallbackData.author['@type'], 'Organization')
assert.equal(fallbackData.author['@id'], fallbackData.publisher['@id'])
assert.doesNotMatch(structuredData.serializeStructuredData({ headline: '</script><script>bad</script>' }), /<\/script>/)

const sitemap = loadFunctions('api/sitemap.js', ['buildPublicationUrls', 'renderSitemap'], { getPublicPublicationId })
const urls = sitemap.buildPublicationUrls(['ar', 'en', 'both'].map((language_mode, i) => ({...pub, id: String(1000000 + i), language_mode})))
assert.equal(urls.length, 3)
const xml = sitemap.renderSitemap(urls)
assert.doesNotMatch(xml, /esnads\.net\/en(?:\/|<)/)
assert.doesNotMatch(xml, /hreflang="en"/)
assert.match(xml, /hreflang="ar"/)
assert.match(xml, /hreflang="x-default"/)
assert.match(readFileSync('api/sitemap.js', 'utf8'), /path: '\/en'/)
assert.doesNotMatch(readFileSync('sites/public/index.html', 'utf8'), /hreflang="en"/)
assert.doesNotMatch(readFileSync('sites/public/index.html', 'utf8'), /hreflang=/)

const template = readFileSync('dist/public/index.html', 'utf8')
const middlewareSource = ts.transpileModule(readFileSync('middleware.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(/^import .*$/gm, '').replace('export const config', 'const config').replace('export default async function middleware', 'async function middleware')
let lookupStatus = 200
const middleware = vm.runInNewContext(`${middlewareSource}\n;middleware`, {
  ...articleImages,
  URL, Response, AbortSignal, process: { env: {} }, renderPageError,
  serializeStructuredData: structuredData.serializeStructuredData,
  PAGE_SEO: seoMetadata.PAGE_SEO,
  fetch: async url => {
    if (new URL(url).pathname === '/api/publication-shell') {
      if (new URL(url).searchParams.get('mode') === 'catalog') return new Response(JSON.stringify({meta: {title:'Esnad Center for Studies and Research', description:'Research'}, publications:[], jsonLd:{}}), {status:lookupStatus})
      return new Response(JSON.stringify({canonicalPath: '/library/9547512',
        articleJsonLd: structuredData.createArticleStructuredData(datedPub, {url:canonical}),
      }), {status: lookupStatus})
    }
    assert.equal(new URL(url).pathname, '/index.html')
    return new Response(template)
  },
  next: () => ({ next: true }),
  rewrite: url => ({ rewrite: String(url) }),
})
for (const path of ['/en', '/en/about', '/en/contact', '/en/reader/9547512', '/en/library/9547512', '/en/library/legacy-slug']) {
  const response = await middleware(new Request(`https://esnads.net${path}`, { headers: { 'user-agent': 'Chrome/140' } }))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('location'), null)
  checkHead(await response.text(), `https://esnads.net${/\/(library|reader)\//.test(path) ? '/library/9547512' : path === '/en' ? '/en' : path.replace(/^\/en/, '')}`)
}
const crawler = await middleware(new Request('https://esnads.net/en/library/legacy-slug', {headers:{'user-agent':'Googlebot'}}))
assert.match(crawler.rewrite, /lang=en/)
assert.match(crawler.rewrite, /slug=legacy-slug/)
for (const path of ['/library/9547512', '/en/library/9547512', '/reader/9547512', '/en/reader/9547512']) {
  const response = await middleware(new Request(`https://esnads.net${path}`, {headers:{'user-agent':'Chrome/140'}}))
  assert.equal(response.status, 200)
  const html = await response.text()
  const data = JSON.parse(html.match(/<script id="publication-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  assert.equal(data['@type'], 'Article')
  assert.equal(data.inLanguage, 'ar')
  assert.equal(data.dateModified, datedPub.updated_at)
}

for (const status of [404, 503]) {
  lookupStatus = status
  for (const ua of ['Googlebot', 'Chrome/140']) {
    for (const path of ['/library/missing', '/en/books/missing', '/reader/missing']) {
      const response = await middleware(new Request(`https://esnads.net${path}`, {headers:{'user-agent':ua}}))
      assert.equal(response.status, status)
      assert.match(response.headers.get('x-robots-tag'), /noindex/)
      assert.match(await response.text(), /name="robots" content="noindex/)
    }
  }
}
lookupStatus = 200
for (const ua of ['Googlebot', 'Chrome/140']) {
  for (const path of ['/reader/9547512', '/en/reader/9547512']) {
    const reader = await middleware(new Request(`https://esnads.net${path}`, {headers:{'user-agent':ua}}))
    assert.equal(reader.status, 200)
    assert.equal(reader.headers.get('location'), null)
    checkHead(await reader.text(), canonical)
  }
}
for (const ua of ['Googlebot', 'Chrome/140']) {
  const wrongSection = await middleware(new Request('https://esnads.net/books/9547512?source=test', {headers:{'user-agent':ua}}))
  assert.equal(wrongSection.status, 301)
  assert.equal(wrongSection.headers.get('location'), 'https://esnads.net/library/9547512?source=test')
  const englishWrongSection = await middleware(new Request('https://esnads.net/en/books/9547512', {headers:{'user-agent':ua}}))
  if (ua.startsWith('Chrome')) {
    assert.equal(englishWrongSection.status, 200)
    checkHead(await englishWrongSection.text(), canonical)
  } else {
    assert.match(englishWrongSection.rewrite, /lang=en/)
  }
}
for (const path of ['/not-a-route', '/en/not-a-route', '/library/a/b', '/enlibrary']) {
  const response = await middleware(new Request(`https://esnads.net${path}`))
  assert.equal(response.status, 404)
  assert.match(await response.text(), /noindex/)
}
for (const path of ['/assets/index.js', '/api/publications', '/robots.txt', '/sitemap.xml']) {
  assert.equal((await middleware(new Request(`https://esnads.net${path}`))).next, true)
}
function responseMock() {
  return { headers: {}, setHeader(k,v) { this.headers[k]=v }, status(code) { this.code=code; return this }, send(body) { this.body=body }, json(body) { this.body=body } }
}
for (const failure of [false, true]) {
  const {handler} = loadFunctions('api/publication-shell.js', ['handler'], {
    sendPageError,
    getPublicationByReferenceFromAdmin: async () => { if(failure) throw new Error('database unavailable'); return null },
    listPublishedPublications: async () => { throw new Error('database unavailable') },
  })
  for (const format of [undefined, 'json']) {
    const response = responseMock()
    await handler({query:{slug:'missing',format}}, response)
    assert.equal(response.code, failure ? 503 : 404)
    assert.match(response.headers['x-robots-tag'], /noindex/)
  }
  const response = responseMock()
  await handler({query:{mode:'catalog'}}, response)
  assert.equal(response.code, 503)
  assert.match(response.body, /noindex/)
}
console.log('SEO canonical regression checks passed: renderers, sitemap, browser shell, and English no-redirect routing.')
