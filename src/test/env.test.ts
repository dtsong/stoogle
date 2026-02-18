import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('env: supabase.url', () => {
  it('returns value when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    const { env } = await import('@/lib/env')
    expect(env.supabase.url).toBe('https://test.supabase.co')
  })

  it('throws when missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const { env } = await import('@/lib/env')
    expect(() => env.supabase.url).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })
})

describe('env: supabase.anonKey', () => {
  it('returns value when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-123')
    const { env } = await import('@/lib/env')
    expect(env.supabase.anonKey).toBe('anon-key-123')
  })

  it('throws when missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    const { env } = await import('@/lib/env')
    expect(() => env.supabase.anonKey).toThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })
})

describe('env: supabase.serviceRoleKey', () => {
  it('returns value when set', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-secret')
    const { env } = await import('@/lib/env')
    expect(env.supabase.serviceRoleKey).toBe('service-role-secret')
  })

  it('throws when missing', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { env } = await import('@/lib/env')
    expect(() => env.supabase.serviceRoleKey).toThrow('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('key name is not prefixed NEXT_PUBLIC_ (never exposed to browser)', () => {
    expect('SUPABASE_SERVICE_ROLE_KEY').not.toMatch(/^NEXT_PUBLIC_/)
  })
})
