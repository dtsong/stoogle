import * as cheerio from 'cheerio'
import { STOOGLE_USER_AGENT, REQUEST_TIMEOUT_MS } from '@/lib/crawler/discovery'
import { composeSignals } from '@/lib/crawler/abort-utils'

type FetchLike = typeof fetch

export type ExtractedPage = {
  title: string | null
  content: string
  noindex: boolean
  nosnippet: boolean
}

function sanitizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

function hasMetaDirective($: cheerio.CheerioAPI, directive: string): boolean {
  const robotsMeta = $('meta[name="robots" i], meta[name="googlebot" i]')
  for (const el of robotsMeta.toArray()) {
    const content = ($(el).attr('content') ?? '').toLowerCase()
    if (content.split(',').map((token) => token.trim()).includes(directive)) {
      return true
    }
  }
  return false
}

function pickContentRoot($: cheerio.CheerioAPI) {
  const candidates = ['main', 'article', '[role="main"]', 'body']
  for (const selector of candidates) {
    const node = $(selector).first()
    if (node.length > 0) {
      return node
    }
  }
  return $.root()
}

export function extractFromHtml(html: string): ExtractedPage {
  const $ = cheerio.load(html)

  const noindex = hasMetaDirective($, 'noindex')
  const nosnippet = hasMetaDirective($, 'nosnippet')

  $('script, style, nav, footer, header, noscript').remove()

  const root = pickContentRoot($)
  const title = sanitizeText($('title').first().text()) || null
  const content = sanitizeText(root.text()) || sanitizeText($.root().text())

  return {
    title,
    content,
    noindex,
    nosnippet,
  }
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429
}

export async function fetchAndExtractPage(
  pageUrl: string,
  fetchImpl: FetchLike = fetch,
  signal?: AbortSignal
): Promise<ExtractedPage | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const composedSignal = composeSignals(signal, REQUEST_TIMEOUT_MS)
    try {
      const response = await fetchImpl(pageUrl, {
        headers: { 'User-Agent': STOOGLE_USER_AGENT },
        signal: composedSignal,
      })

      if (attempt === 0 && isRetryableStatus(response.status) && !signal?.aborted) {
        const retryAfter = response.headers.get('retry-after')
        const delayMs =
          response.status === 429
            ? (Number.isFinite(Number(retryAfter)) && Number(retryAfter) > 0
                ? Number(retryAfter) * 1000
                : 4000)
            : 1000
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      if (!response.ok) return null

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      if (!contentType.includes('text/html')) return null

      const html = await response.text()
      return extractFromHtml(html)
    } catch (error) {
      if (attempt === 0 && !signal?.aborted) {
        const isTimeout = error instanceof DOMException && error.name === 'TimeoutError'
        if (isTimeout) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          continue
        }
      }

      if (error instanceof DOMException && error.name === 'TimeoutError') {
        console.warn(`[extraction] Fetch timed out after ${REQUEST_TIMEOUT_MS}ms: ${pageUrl}`)
      } else {
        console.warn(`[extraction] Fetch failed for ${pageUrl}:`, error)
      }
      return null
    }
  }

  return null
}
