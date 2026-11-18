import { defineConfig, devices } from '@playwright/test'

// Smoke tests against the production build (`npm run build` first), served
// with vercel.json's headers by e2e/serve.mjs.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node e2e/serve.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
