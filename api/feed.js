import { listPublishedPublications } from './_lib/publications.js'
import { publicationPath, publicationSeo } from '../src/lib/seoMetadata.js'
import { getPublicationImage } from '../src/lib/structuredData.js'
import { cleanAuthor } from '../src/lib/cleanAuthor.js'
const xml = value => String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
export default async function handler(_request, response) {
  try {
    const publications = (await listPublishedPublications()).filter(pub => pub.kind !== 'book').sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
    const items = publications.map(pub => {
      const url = `https://esnads.net${publicationPath(pub)}`
      const date = new Date(pub.published_at || pub.created_at)
      return `<item><title>${xml(pub.title_ar)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><description>${xml(publicationSeo(pub).description)}</description>${Number.isFinite(date.getTime()) ? `<pubDate>${date.toUTCString()}</pubDate>` : ''}<dc:creator>${xml(cleanAuthor(pub.author_ar))}</dc:creator><category>${xml(pub.category)}</category>${getPublicationImage(pub) ? `<media:content url="${xml(getPublicationImage(pub))}" medium="image"><media:title>${xml(pub.title_ar)}</media:title></media:content>` : ''}</item>`
    }).join('\n')
    response.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
    response.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>مركز إسناد للدراسات والأبحاث</title><link>https://esnads.net</link><description>أحدث الدراسات والمقالات العربية من مركز إسناد</description><language>ar</language><atom:link href="https://esnads.net/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`)
  } catch (error) { console.error('[esnad/feed]', error); response.setHeader('Retry-After', '60'); response.status(503).send('Feed temporarily unavailable') }
}
