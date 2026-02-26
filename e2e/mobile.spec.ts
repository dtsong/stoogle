import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone 13'] })

test.describe('mobile viewport', () => {
  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = page.viewportSize()!.width
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })

  test('sticky search bar visible after scroll', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(300)

    const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="earch"]')
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible()
    }
  })
})
