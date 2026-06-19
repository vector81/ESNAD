import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const targetPath = resolve('dist/editor/vercel.json')
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
const config = {
  headers: [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
  rewrites: [
    {
      source: '/api/:path*',
      destination: '/api/:path*',
    },
    {
      source: '/(.*)',
      destination: '/index.html',
    },
  ],
}

await mkdir(dirname(targetPath), { recursive: true })
await writeFile(targetPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
