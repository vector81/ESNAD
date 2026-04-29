import { cpSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const PUBLIC_PROJECT_ID = 'prj_XPlqY7E0utEAYUHyiLp7SliAT3na'
const EDITOR_PROJECT_ID = 'prj_oUbhx3NJJTS9ltbBExkBNVIHgSST'
const projectId = process.env.VERCEL_PROJECT_ID?.trim()

const isEditor = projectId === EDITOR_PROJECT_ID
const targetScript = isEditor ? 'build:editor' : 'build:public'
const sourceDir = isEditor ? 'dist/editor' : 'dist/public'

console.log(`Detected project: ${isEditor ? 'editor' : 'public'} (${projectId})`)
console.log(`Running: npm run ${targetScript}`)

const result =
  process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `npm run ${targetScript}`], {
        stdio: 'inherit',
        env: process.env,
      })
    : spawnSync('npm', ['run', targetScript], {
        stdio: 'inherit',
        env: process.env,
      })

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

// Copy the site-specific build to the unified output directory
const outputDir = resolve('dist/output')
mkdirSync(outputDir, { recursive: true })
cpSync(resolve(sourceDir), outputDir, { recursive: true })
