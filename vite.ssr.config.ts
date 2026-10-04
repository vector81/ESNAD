import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    ssr: 'src/server/renderPublicPage.tsx',
    outDir: 'api/_generated',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'public-render.js', chunkFileNames: '[name]-[hash].js' } },
  },
})
