import { normalizeUrl } from '@/lib/crawler/url-normalization'

export const STOOGLE_USER_AGENT = 'Stoogle/1.0 (curated scripture search)'
const REQUEST_INTERVAL_MS = 2000
const DEFAULT_PAGE_CAP = 500
const NON_HTML_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.zip',
]

type FetchLike = typeof fetch
type SleepFn = (ms: number) => Promise<void>
type NowFn = () => number

type RobotsPolicy = {
  disallow: string[]
}

export type DiscoverPagesOptions = {
  siteUrl: string
  allowedDomains: string[]
  pageCap?: number
  fetchImpl?: FetchLike
  sleepFn?: SleepFn
  nowFn?: NowFn
}

export type DiscoverPagesResult = {
  urls: string[]
  usedSitemap: boolean
  usedBfs: boolean
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class DomainRateLimiter {
  private readonly nextAllowedByDomain = new Map<string, number>()

  constructor(
    private readonly sleepFn: SleepFn,
    private readonly nowFn: NowFn
  ) {}

  async wait(domain: string): Promise<void> {
    const now = this.nowFn()
    const nextAllowed = this.nextAllowedByDomain.get(domain) ?? now

    if (nextAllowed > now) {
      await this.sleepFn(nextAllowed - now)
    }

    this.nextAllowedByDomain.set(domain, this.nowFn() + REQUEST_INTERVAL_MS)
  }
}

function toAllowedDomainSet(domains: string[]): Set<string> {
  return new Set(domains.map((domain) => domain.trim().toLowerCase()).filter(Boolean))
}

function urlPath(url: string): string {
  return new URL(url).pathname.toLowerCase()
}

function isNonHtmlResource(url: string): boolean {
  const path = urlPath(url)
  return NON_HTML_EXTENSIONS.some((extension) => path.endsWith(extension))
}

function withinAllowedDomain(url: string, allowedDomains: Set<string>): boolean {
  const hostname = new URL(url).hostname.toLowerCase()
  return allowedDomains.has(hostname)
}

function parseLocTags(xml: string): string[] {
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
  return matches.map((match) => match[1].trim()).filter(Boolean)
}

function parseRobots(content: string): RobotsPolicy {
  const disallow: string[] = []
  let inApplicableAgent = false

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const [directiveRaw, valueRaw = ''] = line.split(':', 2)
    const directive = directiveRaw.trim().toLowerCase()
    const value = valueRaw.trim()

    if (directive === 'user-agent') {
      const normalized = value.toLowerCase()
      inApplicableAgent =
        normalized === '*' ||
        normalized === STOOGLE_USER_AGENT.toLowerCase() ||
        normalized === 'stoogle'
      continue
    }

    if (directive === 'disallow' && inApplicableAgent && value) {
      disallow.push(value)
    }
  }

  return { disallow }
}

function isBlockedByRobots(url: string, robots: RobotsPolicy): boolean {
  const path = urlPath(url)
  return robots.disallow.some((rule) => path.startsWith(rule.toLowerCase()))
}

function extractHrefLinks(html: string): string[] {
  const hrefMatches = [...html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi)]
  return hrefMatches.map((match) => match[1]).filter(Boolean)
}

async function requestText(
  url: string,
  fetchImpl: FetchLike,
  rateLimiter: DomainRateLimiter
): Promise<{ ok: boolean; status: number; text: string; contentType: string }> {
  const domain = new URL(url).hostname.toLowerCase()
  await rateLimiter.wait(domain)

  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': STOOGLE_USER_AGENT,
    },
  })

  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
    contentType: response.headers.get('content-type')?.toLowerCase() ?? '',
  }
}

async function loadRobotsPolicy(
  origin: string,
  fetchImpl: FetchLike,
  rateLimiter: DomainRateLimiter
): Promise<RobotsPolicy> {
  try {
    const robotsUrl = `${origin}/robots.txt`
    const response = await requestText(robotsUrl, fetchImpl, rateLimiter)
    if (!response.ok) return { disallow: [] }
    return parseRobots(response.text)
  } catch {
    return { disallow: [] }
  }
}

async function discoverFromSitemaps(
  sitemapUrl: string,
  allowedDomains: Set<string>,
  robots: RobotsPolicy,
  fetchImpl: FetchLike,
  rateLimiter: DomainRateLimiter,
  pageCap: number
): Promise<string[]> {
  const queue = [sitemapUrl]
  const seenSitemaps = new Set<string>()
  const discovered: string[] = []
  const seenPages = new Set<string>()

  while (queue.length > 0 && discovered.length < pageCap) {
    const currentSitemap = queue.shift()
    if (!currentSitemap || seenSitemaps.has(currentSitemap)) continue
    seenSitemaps.add(currentSitemap)

    const response = await requestText(currentSitemap, fetchImpl, rateLimiter)
    if (!response.ok) continue

    const locs = parseLocTags(response.text)
    const isSitemapIndex = /<sitemapindex/i.test(response.text)

    if (isSitemapIndex) {
      for (const loc of locs) {
        const normalized = normalizeUrl(loc, currentSitemap)
        if (!normalized) continue
        queue.push(normalized)
      }
      continue
    }

    for (const loc of locs) {
      if (discovered.length >= pageCap) break

      const normalized = normalizeUrl(loc, currentSitemap)
      if (!normalized || seenPages.has(normalized)) continue
      if (!withinAllowedDomain(normalized, allowedDomains)) continue
      if (isNonHtmlResource(normalized)) continue
      if (isBlockedByRobots(normalized, robots)) continue

      seenPages.add(normalized)
      discovered.push(normalized)
    }
  }

  return discovered
}

async function discoverViaBfs(
  startUrl: string,
  allowedDomains: Set<string>,
  robots: RobotsPolicy,
  seedUrls: string[],
  fetchImpl: FetchLike,
  rateLimiter: DomainRateLimiter,
  pageCap: number
): Promise<string[]> {
  const queue = [startUrl]
  const queued = new Set(queue)
  const visited = new Set<string>()
  const discovered = [...seedUrls]
  const discoveredSet = new Set(seedUrls)

  while (queue.length > 0 && discovered.length < pageCap) {
    const current = queue.shift()
    if (!current || visited.has(current)) continue
    visited.add(current)

    if (!withinAllowedDomain(current, allowedDomains)) continue
    if (isNonHtmlResource(current)) continue
    if (isBlockedByRobots(current, robots)) continue

    const response = await requestText(current, fetchImpl, rateLimiter)
    if (!response.ok || !response.contentType.includes('text/html')) continue

    if (!discoveredSet.has(current)) {
      discovered.push(current)
      discoveredSet.add(current)
    }

    if (discovered.length >= pageCap) break

    const hrefs = extractHrefLinks(response.text)
    for (const href of hrefs) {
      if (discovered.length >= pageCap) break
      const normalized = normalizeUrl(href, current)
      if (!normalized) continue
      if (queued.has(normalized) || visited.has(normalized)) continue
      if (!withinAllowedDomain(normalized, allowedDomains)) continue
      if (isNonHtmlResource(normalized)) continue

      queue.push(normalized)
      queued.add(normalized)
    }
  }

  return discovered.slice(0, pageCap)
}

export async function discoverPages(options: DiscoverPagesOptions): Promise<DiscoverPagesResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const sleepFn = options.sleepFn ?? defaultSleep
  const nowFn = options.nowFn ?? Date.now
  const pageCap = options.pageCap ?? DEFAULT_PAGE_CAP
  const allowedDomains = toAllowedDomainSet(options.allowedDomains)
  const normalizedSiteUrl = normalizeUrl(options.siteUrl)

  if (!normalizedSiteUrl) {
    throw new Error(`Invalid siteUrl: ${options.siteUrl}`)
  }

  const siteDomain = new URL(normalizedSiteUrl).hostname.toLowerCase()
  if (!allowedDomains.has(siteDomain)) {
    throw new Error(`Site domain '${siteDomain}' is not in allowedDomains`)
  }

  const rateLimiter = new DomainRateLimiter(sleepFn, nowFn)
  const origin = new URL(normalizedSiteUrl).origin
  const robots = await loadRobotsPolicy(origin, fetchImpl, rateLimiter)

  const sitemapUrls = await discoverFromSitemaps(
    `${origin}/sitemap.xml`,
    allowedDomains,
    robots,
    fetchImpl,
    rateLimiter,
    pageCap
  )

  const bfsUrls =
    sitemapUrls.length < pageCap
      ? await discoverViaBfs(
          normalizedSiteUrl,
          allowedDomains,
          robots,
          sitemapUrls,
          fetchImpl,
          rateLimiter,
          pageCap
        )
      : sitemapUrls

  return {
    urls: bfsUrls,
    usedSitemap: sitemapUrls.length > 0,
    usedBfs: bfsUrls.length > sitemapUrls.length,
  }
}
