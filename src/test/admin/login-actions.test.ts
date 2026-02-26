import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedirect = vi.fn()
const mockHeaders = vi.fn()
const mockSetAdminSessionCookie = vi.fn()
const mockClearAdminSessionCookie = vi.fn()
const mockSignInAdminWithPassword = vi.fn()
const mockSendAdminMagicLink = vi.fn()

vi.mock('next/headers', () => ({
  headers: (...args: unknown[]) => mockHeaders(...args),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

vi.mock('@/lib/admin/auth', () => ({
  setAdminSessionCookie: (...args: unknown[]) => mockSetAdminSessionCookie(...args),
  clearAdminSessionCookie: (...args: unknown[]) => mockClearAdminSessionCookie(...args),
  signInAdminWithPassword: (...args: unknown[]) => mockSignInAdminWithPassword(...args),
  sendAdminMagicLink: (...args: unknown[]) => mockSendAdminMagicLink(...args),
}))

describe('admin login actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeaders.mockResolvedValue(
      new Headers({ host: 'localhost:3000' })
    )
  })

  describe('passwordLoginAction', () => {
    async function callPasswordLogin(email: string, password: string) {
      const { passwordLoginAction } = await import('@/app/admin/login/actions')
      const form = new FormData()
      form.set('email', email)
      form.set('password', password)
      return passwordLoginAction(form)
    }

    it('redirects with error when email or password is empty', async () => {
      await expect(callPasswordLogin('', '')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('/admin/login?error=')
      )
      expect(mockSignInAdminWithPassword).not.toHaveBeenCalled()
    })

    it('redirects with error on login failure', async () => {
      mockSignInAdminWithPassword.mockResolvedValue({
        ok: false,
        message: 'Invalid credentials',
      })

      await expect(callPasswordLogin('admin@test.com', 'wrong')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('Invalid%20credentials')
      )
    })

    it('sets cookie and redirects to /admin on success', async () => {
      mockSignInAdminWithPassword.mockResolvedValue({
        ok: true,
        accessToken: 'tok_abc',
      })

      await expect(callPasswordLogin('admin@test.com', 'correct')).rejects.toThrow(
        'NEXT_REDIRECT:/admin'
      )
      expect(mockSetAdminSessionCookie).toHaveBeenCalledWith('tok_abc')
    })
  })

  describe('magicLinkLoginAction', () => {
    async function callMagicLink(email: string) {
      const { magicLinkLoginAction } = await import('@/app/admin/login/actions')
      const form = new FormData()
      form.set('email', email)
      return magicLinkLoginAction(form)
    }

    it('redirects with error when email is empty', async () => {
      await expect(callMagicLink('')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('Email+is+required')
      )
    })

    it('sends magic link and redirects with notice on success', async () => {
      mockSendAdminMagicLink.mockResolvedValue({ ok: true, accessToken: '' })

      await expect(callMagicLink('admin@test.com')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockSendAdminMagicLink).toHaveBeenCalledWith(
        'admin@test.com',
        expect.stringContaining('localhost')
      )
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('notice=Magic+link+sent')
      )
    })

    it('redirects with error when magic link fails', async () => {
      mockSendAdminMagicLink.mockResolvedValue({
        ok: false,
        message: 'Send failed',
      })

      await expect(callMagicLink('admin@test.com')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('Send%20failed')
      )
    })
  })

  describe('adminLogoutAction', () => {
    it('clears cookie and redirects to login', async () => {
      const { adminLogoutAction } = await import('@/app/admin/login/actions')

      await expect(adminLogoutAction()).rejects.toThrow(
        'NEXT_REDIRECT:/admin/login?notice=Logged+out'
      )
      expect(mockClearAdminSessionCookie).toHaveBeenCalled()
    })
  })
})
