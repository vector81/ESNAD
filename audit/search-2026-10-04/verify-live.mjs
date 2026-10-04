import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const origin = 'https://esnads.net'
const results = await Promise.all([
  ['/', 'Googlebot'], ['/', 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36'],
  ['/en', 'Googlebot'], ['/articles', 'Googlebot'], ['/library', 'Googlebot'],
  ['/library/9547512', 'Googlebot'], ['/sitemap.xml', 'Googlebot'],
].map(async ([path, userAgent]) => {
  const response = await fetch(origin + path, {
    headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(30000),
  })
  const html = await response.text()
  assert.equal(response.status, 200, path)
  if (path === '/sitemap.xml') {
    assert.doesNotMatch(html, /<loc>[^<]*\/en\//)
    return { path, status: response.status, urls: (html.match(/<loc>/g) || []).length }
  }
  if (path === '/en') assert.match(html, /<title>[^<]*Esnad/)
  else {
    assert.match(html, /<title>[^<]*إسناد/)
    assert.doesNotMatch(html, /<title>[^<]*Esnad/)
  }
  assert.doesNotMatch(html, /name="robots" content="noindex/)
  const canonical = html.match(/rel="canonical"[^>]*href="([^"]+)/)?.[1]
  assert.equal(canonical, origin + (['/', '/en'].includes(path) ? '' : path))
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
  if (['/', '/en'].includes(path)) {
    const website = data['@graph'].find(node => node['@type'] === 'WebSite')
    assert.ok(website.alternateName.includes('Esnad'))
    assert.equal(website.name, 'إسناد')
    assert.ok(website.alternateName.includes('اسناد'))
    assert.equal(website.url, origin)
  }
  if (path.startsWith('/library/')) assert.ok(data.publisher.alternateName.includes('Esnad'))
  return { path, userAgent, status: response.status, canonical,
    title: html.match(/<title>(.*?)<\/title>/s)?.[1], bytes: html.length,
    schemaTypes: data['@graph']?.map(node => node['@type']) || [data['@type']],
  }
}))
await writeFile(new URL('./production-checks.json', import.meta.url), JSON.stringify({
  verifiedAt: new Date().toISOString(), results,
}, null, 2))
console.log(JSON.stringify(results, null, 2))
