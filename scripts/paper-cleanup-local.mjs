// Local-only preview: every publication comes from the cached snapshot.
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { publicationPublicId, publicationSeo } from '../src/lib/seoMetadata.js'
import { createArticleStructuredData, serializeStructuredData } from '../src/lib/structuredData.js'
const { publications } = JSON.parse(await readFile('api/_data/publication-snapshot.json', 'utf8'))
const server = await createServer({ configFile: 'vite.public.config.ts', server: { port: 4178, strictPort: true }, define: { 'import.meta.env.VITE_FIREBASE_API_KEY': 'undefined' } })
server.middlewares.use(async (req, res, next) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path === '/api/publications') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ publications })); return }
  if (['/', '/library'].includes(path)) {
    let template = await readFile('sites/public/index.html', 'utf8')
    template = template.replace('src="./main.tsx"', 'src="/main.tsx"').replace('</head>', `<script id="initial-catalog-data" type="application/json">${serializeStructuredData(publications)}</script></head>`)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(await server.transformIndexHtml(path, template))
    return
  }
  const match = path.match(/^\/(en\/)?library\/([^/]+)$/)
  if (!match) return next()
  const publication = publications.find(p => [p.id, publicationPublicId(p)].includes(match[2]))
  if (!publication) { res.statusCode = 404; res.end(); return }
  try {
    const language = match[1] ? 'en' : 'ar'
    const { renderPublicPage } = await server.ssrLoadModule(`/@fs/${resolve('src/server/renderPublicPage.tsx').replaceAll('\\', '/')}`)
    const html = renderPublicPage({ path, language, publication })
    const meta = publicationSeo(publication)
    let template = await readFile('sites/public/index.html', 'utf8')
    template = template.replace('src="./main.tsx"', 'src="/main.tsx"')
    template = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`)
      .replace('<html lang="ar">', `<html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}">`)
      .replace(/(<meta name="description" content=")[^"]*/, (_, start) => start + meta.description.replaceAll('"', '&quot;'))
      .replace('</head>', `<script id="initial-publication-data" type="application/json">${serializeStructuredData(publication)}</script><script id="initial-catalog-data" type="application/json">${serializeStructuredData(publications)}</script><script id="publication-jsonld" type="application/ld+json">${serializeStructuredData(createArticleStructuredData(publication, { url: `https://esnads.net${path}` }))}</script></head>`)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(await server.transformIndexHtml(path, template))
  } catch (error) { server.ssrFixStacktrace(error); next(error) }
})
// Install before Vite's HTML fallback so the actual SSR page is served.
server.middlewares.stack.unshift(server.middlewares.stack.pop())
await server.listen()
console.log('Cached-only local preview: http://localhost:4178')
