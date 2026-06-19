import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const targetPath = resolve('dist/public/vercel.json')
const indexPath = resolve('dist/public/index.html')
const entryJsPath = resolve('dist/public/assets/index.js')
const entryCssPath = resolve('dist/public/assets/index.css')
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://api.stripe.com https://*.cloudfunctions.net https://api.cloudinary.com https://*.cloudinary.com https://us.i.posthog.com https://us.posthog.com https://*.posthog.com; frame-src 'self' https://js.stripe.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app; object-src 'none'; base-uri 'self'",
  },
]

async function getFileHash(path) {
  const buffer = await readFile(path)
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12)
}

async function versionFixedEntryAssets() {
  const [html, jsHash, cssHash] = await Promise.all([
    readFile(indexPath, 'utf8'),
    getFileHash(entryJsPath),
    getFileHash(entryCssPath),
  ])

  const nextHtml = html
    .replace(/\/assets\/index\.js(?:\?v=[a-f0-9]+)?/g, `/assets/index.js?v=${jsHash}`)
    .replace(/\/assets\/index\.css(?:\?v=[a-f0-9]+)?/g, `/assets/index.css?v=${cssHash}`)

  if (nextHtml !== html) {
    await writeFile(indexPath, nextHtml, 'utf8')
  }
}

const config = {
  headers: [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
    {
      source: '/assets/index.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    },
    {
      source: '/assets/index.css',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    },
    {
      source: '/assets/chunks/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
  redirects: [
    {
      source: '/llm.txt',
      destination: '/llms.txt',
      statusCode: 301,
    },
    {
      source: '/llms.text',
      destination: '/llms.txt',
      statusCode: 301,
    },
    {
      source: '/llm.text',
      destination: '/llms.txt',
      statusCode: 301,
    },
  ],
  rewrites: [
    {
      source: '/api/:path*',
      destination: '/api/:path*',
    },
    {
      source: '/assets/:path*',
      destination: '/assets/:path*',
    },
    {
      source: '/favicon.svg',
      destination: '/favicon.svg',
    },
    {
      source: '/logo.png',
      destination: '/logo.png',
    },
    {
      source: '/robots.txt',
      destination: '/robots.txt',
    },
    {
      source: '/llms.txt',
      destination: '/llms.txt',
    },
    {
      source: '/sitemap.xml',
      destination: '/api/sitemap',
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
}

await versionFixedEntryAssets()
await mkdir(dirname(targetPath), { recursive: true })
await writeFile(targetPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
