import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('beta gate middleware', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  async function importMiddleware() {
    const mod = await import('@/middleware')
    return mod.middleware
  }

  function makeRequest(path: string, cookie?: { name: string; value: string }) {
    const url = `http://localhost:3000${path}`
    const req = new NextRequest(url)
    if (cookie) {
      req.cookies.set(cookie.name, cookie.value)
    }
    return req
  }

  it('passes through when BETA_ACCESS_CODE is not set', async () => {
    vi.stubEnv('BETA_ACCESS_CODE', '')
    const middleware = await importMiddleware()
    const res = middleware(makeRequest('/'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('redirects to /beta when code is set and no cookie present', async () => {
    vi.stubEnv('BETA_ACCESS_CODE', 'secret123')
    const middleware = await importMiddleware()
    const res = middleware(makeRequest('/'))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/beta')
  })

  it('passes through when valid cookie is present', async () => {
    vi.stubEnv('BETA_ACCESS_CODE', 'secret123')
    const middleware = await importMiddleware()
    const res = middleware(makeRequest('/', { name: 'stoogle_beta_access', value: 'secret123' }))
    expect(res.headers.get('location')).toBeNull()
  })

  it('redirects when cookie value does not match code', async () => {
    vi.stubEnv('BETA_ACCESS_CODE', 'secret123')
    const middleware = await importMiddleware()
    const res = middleware(makeRequest('/', { name: 'stoogle_beta_access', value: 'wrong' }))
    expect(res.status).toBe(307)
  })

  it.each(['/beta', '/api/health', '/admin', '/auth/callback', '/_next/data', '/favicon.ico'])(
    'bypasses %s even when beta is enabled',
    async (path) => {
      vi.stubEnv('BETA_ACCESS_CODE', 'secret123')
      const middleware = await importMiddleware()
      const res = middleware(makeRequest(path))
      expect(res.headers.get('location')).toBeNull()
    }
  )
})

describe('beta access action', () => {
  const mockSet = vi.fn()
  const mockRedirect = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    vi.doMock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue({ set: mockSet }),
    }))

    vi.doMock('next/navigation', () => ({
      redirect: mockRedirect.mockImplementation((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`)
      }),
    }))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sets cookie and redirects to / on valid code', async () => {
    vi.stubEnv('BETA_ACCESS_CODE', 'secret123')
    const { betaAccessAction } = await import('@/app/beta/actions')

    const form = new FormData()
    form.set('code', 'secret123')

    await expect(betaAccessAction(form)).rejects.toThrow('NEXT_REDIRECT:/')
    expect(mockSet).toHaveBeenCalledWith(
      'stoogle_beta_access',
      'secret123',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
    )
  })

  it('redirects with error on invalid code', async () => {
    vi.stubEnv('BETA_ACCESS_CODE', 'secret123')
    const { betaAccessAction } = await import('@/app/beta/actions')

    const form = new FormData()
    form.set('code', 'wrong')

    await expect(betaAccessAction(form)).rejects.toThrow(
      'NEXT_REDIRECT:/beta?error=Invalid+access+code'
    )
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('redirects with error when code is empty', async () => {
    vi.stubEnv('BETA_ACCESS_CODE', 'secret123')
    const { betaAccessAction } = await import('@/app/beta/actions')

    const form = new FormData()
    form.set('code', '')

    await expect(betaAccessAction(form)).rejects.toThrow(
      'NEXT_REDIRECT:/beta?error=Invalid+access+code'
    )
  })
})
