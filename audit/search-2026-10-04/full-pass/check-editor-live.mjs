import {readFile,writeFile} from 'node:fs/promises';
const response=await fetch('https://esnad-editor.vercel.app/');const html=await response.text();
const api=await fetch('https://esnad-editor.vercel.app/api/indexnow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference:'9928005'})});
const result={checkedAt:new Date().toISOString(),editorHttp:response.status,editorFontsPresent:html.includes('fonts.googleapis.com'),unauthenticatedIndexNow:api.status};
await writeFile('audit/search-2026-10-04/full-pass/editor-live.json',JSON.stringify(result,null,2));console.log(result);
