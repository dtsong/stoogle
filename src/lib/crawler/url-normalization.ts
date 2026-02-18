const UTM_PARAM_PREFIX = 'utm_'

function normalizePathname(pathname: string): string {
  if (!pathname) return '/'

  let normalized = pathname.toLowerCase()
  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }

  return normalized || '/'
}

function stripTrackingParams(url: URL): void {
  const keys = [...url.searchParams.keys()]
  for (const key of keys) {
    if (key.toLowerCase().startsWith(UTM_PARAM_PREFIX)) {
      url.searchParams.delete(key)
    }
  }
}

export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    const parsed = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }

    parsed.protocol = 'https:'
    parsed.hostname = parsed.hostname.toLowerCase()
    parsed.hash = ''
    parsed.pathname = normalizePathname(parsed.pathname)

    stripTrackingParams(parsed)

    return parsed.toString()
  } catch {
    return null
  }
}

export function extractCanonicalUrl(html: string, pageUrl: string): string | null {
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i)
  if (!canonicalMatch) {
    return null
  }

  const hrefMatch = canonicalMatch[0].match(/href=["']([^"']+)["']/i)
  if (!hrefMatch?.[1]) {
    return null
  }

  return normalizeUrl(hrefMatch[1], pageUrl)
}

export function normalizePageUrl(rawUrl: string, html?: string): string | null {
  const normalized = normalizeUrl(rawUrl)
  if (!normalized) {
    return null
  }

  if (!html) {
    return normalized
  }

  return extractCanonicalUrl(html, normalized) ?? normalized
}
