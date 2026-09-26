import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the real renderers without connecting to production databases.
function loadFunctions(file, names) {
  const source = readFileSync(file, 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace('export default async function handler', 'async function handler')
  return vm.runInNewContext(`${source}\n;({${names.join(',')}})`, { console })
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

const template = readFileSync('dist/public/index.html', 'utf8')
const middlewareSource = ts.transpileModule(readFileSync('middleware.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(/^import .*$/gm, '').replace('export const config', 'const config').replace('export default async function middleware', 'async function middleware')
const middleware = vm.runInNewContext(`${middlewareSource}\n;middleware`, {
  URL, Response,
  fetch: async url => {
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
  checkHead(await response.text(), `https://esnads.net${path.replace(/^\/en/, '')}`)
}
const crawler = await middleware(new Request('https://esnads.net/en/library/legacy-slug', {headers:{'user-agent':'Googlebot'}}))
assert.match(crawler.rewrite, /lang=en/)
assert.match(crawler.rewrite, /slug=legacy-slug/)
console.log('SEO canonical regression checks passed: renderers, sitemap, browser shell, and English no-redirect routing.')
