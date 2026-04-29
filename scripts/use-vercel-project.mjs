import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { getVercelTarget } from './vercel-targets.mjs'

const target = getVercelTarget(process.argv[2])
const projectPath = resolve('.vercel/project.json')
const projectConfig = {
  projectId: target.projectId,
  orgId: 'team_LY486N9UARupxXPcEFv70Y6y',
  projectName: target.projectName,
}

await mkdir(dirname(projectPath), { recursive: true })
await writeFile(projectPath, `${JSON.stringify(projectConfig)}\n`, 'utf8')

console.log(`Linked local Vercel CLI target to ${target.projectName}.`)
