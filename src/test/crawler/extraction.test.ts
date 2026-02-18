import { describe, expect, it } from 'vitest'
import { extractFromHtml } from '@/lib/crawler/extraction'

describe('extractFromHtml', () => {
  it('extracts title and plain text content', () => {
    const html = `
      <html>
        <head><title>Sample Page</title></head>
        <body>
          <main>
            <h1>Welcome</h1>
            <p>Christian apologetics is useful.</p>
          </main>
        </body>
      </html>
    `

    const result = extractFromHtml(html)

    expect(result.title).toBe('Sample Page')
    expect(result.content).toContain('Welcome Christian apologetics is useful.')
    expect(result.noindex).toBe(false)
    expect(result.nosnippet).toBe(false)
  })

  it('detects noindex pages', () => {
    const html = `
      <html>
        <head>
          <meta name="robots" content="index, noindex" />
          <title>Noindex</title>
        </head>
        <body><main>Hidden</main></body>
      </html>
    `

    const result = extractFromHtml(html)
    expect(result.noindex).toBe(true)
  })

  it('detects nosnippet pages', () => {
    const html = `
      <html>
        <head>
          <meta name="robots" content="nosnippet" />
        </head>
        <body><main>Visible text</main></body>
      </html>
    `

    const result = extractFromHtml(html)
    expect(result.nosnippet).toBe(true)
  })

  it('strips script, style, nav, footer, and header content', () => {
    const html = `
      <html>
        <head>
          <style>.x { color: red; }</style>
          <script>alert('xss')</script>
          <title>Test</title>
        </head>
        <body>
          <header>Site header</header>
          <nav>Main nav</nav>
          <main><p>Safe body text</p></main>
          <footer>Site footer</footer>
        </body>
      </html>
    `

    const result = extractFromHtml(html)
    expect(result.content).toBe('Safe body text')
    expect(result.content).not.toContain('alert')
    expect(result.content).not.toContain('Site header')
    expect(result.content).not.toContain('Main nav')
    expect(result.content).not.toContain('Site footer')
  })

  it('decodes html entities and normalizes whitespace', () => {
    const html = '<html><body><main>Grace &amp; truth\n\nfor all</main></body></html>'
    const result = extractFromHtml(html)

    expect(result.content).toBe('Grace & truth for all')
  })

  it('handles malformed html gracefully', () => {
    const html = '<html><head><title>Broken</title></head><body><main><p>Still readable'
    const result = extractFromHtml(html)

    expect(result.title).toContain('Broken')
    expect(result.content).toContain('Still readable')
  })
})
