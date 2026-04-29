import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const targetPath = resolve('dist/editor/vercel.json')
const config = {
  rewrites: [
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
}

await mkdir(dirname(targetPath), { recursive: true })
await writeFile(targetPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
