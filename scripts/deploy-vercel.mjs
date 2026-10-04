import { spawnSync } from 'node:child_process'

import { getVercelTarget } from './vercel-targets.mjs'

const target = getVercelTarget(process.argv[2])

const linkResult =
  process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `node scripts/use-vercel-project.mjs ${target.key}`], {
        stdio: 'inherit',
        env: process.env,
      })
    : spawnSync('node', ['scripts/use-vercel-project.mjs', target.key], {
        stdio: 'inherit',
        env: process.env,
      })

if (linkResult.status !== 0) {
  process.exit(linkResult.status ?? 1)
}

const deployCommand = `npx --yes vercel@60.1.3 --prod --yes --local-config ${target.localConfig}`
const deployResult =
  process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', deployCommand], {
        stdio: 'inherit',
        env: process.env,
      })
    : spawnSync('npx', ['--yes', 'vercel@60.1.3', '--prod', '--yes', '--local-config', target.localConfig], {
        stdio: 'inherit',
        env: process.env,
      })

if (deployResult.status !== 0) {
  process.exit(deployResult.status ?? 1)
}
if (target.key === 'public') {
  const ping = spawnSync(process.execPath, ['scripts/ping-indexnow.mjs'], { stdio: 'inherit', env: process.env })
  if (ping.status !== 0) { console.error('Deployment completed; IndexNow notification failed. Retry npm run indexnow.'); process.exitCode = 1 }
}
