/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devApiPlugin } from './src/dev/devApi'

// In production the /api functions run as Vercel Edge functions. The devApi
// plugin runs those same handlers under `npm run dev`, so the full app works
// locally with only a GEMINI_API_KEY in .env.local — no Vercel account needed.
export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
