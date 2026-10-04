import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const html=await readFile('dist/public/index.html','utf8');
const entry=html.match(/src="(\/assets\/index-[^"?]+\.js)"/)[1];
assert.ok(entry);assert.doesNotMatch(html,/index\.js\?v=/);
const manifest=JSON.parse(await readFile('dist/public/.vite/manifest.json','utf8'));
const chunks=Object.values(manifest).filter(v=>v.file?.endsWith('.js'));
let sharedEntryImports=0;
for(const chunk of chunks){const js=await readFile('dist/public/'+chunk.file,'utf8');if(js.includes(entry.split('/').at(-1)))sharedEntryImports++;}
assert.ok(sharedEntryImports>0,'Lazy routes share the same hashed entry context');
console.log({entry,sharedEntryImports});
