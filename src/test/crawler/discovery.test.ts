import { describe, expect, it, vi } from 'vitest'
import { discoverPages, STOOGLE_USER_AGENT } from '@/lib/crawler/discovery'

function response(body: string, options: { status?: number; contentType?: string } = {}) {
  return new Response(body, {
    status: options.status ?? 200,
    headers: {
      'content-type': options.contentType ?? 'text/html; charset=utf-8',
    },
  })
}

describe('discoverPages', () => {
  it('discovers sitemap entries first and applies normalization + filtering', async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input)

      if (url === 'https://example.com/robots.txt') {
        return response('User-agent: *\nDisallow: /private')
      }

      if (url === 'https://example.com/sitemap.xml') {
        return response(`
          <urlset>
            <url><loc>https://example.com/Page/?utm_source=x</loc></url>
            <url><loc>https://example.com/private/secret</loc></url>
            <url><loc>https://example.com/file.pdf</loc></url>
            <url><loc>https://other.com/page</loc></url>
          </urlset>
        `, { contentType: 'application/xml' })
      }

      if (url === 'https://example.com/') {
        return response('<html><body>No links</body></html>')
      }

      return response('', { status: 404 })
    })

    const result = await discoverPages({
      siteUrl: 'https://example.com',
      allowedDomains: ['example.com'],
      fetchImpl,
      sleepFn: async () => {},
      nowFn: () => 0,
    })

    expect(result.usedSitemap).toBe(true)
    expect(result.urls).toContain('https://example.com/page')
    expect(result.urls).not.toContain('https://example.com/private/secret')
    expect(result.urls.some((url) => url.endsWith('.pdf'))).toBe(false)
    expect(result.urls.some((url) => new URL(url).hostname === 'other.com')).toBe(false)
  })

  it('falls back to BFS when sitemap is unavailable', async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input)

      if (url === 'https://example.com/robots.txt') {
        return response('User-agent: *\nDisallow: /blocked')
      }

      if (url === 'https://example.com/sitemap.xml') {
        return response('', { status: 404 })
      }

      if (url === 'https://example.com/') {
        return response(`
          <html><body>
            <a href="/a">A</a>
            <a href="/blocked/page">Blocked</a>
            <a href="/doc.pdf">PDF</a>
          </body></html>
        `)
      }

      if (url === 'https://example.com/a') {
        return response('<html><body><a href="/b">B</a></body></html>')
      }

      if (url === 'https://example.com/b') {
        return response('<html><body>Done</body></html>')
      }

      return response('', { status: 404 })
    })

    const result = await discoverPages({
      siteUrl: 'https://example.com',
      allowedDomains: ['example.com'],
      fetchImpl,
      sleepFn: async () => {},
      nowFn: () => 0,
      pageCap: 10,
    })

    expect(result.usedSitemap).toBe(false)
    expect(result.usedBfs).toBe(true)
    expect(result.urls).toEqual(['https://example.com/', 'https://example.com/a', 'https://example.com/b'])
  })

  it('enforces per-domain rate limit and sends stoogle user-agent', async () => {
    const sleepFn = vi.fn(async () => {})
    const nowFn = vi.fn(() => 0)

    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input)
      const userAgent = (init?.headers as Record<string, string> | undefined)?.['User-Agent']
      expect(userAgent).toBe(STOOGLE_USER_AGENT)

      if (url === 'https://example.com/robots.txt') {
        return response('User-agent: *')
      }

      if (url === 'https://example.com/sitemap.xml') {
        return response('', { status: 404 })
      }

      return response('<html><body>No links</body></html>')
    })

    await discoverPages({
      siteUrl: 'https://example.com',
      allowedDomains: ['example.com'],
      fetchImpl,
      sleepFn,
      nowFn,
    })

    expect(sleepFn).toHaveBeenCalled()
    expect(sleepFn).toHaveBeenCalledWith(2000)
  })

  it('applies page cap and keeps sitemap-before-bfs order', async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input)

      if (url === 'https://example.com/robots.txt') {
        return response('User-agent: *')
      }

      if (url === 'https://example.com/sitemap.xml') {
        return response(
          '<urlset><url><loc>https://example.com/one</loc></url><url><loc>https://example.com/two</loc></url></urlset>',
          { contentType: 'application/xml' }
        )
      }

      if (url === 'https://example.com/') {
        return response('<html><body><a href="/three">3</a></body></html>')
      }

      if (url === 'https://example.com/three') {
        return response('<html><body><a href="/four">4</a></body></html>')
      }

      return response('<html><body>ok</body></html>')
    })

    const result = await discoverPages({
      siteUrl: 'https://example.com',
      allowedDomains: ['example.com'],
      fetchImpl,
      sleepFn: async () => {},
      nowFn: () => 0,
      pageCap: 3,
    })

    expect(result.urls).toEqual([
      'https://example.com/one',
      'https://example.com/two',
      'https://example.com/',
    ])
  })

  it('rejects crawl targets not in allowed domains', async () => {
    await expect(
      discoverPages({
        siteUrl: 'https://example.com',
        allowedDomains: ['another.com'],
      })
    ).rejects.toThrow("is not in allowedDomains")
  })
})
