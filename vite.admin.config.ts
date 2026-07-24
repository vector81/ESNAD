import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  envDir: rootDir,
  publicDir: resolve(rootDir, 'public'),
  root: resolve(rootDir, 'sites/editor'),
  server: {
    proxy: {
      '/api/posthog-summary': {
        target: 'https://esnad-editor.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: resolve(rootDir, 'dist/editor'),
    emptyOutDir: true,
  },
})
