import {readFile,writeFile} from 'node:fs/promises';
import {publicationPublicId} from '../../../src/lib/seoMetadata.js';
const before=JSON.parse(await readFile('audit/search-2026-10-04/full-pass/content-before.json','utf8'));
const changes=[];
for(let i=0;i<before.length;i+=5){for(const pair of await Promise.all(before.slice(i,i+5).map(async old=>{const response=await fetch('https://esnads.net/api/publications?reference='+publicationPublicId(old));const now=(await response.json()).publication;return {old,now};}))){for(const key of ['content_json','description_ar','description_en','updated_at']){if(JSON.stringify(pair.old[key])!==JSON.stringify(pair.now[key]))changes.push({id:pair.old.id,publicId:publicationPublicId(pair.old),field:key,beforeLength:JSON.stringify(pair.old[key])?.length,afterLength:JSON.stringify(pair.now[key])?.length,beforeDate:pair.old.updated_at,afterDate:pair.now.updated_at});}}}
await writeFile('audit/search-2026-10-04/full-pass/body-comparison.json',JSON.stringify(changes,null,2));console.log(changes);
