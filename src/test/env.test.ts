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

describe('env: typesense.host', () => {
  it('returns value when set', async () => {
    vi.stubEnv('TYPESENSE_HOST', 'https://example.typesense.net')
    const { env } = await import('@/lib/env')
    expect(env.typesense.host).toBe('https://example.typesense.net')
  })

  it('throws when missing', async () => {
    vi.stubEnv('TYPESENSE_HOST', '')
    vi.stubEnv('NEXT_PUBLIC_TYPESENSE_HOST', '')
    const { env } = await import('@/lib/env')
    expect(() => env.typesense.host).toThrow('TYPESENSE_HOST or NEXT_PUBLIC_TYPESENSE_HOST')
  })

  it('falls back to NEXT_PUBLIC_TYPESENSE_HOST for backward compatibility', async () => {
    vi.stubEnv('TYPESENSE_HOST', '')
    vi.stubEnv('NEXT_PUBLIC_TYPESENSE_HOST', 'https://legacy.typesense.net')
    const { env } = await import('@/lib/env')
    expect(env.typesense.host).toBe('https://legacy.typesense.net')
  })
})

describe('env: typesense keys', () => {
  it('returns admin and search key values when set', async () => {
    vi.stubEnv('TYPESENSE_ADMIN_API_KEY', 'admin-key')
    vi.stubEnv('TYPESENSE_SEARCH_API_KEY', 'search-key')
    const { env } = await import('@/lib/env')
    expect(env.typesense.adminApiKey).toBe('admin-key')
    expect(env.typesense.searchApiKey).toBe('search-key')
  })

  it('throws when missing', async () => {
    vi.stubEnv('TYPESENSE_ADMIN_API_KEY', '')
    vi.stubEnv('TYPESENSE_SEARCH_API_KEY', '')
    vi.stubEnv('TYPESENSE_API_KEY', '')
    const { env } = await import('@/lib/env')
    expect(() => env.typesense.adminApiKey).toThrow('TYPESENSE_ADMIN_API_KEY or TYPESENSE_API_KEY')
    expect(() => env.typesense.searchApiKey).toThrow('TYPESENSE_SEARCH_API_KEY or TYPESENSE_API_KEY')
  })

  it('falls back to TYPESENSE_API_KEY for backward compatibility', async () => {
    vi.stubEnv('TYPESENSE_ADMIN_API_KEY', '')
    vi.stubEnv('TYPESENSE_SEARCH_API_KEY', '')
    vi.stubEnv('TYPESENSE_API_KEY', 'legacy-key')
    const { env } = await import('@/lib/env')
    expect(env.typesense.adminApiKey).toBe('legacy-key')
    expect(env.typesense.searchApiKey).toBe('legacy-key')
  })

  it('keys are server-only env vars', () => {
    expect('TYPESENSE_ADMIN_API_KEY').not.toMatch(/^NEXT_PUBLIC_/)
    expect('TYPESENSE_SEARCH_API_KEY').not.toMatch(/^NEXT_PUBLIC_/)
  })
})
