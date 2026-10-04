import {readFile} from 'node:fs/promises';
const pubs=JSON.parse(await readFile('audit/search-2026-10-04/full-pass/content-before.json','utf8'));
for(const pub of pubs.filter(p=>['49cbce24-6e67-4d08-880f-682883353f05'].includes(p.id)||p.title_ar.includes('قطر تغادر')||p.title_ar.includes('الكنيسة'))){console.log(pub.id,pub.published_at);function walk(n){if(n?.type==='image'||n?.type==='figure')console.log(n.type,n.attrs);for(const c of n?.content||[])walk(c);}walk(pub.content_json);}
const r=JSON.parse(await readFile('audit/search-2026-10-04/full-pass/article-after.report.json','utf8'));for(const k of ['lcp-discovery-insight','lcp-breakdown-insight','cls-culprits-insight','heading-order','image-alt','color-contrast'])console.log(k,JSON.stringify(r.audits[k]?.details));
