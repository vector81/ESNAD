import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { priorityArticleImage } from '../src/lib/articleImages.js'
import { publicationPublicId } from '../src/lib/seoMetadata.js'

const fixture = process.argv[2]
let publications
if (fixture) publications = JSON.parse(await readFile(fixture, 'utf8'))
else {
  const response = await fetch('https://esnads.net/api/publications')
  if (!response.ok) throw new Error('Public catalog unavailable')
  const catalog = (await response.json()).publications
  publications = []
  for (const pub of catalog) {
    const page = await fetch(`https://esnads.net/api/publications?reference=${publicationPublicId(pub)}`)
    if (!page.ok) throw new Error('Public article unavailable')
    publications.push((await page.json()).publication)
  }
}
const homeItems = [publications.find(pub => pub.featured) || publications[0], ...publications.slice(0, 4)].filter(Boolean)
const sources = [...new Set([...publications.map(pub => priorityArticleImage(pub.content_json)), ...homeItems.map(pub => pub.cover_image)].filter(Boolean))].sort()
const assets = {}
await mkdir('public/assets/article-images', { recursive: true })
for (const src of sources) {
  if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(src)) continue
  const id = createHash('sha256').update(src).digest('hex').slice(0, 12)
  const variants = await Promise.all([480, 640, 900, 1200].map(async width => {
    const transformed = /\/image\/upload\/[^/]*[fq]_[^/]*\//.test(src)
      ? src.replaceAll('f_auto', 'f_webp').replace(/\/image\/upload\/([^/]+)\//, `/image/upload/$1/w_${width},c_limit/`)
      : src.replace('/image/upload/', `/image/upload/f_webp,q_auto,w_${width},c_limit/`)
    const response = await fetch(transformed)
    if (!response.ok || !response.headers.get('content-type')?.includes('image/webp')) throw new Error(`Image resize failed: ${id}/${width}`)
    const path = `/assets/article-images/${id}-${width}.webp`
    await writeFile(`public${path}`, Buffer.from(await response.arrayBuffer()))
    return [width, path]
  }))
  assets[src] = Object.fromEntries(variants)
}
await writeFile('src/lib/articleImageAssets.js', `// Resized copies of public article images, served from the site's CDN.\nexport const ARTICLE_IMAGE_ASSETS = ${JSON.stringify(assets, null, 2)}\n`)
console.log(JSON.stringify({images:Object.keys(assets).length,variants:Object.keys(assets).length*4}))
