import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(
    new Headers({ 'x-forwarded-for': '1.2.3.4' })
  ),
}))

import { submitReport } from '@/lib/report/report-action'
import type { EmailSender } from '@/lib/report/report-action'
import { isRateLimited } from '@/lib/report/rate-limit'

function mockSender(error: { message: string } | null = null): EmailSender {
  return {
    send: vi.fn().mockResolvedValue({ error }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_REPORT_EMAIL = 'admin@test.com'
})

describe('submitReport', () => {
  it('sends email with correct payload on valid report', async () => {
    const sender = mockSender()

    const result = await submitReport(
      { pageUrl: 'https://example.com/page', reason: 'broken-link' },
      sender
    )

    expect(result.ok).toBe(true)
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@test.com',
        subject: expect.stringContaining('broken-link'),
      })
    )
  })

  it('includes optional text in email body', async () => {
    const sender = mockSender()

    await submitReport(
      { pageUrl: 'https://example.com', reason: 'other', text: 'looks wrong' },
      sender
    )

    const callArgs = vi.mocked(sender.send).mock.calls[0][0]
    expect(callArgs.text).toContain('looks wrong')
  })

  it('rejects invalid reason', async () => {
    const sender = mockSender()
    const result = await submitReport(
      { pageUrl: 'https://example.com', reason: 'invalid' as never },
      sender
    )

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Invalid report reason')
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('rejects missing pageUrl', async () => {
    const sender = mockSender()
    const result = await submitReport(
      { pageUrl: '', reason: 'inappropriate' },
      sender
    )

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Page URL is required')
  })

  it('rejects text exceeding 500 characters', async () => {
    const sender = mockSender()
    const result = await submitReport(
      { pageUrl: 'https://example.com', reason: 'other', text: 'a'.repeat(501) },
      sender
    )

    expect(result.ok).toBe(false)
    expect(result.error).toContain('500 characters')
  })

  it('returns error when email send fails', async () => {
    const sender = mockSender({ message: 'API error' })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await submitReport(
      { pageUrl: 'https://example.com', reason: 'inappropriate' },
      sender
    )

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Failed to send report')
    consoleSpy.mockRestore()
  })

  it('returns error when ADMIN_REPORT_EMAIL not set', async () => {
    delete process.env.ADMIN_REPORT_EMAIL
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await submitReport(
      { pageUrl: 'https://example.com', reason: 'inappropriate' },
      mockSender()
    )

    expect(result.ok).toBe(false)
    expect(result.error).toContain('temporarily unavailable')
    consoleSpy.mockRestore()
  })
})

describe('isRateLimited', () => {
  it('returns false for first report', () => {
    expect(isRateLimited('10.0.0.1', Date.now())).toBe(false)
  })

  it('returns false after window expires', () => {
    const now = Date.now()
    expect(isRateLimited('10.0.0.2', now)).toBe(false)
    expect(isRateLimited('10.0.0.2', now + 2 * 60 * 60 * 1000)).toBe(false)
  })
})
