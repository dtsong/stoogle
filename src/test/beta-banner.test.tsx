import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('BetaBanner', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.BETA_FEEDBACK_URL
  })

  it('renders nothing when beta is disabled', async () => {
    vi.doMock('@/lib/beta', () => ({ isBetaEnabled: false }))
    const { BetaBanner } = await import('@/components/beta-banner')
    const { container } = render(<BetaBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('renders banner text when beta is enabled', async () => {
    vi.doMock('@/lib/beta', () => ({ isBetaEnabled: true }))
    const { BetaBanner } = await import('@/components/beta-banner')
    render(<BetaBanner />)
    expect(screen.getByText(/closed beta/i)).toBeDefined()
  })

  it('shows feedback link when BETA_FEEDBACK_URL is set', async () => {
    process.env.BETA_FEEDBACK_URL = 'https://feedback.example.com'
    vi.doMock('@/lib/beta', () => ({ isBetaEnabled: true }))
    const { BetaBanner } = await import('@/components/beta-banner')
    render(<BetaBanner />)
    const link = screen.getByText('Share feedback')
    expect(link.getAttribute('href')).toBe('https://feedback.example.com')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('hides feedback link when BETA_FEEDBACK_URL is not set', async () => {
    delete process.env.BETA_FEEDBACK_URL
    vi.doMock('@/lib/beta', () => ({ isBetaEnabled: true }))
    const { BetaBanner } = await import('@/components/beta-banner')
    render(<BetaBanner />)
    expect(screen.queryByText('Share feedback')).toBeNull()
  })
})
