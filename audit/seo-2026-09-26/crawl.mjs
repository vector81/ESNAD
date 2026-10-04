import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const out = new URL('./', import.meta.url)
await mkdir(new URL('responses/', out), { recursive: true })
const agents = { crawler: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' }
const clean = s => s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
function attrs(tag) { return Object.fromEntries([...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(m=>[m[1],m[2]])) }
async function get(url, agent='crawler') {
 const start=Date.now()
 try {
  const r=await fetch(url,{headers:{'user-agent':agents[agent]},signal:AbortSignal.timeout(25000)})
  const html=await r.text()
  const key=createHash('sha256').update(url+agent).digest('hex').slice(0,16)
  await writeFile(new URL(`responses/${key}.txt`,out),html)
  const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0]))
  const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0]))
  const body=clean((html.split(/<body[^>]*>/i)[1]||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''))
  const schemas=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>{try{return JSON.parse(m[1])}catch{return {invalid:true}}})
  return {url,agent,finalUrl:r.url,status:r.status,ms:Date.now()-start,bytes:Buffer.byteLength(html),headers:Object.fromEntries([...r.headers].filter(([k])=>['content-type','cache-control','vary','x-robots-tag','x-vercel-cache','content-encoding'].includes(k))),title:clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||''),metas,links,h1:[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>clean(m[1])),lang:attrs(html.match(/<html[^>]*>/i)?.[0]||'').lang,bodyChars:body.length,arabicChars:(body.match(/[\u0600-\u06ff]/g)||[]).length,latinChars:(body.match(/[a-z]/gi)||[]).length,bodyHash:createHash('sha256').update(body).digest('hex'),anchors:[...html.matchAll(/<a\b[^>]*>/gi)].map(m=>attrs(m[0]).href).filter(Boolean),schemas,evidence:`responses/${key}.txt`}
 }catch(e){return {url,agent,error:e.message}}
}
const sitemap=await fetch('https://esnads.net/sitemap.xml').then(r=>r.text())
await writeFile(new URL('sitemap.xml',out),sitemap)
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1])
console.log(`Sitemap: ${urls.length} URLs`)
const extra=['/robots.txt','/seo-audit-missing-20260926','/library/999999999999','/en/library/999999999999','/books/9547512','/reader/9547512','/en/reader/9547512','/login','/en/login','/library?q=seo-audit','/library/9547512/','/stories/9547512']
const jobs=[...new Set([...urls,...extra.map(p=>'https://esnads.net'+p)])].map(url=>[url,'crawler'])
for(const p of ['/','/en','/library','/en/library','/about','/en/about','/library/9547512','/en/library/9547512','/books/9547512','/library/999999999999','/login']) jobs.push(['https://esnads.net'+p,'browser'])
const results=[]
await Promise.all(Array.from({length:3},async()=>{while(jobs.length){const [u,a]=jobs.shift();results.push(await get(u,a));if(results.length%20===0) console.log(`${results.length} responses checked`)}}))
await writeFile(new URL('crawl.json',out),JSON.stringify({checkedAt:new Date().toISOString(),sitemapCount:urls.length,results},null,2))
console.log(JSON.stringify({total:results.length,errors:results.filter(r=>r.error),statuses:results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})}))
