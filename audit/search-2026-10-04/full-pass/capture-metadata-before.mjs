import fs from 'node:fs/promises'
import { publicationPath } from '../../../src/lib/seoMetadata.js'
const pubs = JSON.parse(await fs.readFile('audit/search-2026-10-04/full-pass/publications-before.json'))
const pages = ['/', '/about', ...pubs.map(publicationPath)]
const results = await Promise.all(pages.map(async path => {
  const response = await fetch('https://esnads.net' + path, { headers: { 'user-agent': 'Googlebot' } })
  const html = await response.text()
  return { path, status: response.status, title: html.match(/<title>(.*?)<\/title>/s)?.[1], description: html.match(/name="description" content="([^"]*)/)?.[1] }
}))
await fs.writeFile('audit/search-2026-10-04/full-pass/metadata-before.json', JSON.stringify(results, null, 2))
console.log(`Saved ${results.length} current live titles`)
