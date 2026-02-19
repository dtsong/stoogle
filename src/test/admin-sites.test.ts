import { describe, expect, it } from 'vitest'
import { normalizeSiteUrl } from '@/lib/admin/sites'

describe('normalizeSiteUrl', () => {
  it('normalizes bare domains to https URLs', () => {
    expect(normalizeSiteUrl('carm.org')).toBe('https://carm.org')
  })

  it('removes trailing slash and query/hash fragments', () => {
    expect(normalizeSiteUrl('https://example.com/path/?q=1#section')).toBe('https://example.com/path')
  })

  it('throws for invalid domains', () => {
    expect(() => normalizeSiteUrl('not-a-domain')).toThrow(/valid domain/i)
  })
})
