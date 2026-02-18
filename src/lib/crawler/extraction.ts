import * as cheerio from 'cheerio'
import { STOOGLE_USER_AGENT } from '@/lib/crawler/discovery'

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

export async function fetchAndExtractPage(
  pageUrl: string,
  fetchImpl: FetchLike = fetch
): Promise<ExtractedPage | null> {
  try {
    const response = await fetchImpl(pageUrl, {
      headers: {
        'User-Agent': STOOGLE_USER_AGENT,
      },
    })

    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/html')) {
      return null
    }

    const html = await response.text()
    return extractFromHtml(html)
  } catch {
    return null
  }
}
