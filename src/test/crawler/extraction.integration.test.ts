import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { fetchAndExtractPage } from '@/lib/crawler/extraction'
import { STOOGLE_USER_AGENT } from '@/lib/crawler/discovery'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('fetchAndExtractPage', () => {
  it('fetches page HTML and extracts sanitized content', async () => {
    server.use(
      http.get('https://example.com/article', ({ request }) => {
        expect(request.headers.get('user-agent')).toBe(STOOGLE_USER_AGENT)

        return HttpResponse.text(
          '<html><head><title>Article</title></head><body><main><p>Faith &amp; works.</p></main></body></html>',
          {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          }
        )
      })
    )

    const extracted = await fetchAndExtractPage('https://example.com/article')

    expect(extracted).not.toBeNull()
    expect(extracted?.title).toBe('Article')
    expect(extracted?.content).toBe('Faith & works.')
  })

  it('returns null for non-html response', async () => {
    server.use(
      http.get('https://example.com/file.pdf', () =>
        HttpResponse.text('%PDF-1.7', {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        })
      )
    )

    const extracted = await fetchAndExtractPage('https://example.com/file.pdf')
    expect(extracted).toBeNull()
  })

  it('returns null for 404 responses', async () => {
    server.use(http.get('https://example.com/missing', () => new HttpResponse(null, { status: 404 })))

    const extracted = await fetchAndExtractPage('https://example.com/missing')
    expect(extracted).toBeNull()
  })
})
