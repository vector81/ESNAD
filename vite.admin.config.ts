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
  resolve: {
    alias: [
      {
        find: '@tiptap/core/jsx-runtime',
        replacement: resolve(rootDir, 'node_modules/@tiptap/core/src/jsx-runtime.ts'),
      },
      {
        find: '@tiptap/core/jsx-dev-runtime',
        replacement: resolve(rootDir, 'node_modules/@tiptap/core/src/jsx-runtime.ts'),
      },
      { find: '@tiptap/core', replacement: resolve(rootDir, 'node_modules/@tiptap/core/src/index.ts') },
      { find: '@tiptap/react', replacement: resolve(rootDir, 'node_modules/@tiptap/react/src/index.ts') },
      { find: '@tiptap/starter-kit', replacement: resolve(rootDir, 'node_modules/@tiptap/starter-kit/src/index.ts') },
      {
        find: '@tiptap/extensions',
        replacement: resolve(rootDir, 'node_modules/@tiptap/extensions/src/index.ts'),
      },
      {
        find: /^@tiptap\/extension-(.+)$/,
        replacement: resolve(rootDir, 'node_modules/@tiptap') + '/extension-$1/src/index.ts',
      },
      {
        find: /^@tiptap\/pm\/(.+)$/,
        replacement: resolve(rootDir, 'node_modules/@tiptap/pm') + '/$1/index.ts',
      },
    ],
  },
  build: {
    outDir: resolve(rootDir, 'dist/editor'),
    emptyOutDir: true,
  },
})
