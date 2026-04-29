import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  envDir: rootDir,
  publicDir: resolve(rootDir, 'public'),
  root: resolve(rootDir, 'sites/public'),
  build: {
    manifest: true,
    outDir: resolve(rootDir, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css') ? 'assets/index.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
