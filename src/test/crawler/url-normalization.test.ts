import { describe, expect, it } from 'vitest'
import {
  extractCanonicalUrl,
  normalizePageUrl,
  normalizeUrl,
} from '@/lib/crawler/url-normalization'

describe('normalizeUrl', () => {
  it('normalizes hostname, scheme, path case, and trailing slash', () => {
    const normalized = normalizeUrl('HTTP://Example.COM/Page/')
    expect(normalized).toBe('https://example.com/page')
  })

  it('removes fragments', () => {
    const normalized = normalizeUrl('https://site.com/page#section')
    expect(normalized).toBe('https://site.com/page')
  })

  it('removes utm parameters and preserves real params', () => {
    const normalized = normalizeUrl('https://site.com/page?utm_source=x&utm_medium=y&real=z')
    expect(normalized).toBe('https://site.com/page?real=z')
  })

  it('returns null for non-http(s) URLs', () => {
    expect(normalizeUrl('mailto:someone@example.com')).toBeNull()
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
  })

  it('returns null for malformed URLs', () => {
    expect(normalizeUrl('not-a-valid-url')).toBeNull()
  })
})

describe('extractCanonicalUrl', () => {
  it('extracts and normalizes absolute canonical URL', () => {
    const html =
      '<html><head><link rel="canonical" href="HTTP://Example.COM/Article/?utm_campaign=abc" /></head></html>'

    const canonical = extractCanonicalUrl(html, 'https://example.com/current')
    expect(canonical).toBe('https://example.com/article')
  })

  it('extracts and resolves relative canonical URL', () => {
    const html = '<link rel="canonical" href="/Posts/Hello-World/" />'
    const canonical = extractCanonicalUrl(html, 'https://example.com/blog/current')

    expect(canonical).toBe('https://example.com/posts/hello-world')
  })

  it('returns null when no canonical link exists', () => {
    const canonical = extractCanonicalUrl('<html><head></head></html>', 'https://example.com/page')
    expect(canonical).toBeNull()
  })
})

describe('normalizePageUrl', () => {
  it('prefers canonical URL when present', () => {
    const html = '<link rel="canonical" href="https://site.com/canonical/" />'
    const normalized = normalizePageUrl('https://site.com/current?utm_source=x', html)

    expect(normalized).toBe('https://site.com/canonical')
  })

  it('returns normalized original URL when canonical is absent', () => {
    const normalized = normalizePageUrl('http://site.com/Page/?utm_term=q')
    expect(normalized).toBe('https://site.com/page')
  })
})
