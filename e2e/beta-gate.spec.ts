import { test, expect } from '@playwright/test'

const BETA_CODE = process.env.BETA_ACCESS_CODE

test.describe('beta gate flow', () => {
  test.skip(!BETA_CODE, 'Requires BETA_ACCESS_CODE env')

  test('unauthenticated user redirected to /beta', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/beta/)
  })

  test('invalid code shows error', async ({ page }) => {
    await page.goto('/beta')
    await page.fill('input[name="code"]', 'wrong-code')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/error=/)
  })

  test('valid code grants access and cookie persists on reload', async ({ page }) => {
    await page.goto('/beta')
    await page.fill('input[name="code"]', BETA_CODE!)
    await page.click('button[type="submit"]')
    await expect(page).not.toHaveURL(/\/beta/)

    // Reload and confirm still authenticated
    await page.reload()
    await expect(page).not.toHaveURL(/\/beta/)
  })
})
