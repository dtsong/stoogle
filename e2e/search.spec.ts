import { test, expect } from '@playwright/test'

test.describe('search flow', () => {
  test.skip(!process.env.RUN_E2E_SEARCH, 'Requires RUN_E2E_SEARCH=1 and indexed data')

  test('known query returns results', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="earch"]')
    await searchInput.fill('Jesus')
    await searchInput.press('Enter')

    const results = page.locator('[data-testid="result-card"], .result-card, article')
    await expect(results.first()).toBeVisible({ timeout: 10000 })
  })

  test('empty query shows validation', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="earch"]')
    await searchInput.fill('')
    await searchInput.press('Enter')

    // Should not navigate to results or should show validation message
    const url = page.url()
    expect(url).not.toContain('q=')
  })

  test('result cards have external links', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="earch"]')
    await searchInput.fill('Jesus')
    await searchInput.press('Enter')

    const firstLink = page.locator('[data-testid="result-card"] a, .result-card a, article a').first()
    await expect(firstLink).toBeVisible({ timeout: 10000 })
    const href = await firstLink.getAttribute('href')
    expect(href).toMatch(/^https?:\/\//)
  })
})
