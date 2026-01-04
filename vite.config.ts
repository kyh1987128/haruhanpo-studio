import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Functions 디렉터리를 dist/_functions로 복사
      output: {
        assetFileNames: 'static/[name]-[hash][extname]'
      }
    }
  }
})
