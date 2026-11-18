/**
 * Production smoke test: the built app under the real security headers.
 * Fails on any CSP violation or console error, across the main surfaces.
 */
import { expect, test, type Page } from '@playwright/test'

function watch(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`)
  })
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  return problems
}

test.beforeEach(async ({ page }) => {
  // Record CSP violations from the very first script.
  await page.addInitScript(() => {
    ;(window as unknown as { __csp: string[] }).__csp = []
    document.addEventListener('securitypolicyviolation', (e) => {
      ;(window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} ${e.blockedURI}`,
      )
    })
  })
})

async function cspViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)
}

test('onboarding, every tab, SOS and the legal pages work under the CSP', async ({
  page,
}) => {
  const problems = watch(page)
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain(
    "script-src 'self'",
  )

  await page.getByLabel('When is your exam?').fill('2027-05-02')
  await page.getByRole('button', { name: 'Start checking in' }).click()

  for (const tab of ['Calm', 'Focus', 'Companion', 'Patterns', 'Check in']) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  }
  await expect(
    page.getByRole('heading', { name: 'How has today felt?' }),
  ).toBeVisible()

  // Calm now: the breathing pacer starts at once (Web Audio / vibration safe).
  await page.getByRole('button', { name: 'Calm now' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Close calm now' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  // A check-in saved without AI never calls the API.
  await page.getByRole('radio', { name: /low \(2 of 5\)/i }).click()
  await page.getByLabel("What's on your mind?").fill('Mock test went badly')
  await page.getByRole('button', { name: 'Reflect with MindFuel' }).click()
  await page.getByRole('button', { name: 'Save without AI' }).click()
  await expect(page.getByText('Nothing was sent to the AI.')).toBeVisible()

  await page.getByRole('link', { name: 'Privacy' }).click()
  await expect(
    page.getByRole('heading', { name: 'Privacy policy', level: 1 }),
  ).toBeVisible()
  await page.getByRole('button', { name: /back to mindfuel/i }).click()
  await page.goto('/#terms')
  await expect(
    page.getByRole('heading', { name: 'Terms of use', level: 1 }),
  ).toBeVisible()

  expect(await cspViolations(page)).toEqual([])
  expect(problems).toEqual([])
})

test('the #sos deep link opens straight into breathing', async ({ page }) => {
  const problems = watch(page)
  await page.goto('/#sos')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Breathe with me' }),
  ).toBeVisible()
  expect(await cspViolations(page)).toEqual([])
  expect(problems).toEqual([])
})
