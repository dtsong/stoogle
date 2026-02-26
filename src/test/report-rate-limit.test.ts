import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('report rate limiter', () => {
  let isRateLimited: typeof import('@/lib/report/rate-limit').isRateLimited
  let recordReport: typeof import('@/lib/report/rate-limit').recordReport

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/lib/report/rate-limit')
    isRateLimited = mod.isRateLimited
    recordReport = mod.recordReport
  })

  it('returns false for unknown IP', () => {
    expect(isRateLimited('192.168.0.1')).toBe(false)
  })

  it('returns false after 1-2 reports', () => {
    const now = Date.now()
    recordReport('10.0.0.1', now)
    expect(isRateLimited('10.0.0.1', now)).toBe(false)

    recordReport('10.0.0.1', now)
    expect(isRateLimited('10.0.0.1', now)).toBe(false)
  })

  it('returns true after hitting the limit (3 per hour)', () => {
    const now = Date.now()
    for (let i = 0; i < 3; i++) {
      recordReport('10.0.0.2', now)
    }
    expect(isRateLimited('10.0.0.2', now)).toBe(true)
  })

  it('resets after window expires', () => {
    const now = Date.now()
    for (let i = 0; i < 3; i++) {
      recordReport('10.0.0.3', now)
    }
    expect(isRateLimited('10.0.0.3', now)).toBe(true)

    const afterWindow = now + 61 * 60 * 1000
    expect(isRateLimited('10.0.0.3', afterWindow)).toBe(false)
  })

  it('tracks different IPs independently', () => {
    const now = Date.now()
    for (let i = 0; i < 3; i++) {
      recordReport('10.0.0.4', now)
    }
    expect(isRateLimited('10.0.0.4', now)).toBe(true)
    expect(isRateLimited('10.0.0.5', now)).toBe(false)
  })
})
