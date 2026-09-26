import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { renderPageError, sendPageError } from '../api/_lib/page-error.js'

// Exercise the real renderers without connecting to production databases.
function loadFunctions(file, names, globals = {}) {
  const source = readFileSync(file, 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace('export default async function handler', 'async function handler')
  return vm.runInNewContext(`${source}\n;({${names.join(',')}})`, { console: { error() {} }, ...globals })
}

const shell = loadFunctions('api/publication-shell.js', [
  'buildAbsoluteUrl', 'getCanonicalPath', 'renderCatalogHtml', 'renderHtml', 'renderArticleJsonLd',
])
const pub = { id: '9547512', kind: 'article', title_ar: 'عنوان', status: 'published' }
const canonical = 'https://esnads.net/library/9547512'
assert.equal(shell.buildAbsoluteUrl('/en/library/9547512'), canonical)
assert.equal(shell.buildAbsoluteUrl('/en'), 'https://esnads.net')
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
  assert.doesNotMatch(html, /hreflang="en"/)
  assert.doesNotMatch(html, /noindex/)
}
for (const lang of ['ar', 'en']) {
  for (const section of ['home', 'library', 'articles', 'books']) {
    const url = `https://esnads.net${section === 'home' ? '' : `/${section}`}`
    checkHead(shell.renderCatalogHtml({ lang, section, publications: [pub] }), url)
  }
  checkHead(shell.renderHtml({lang, title: 'Title', description: 'Description', image: '', url: canonical, ogType: 'article'}), canonical)
}

const sitemap = loadFunctions('api/sitemap.js', ['buildPublicationUrls', 'renderSitemap'])
const urls = sitemap.buildPublicationUrls(['ar', 'en', 'both'].map((language_mode, i) => ({...pub, id: String(1000000 + i), language_mode})))
assert.equal(urls.length, 3)
const xml = sitemap.renderSitemap(urls)
assert.doesNotMatch(xml, /esnads\.net\/en(?:\/|<)/)
assert.doesNotMatch(xml, /hreflang="en"/)
assert.match(xml, /hreflang="ar"/)
assert.match(xml, /hreflang="x-default"/)
assert.doesNotMatch(readFileSync('api/sitemap.js', 'utf8'), /path: '\/en/)
assert.doesNotMatch(readFileSync('sites/public/index.html', 'utf8'), /hreflang="en"/)
assert.doesNotMatch(readFileSync('sites/public/index.html', 'utf8'), /hreflang=/)

const template = readFileSync('dist/public/index.html', 'utf8')
const middlewareSource = ts.transpileModule(readFileSync('middleware.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(/^import .*$/gm, '').replace('export const config', 'const config').replace('export default async function middleware', 'async function middleware')
let lookupStatus = 200
const middleware = vm.runInNewContext(`${middlewareSource}\n;middleware`, {
  URL, Response, AbortSignal, process: { env: {} }, renderPageError,
  fetch: async url => {
    if (new URL(url).pathname === '/api/publication-shell') {
      return new Response(JSON.stringify({canonicalPath: '/library/9547512'}), {status: lookupStatus})
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
  checkHead(await response.text(), `https://esnads.net${path.includes('/library/') ? '/library/9547512' : path.replace(/^\/en/, '')}`)
}
const crawler = await middleware(new Request('https://esnads.net/en/library/legacy-slug', {headers:{'user-agent':'Googlebot'}}))
assert.match(crawler.rewrite, /lang=en/)
assert.match(crawler.rewrite, /slug=legacy-slug/)

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
