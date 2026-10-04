import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
let css=await readFile('audit/search-2026-10-04/full-pass/google-fonts.css','utf8');
await mkdir('public/assets/fonts',{recursive:true});
const urls=[...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))];
for(const url of urls){const name='arabic-'+createHash('sha256').update(url).digest('hex').slice(0,10)+'.woff2';const data=Buffer.from(await (await fetch(url)).arrayBuffer());await writeFile('public/assets/fonts/'+name,data);css=css.replaceAll(url,'/assets/fonts/'+name);console.log(name,data.length);}
const faces=[...new Set([...css.matchAll(/@font-face\s*\{[^}]+\}/g)].map(m=>m[0].replace(/font-weight: \d+;/,'font-weight: 400 700;')))];
await writeFile('src/public-fonts.css',faces.join('\n'));
for(const [name,url] of [['Cairo-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/OFL.txt'],['NotoNaskhArabic-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/notonaskharabic/OFL.txt']]){const response=await fetch(url);if(!response.ok)throw Error('Missing font license');await writeFile('public/assets/fonts/'+name,await response.text());}
let hero=await readFile('src/lib/initialPageHtml.js','utf8');hero=hero.replace('<h3 class="home-hero__card-title">','<h2 class="home-hero__card-title">').replace('</h3></div></a>','</h2></div></a>');await writeFile('src/lib/initialPageHtml.js',hero);
for(const file of ['vercel-public.json','scripts/write-public-vercel.mjs']){let data=await readFile(file,'utf8');data=data.replace("script-src 'self' 'unsafe-inline' https://js.stripe.com;","script-src 'self' 'unsafe-inline' https://js.stripe.com https://apis.google.com;").replace("frame-src 'self' https://js.stripe.com", "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com");await writeFile(file,data);}
