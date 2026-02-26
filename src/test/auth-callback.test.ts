import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('auth callback route', () => {
  const mockVerifyOtp = vi.fn()
  const mockSetAdminSessionCookie = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        auth: { verifyOtp: mockVerifyOtp },
      }),
    }))

    vi.doMock('@/lib/admin/auth', () => ({
      setAdminSessionCookie: mockSetAdminSessionCookie,
    }))

    vi.doMock('@/lib/env', () => ({
      env: {
        supabase: {
          url: 'https://test.supabase.co',
          anonKey: 'test-anon-key',
        },
      },
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function callGET(params: Record<string, string>) {
    const { GET } = await import('@/app/auth/callback/route')
    const url = new URL('http://localhost:3000/auth/callback')
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
    return GET(new Request(url.toString()))
  }

  function redirectLocation(response: Response): string {
    return new URL(response.headers.get('location')!).pathname +
      new URL(response.headers.get('location')!).search
  }

  it('redirects to login error when token_hash is missing', async () => {
    const res = await callGET({ type: 'magiclink' })
    expect(res.status).toBe(307)
    expect(redirectLocation(res)).toContain('/admin/login?error=')
  })

  it('redirects to login error when type is missing', async () => {
    const res = await callGET({ token_hash: 'abc123' })
    expect(res.status).toBe(307)
    expect(redirectLocation(res)).toContain('/admin/login?error=')
  })

  it('redirects to login error when type is invalid', async () => {
    const res = await callGET({ token_hash: 'abc123', type: 'phishing' })
    expect(res.status).toBe(307)
    expect(redirectLocation(res)).toContain('/admin/login?error=')
  })

  it('redirects to login error when verifyOtp returns error', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: {},
      error: { message: 'Invalid token' },
    })

    const res = await callGET({ token_hash: 'abc123', type: 'magiclink' })
    expect(res.status).toBe(307)
    expect(redirectLocation(res)).toContain('/admin/login?error=')
    expect(redirectLocation(res)).toContain('verification+failed')
  })

  it('sets admin session cookie and redirects to /admin on success', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { session: { access_token: 'tok_123' } },
      error: null,
    })

    const res = await callGET({ token_hash: 'abc123', type: 'magiclink' })
    expect(mockSetAdminSessionCookie).toHaveBeenCalledWith('tok_123')
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/admin')
  })

  it('redirects to custom next path when valid', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { session: { access_token: 'tok_123' } },
      error: null,
    })

    const res = await callGET({
      token_hash: 'abc123',
      type: 'magiclink',
      next: '/admin/sites',
    })
    expect(new URL(res.headers.get('location')!).pathname).toBe('/admin/sites')
  })

  it('blocks open redirect with //evil.com', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { session: { access_token: 'tok_123' } },
      error: null,
    })

    const res = await callGET({
      token_hash: 'abc123',
      type: 'magiclink',
      next: '//evil.com',
    })
    expect(new URL(res.headers.get('location')!).pathname).toBe('/admin')
  })

  it('blocks open redirect when next has no leading slash', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { session: { access_token: 'tok_123' } },
      error: null,
    })

    const res = await callGET({
      token_hash: 'abc123',
      type: 'magiclink',
      next: 'evil.com',
    })
    expect(new URL(res.headers.get('location')!).pathname).toBe('/admin')
  })
})
