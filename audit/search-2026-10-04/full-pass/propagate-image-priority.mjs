import {readFile,writeFile} from 'node:fs/promises';
const file='src/reader/lib/render-pm-json.tsx';let text=await readFile(file,'utf8');text=text.replaceAll('renderNode(n, i)','renderNode(n, i, priorityImage)');await writeFile(file,text);
