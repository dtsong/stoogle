import { test, expect } from '@playwright/test'

test.describe('health endpoint', () => {
  test('/api/health/search returns 200 with status field', async ({ request }) => {
    const response = await request.get('/api/health/search')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toHaveProperty('status')
  })
})
