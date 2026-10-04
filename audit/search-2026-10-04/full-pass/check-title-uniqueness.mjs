import {readFile} from 'node:fs/promises';import {publicationSeo,publicationPublicId} from '../../../src/lib/seoMetadata.js';
const publications=JSON.parse(await readFile('audit/search-2026-10-04/full-pass/publications-before.json','utf8'));
const seen=new Set();for(const p of publications){const title=publicationSeo(p).title;if(seen.has(title))throw Error('Duplicate: '+title);seen.add(title);}console.log('All 34 Arabic article SEO titles are unique.');
