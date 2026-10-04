import {readFile,writeFile} from 'node:fs/promises';
import {ARTICLE_IMAGE_ASSETS} from '../../../src/lib/articleImageAssets.js';
const paths=[...new Set(Object.values(ARTICLE_IMAGE_ASSETS).flatMap(variants=>Object.values(variants)))];
for(const path of paths){const bytes=await readFile('public'+path);if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid WebP asset: '+path);}
const errors=[];for(let index=0;index<paths.length;index+=8){for(const result of await Promise.all(paths.slice(index,index+8).map(async path=>{const response=await fetch('https://esnads.net'+path,{method:'HEAD'});return {path,status:response.status,type:response.headers.get('content-type')};}))){if(result.status!==200||!result.type?.includes('image/webp'))errors.push(result);}}
const result={checkedAt:new Date().toISOString(),images:17,variants:paths.length,errors};await writeFile('audit/search-2026-10-04/full-pass/image-assets-live.json',JSON.stringify(result,null,2));console.log(result);if(errors.length)process.exitCode=1;
