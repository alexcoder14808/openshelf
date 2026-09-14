import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BASE_PATH lets the same codebase deploy to either a domain root
// (Vercel/Netlify — base "/") or a GitHub Pages project site
// (https://<user>.github.io/<repo>/ — base "/<repo>/"). The GitHub Actions
// workflow sets this automatically; locally/elsewhere it defaults to "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          epubjs: ['epubjs'],
          pdfjs: ['pdfjs-dist'],
        },
      },
    },
  },
})
