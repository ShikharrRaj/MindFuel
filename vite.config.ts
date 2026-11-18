import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { devApiPlugin } from './src/dev/devApi'

// In production the /api functions run as Vercel Edge functions. The devApi
// plugin runs those same handlers under `npm run dev`, so the full app works
// locally with only a GEMINI_API_KEY in .env.local — no Vercel account needed.
export default defineConfig({
  plugins: [react(), devApiPlugin()],
  define: {
    // Tags error reports with the deployed commit (not a secret).
    __RELEASE__: JSON.stringify(
      (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7),
    ),
  },
  server: {
    port: 5173,
  },
  test: {
    // e2e/ holds Playwright specs (npm run test:e2e), not Vitest tests.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
